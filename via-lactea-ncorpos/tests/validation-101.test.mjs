import test from 'node:test';
import assert from 'node:assert/strict';
import { Leapfrog } from '../src/physics/integrator.js';
import { directAccelerations } from '../src/physics/forces.js';
import { externalGridAt } from '../src/physics/external-grid.js';
import {
  directPotentialEnergy64, validationSnapshot, conservationSample,
  summarizeConservationSeries, conservationConditions, compareGravityWithDirect,
} from '../src/physics/validation-101.js';

const close = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
function state(positions, velocities, masses, components = masses.map(() => 0)) {
  return { n: masses.length, positions: new Float64Array(positions), velocities: new Float64Array(velocities), masses: new Float64Array(masses), accelerations: new Float64Array(positions.length), components: new Uint8Array(components), time: 0 };
}

test('v1.0.1 direct Float64 oracle counts each Plummer pair once and its gradient equals the implemented force', () => {
  const s = state([0, 1, 2, 3, -2, 1, -1, 2, 0], Array(9).fill(0), [2, 3, 5]);
  const options = { G: 0.7, epsilon: 0.3 };
  const distances = [[0, 1], [0, 2], [1, 2]].map(([i, j]) => {
    const a = 3 * i, b = 3 * j;
    return -options.G * s.masses[i] * s.masses[j] / Math.hypot(s.positions[a] - s.positions[b], s.positions[a + 1] - s.positions[b + 1], s.positions[a + 2] - s.positions[b + 2], options.epsilon);
  });
  close(directPotentialEnergy64(s, options), distances.reduce((sum, value) => sum + value, 0));
  const acceleration = directAccelerations(s, options).slice(), h = 1e-5;
  for (let k = 0; k < 9; k++) {
    const x = s.positions[k];
    s.positions[k] = x + h; const plus = directPotentialEnergy64(s, options);
    s.positions[k] = x - h; const minus = directPotentialEnergy64(s, options); s.positions[k] = x;
    close(-(plus - minus) / (2 * h * s.masses[Math.floor(k / 3)]), acceleration[k], 2e-10);
  }
  const singleton = state([0, 0, 0], [0, 0, 0], [4]);
  assert.equal(directPotentialEnergy64(singleton, options), 0);
  const duplicate = state([0, 0, 0, 0, 0, 0], Array(6).fill(0), [2, 3]);
  close(directPotentialEnergy64(duplicate, options), -options.G * 6 / options.epsilon);
  assert.throws(() => directPotentialEnergy64(duplicate, { G: 1, epsilon: 0 }), /coincidentes/);
});

test('v1.0.1 external field energy has no half factor and frozen particles have no self energy', () => {
  const s = state([1, 0, 2, 0, 2, 1], [1, 2, 3, 4, 5, 6], [2, 3], [1, 1]);
  const externalPotential = (x, y, z) => 0.5 * (x * x + y * y + 4 * z * z);
  const frozen = validationSnapshot(s, { selfGravity: false, externalPotential });
  close(frozen.externalPotential, 2 * 8.5 + 3 * 4);
  assert.equal(frozen.selfPotential, 0);
  close(frozen.energy, frozen.kinetic + frozen.externalPotential);
  const baryons = validationSnapshot(s, { G: 1, epsilon: 0.1, externalPotential });
  close(baryons.selfPotential, directPotentialEnergy64(s, { G: 1, epsilon: 0.1 }));
  close(baryons.energy - frozen.energy, baryons.selfPotential);
  assert.equal(frozen.conditions.energy, true);
  assert.equal(frozen.conditions.angularZ, true);
  assert.equal(frozen.conditions.angularVector, false);
  assert.equal(frozen.conditions.linearMomentum, false);
  s.components[1] = 2;
  assert.throws(() => validationSnapshot(s, { externalPotential }), /Halo externo/);
  assert.throws(() => validationSnapshot(s, { externalPotential, haloTable: {} }), /único/);
});

test('v1.0.1 signed energy history preserves excursions hidden by a small final error', () => {
  const s = state([-1, 0, 0, 1, 0, 0], [0, -0.4, 0, 0, 0.4, 0], [1, 1]);
  const baseline = validationSnapshot(s, { G: 1, epsilon: 0.1 });
  const history = [baseline, { ...baseline, time: 1, energy: baseline.energy + 0.04 }, { ...baseline, time: 2, energy: baseline.energy - 0.07 }, { ...baseline, time: 3, energy: baseline.energy }];
  const summary = summarizeConservationSeries(history);
  assert.equal(summary.finalEnergyError, 0);
  close(summary.maxAbsEnergyError, 0.07 / Math.abs(baseline.energy));
  close(summary.energyErrorPeakToPeak, 0.11 / Math.abs(baseline.energy));
  assert.ok(summary.minEnergyError < 0 && summary.maxEnergyError > 0);
  assert.ok(conservationSample(history[1], baseline).deltaEnergy > 0);
  assert.ok(conservationSample(history[2], baseline).deltaEnergy < 0);
  const zeroEnergy = { ...baseline, energy: 0 };
  assert.equal(conservationSample({ ...zeroEnergy, energy: 0.02 }, zeroEnergy).deltaEnergy, null);
  close(conservationSample({ ...zeroEnergy, energy: 0.02 }, zeroEnergy).deltaEnergyScaled, 0.02 / baseline.energyScale);
  assert.throws(() => summarizeConservationSeries([baseline, baseline]), /crescentes/);
});

test('v1.0.1 COM ballistic prediction distinguishes bulk translation from conservation failure', () => {
  const s = state([-1, 0, 0, 1, 0, 0], [2, -1, 1, 2, 1, 1], [1, 1]);
  const before = validationSnapshot(s, { G: 1, epsilon: 0.1 });
  assert.deepEqual(before.momentum, [4, 0, 2]);
  assert.deepEqual(before.centerOfMassVelocity, [2, 0, 1]);
  assert.deepEqual(before.angularMomentum, [0, 0, 2]);
  close(before.Lnorm, 2);
  const integrator = new Leapfrog(s, { G: 1, epsilon: 0.1, dt: 0.01 }); integrator.step(100);
  const after = validationSnapshot(s, { G: 1, epsilon: 0.1 }), comparison = conservationSample(after, before);
  close(comparison.centerOfMassDisplacement, Math.sqrt(5), 2e-13);
  assert.ok(comparison.centerOfMassBallisticResidual < 2e-13);
  assert.ok(comparison.momentumScaledError < 2e-13);
  assert.ok(comparison.angularMomentumScaledError < 2e-13);
  const translated = validationSnapshot(s, { G: 1, epsilon: 0.1, origin: [2, 0, 1] });
  for (let k = 0; k < 3; k++) close(translated.intrinsicAngularMomentum[k], after.intrinsicAngularMomentum[k]);
  assert.throws(() => conservationSample(translated, before), /mesma origem/);
});

function eccentricBinary(dt) {
  const epsilon = 0.1, separation = 2, speed = 0.33;
  const s = state([-separation / 2, 0, 0, separation / 2, 0, 0], [0, -speed, 0, 0, speed, 0], [1, 1]);
  const options = { G: 1, epsilon, dt }, integrator = new Leapfrog(s, options), history = [validationSnapshot(s, options)];
  const steps = Math.round(24 / dt);
  for (let i = 0; i < steps; i++) { integrator.step(); history.push(validationSnapshot(s, options)); }
  return summarizeConservationSeries(history);
}

test('v1.0.1 sampled maximum eccentric-orbit energy error converges quadratically with fixed-step KDK', () => {
  // Eccentricity avoids the special near-circular cancellation which can make
  // the observed energy amplitude scale as dt^4 rather than the generic dt^2.
  const coarse = eccentricBinary(0.02), fine = eccentricBinary(0.01), finer = eccentricBinary(0.005);
  assert.ok(coarse.maxAbsEnergyError / fine.maxAbsEnergyError > 3.8 && coarse.maxAbsEnergyError / fine.maxAbsEnergyError < 4.2);
  assert.ok(fine.maxAbsEnergyError / finer.maxAbsEnergyError > 3.8 && fine.maxAbsEnergyError / finer.maxAbsEnergyError < 4.2);
  assert.ok(coarse.maxAngularMomentumScaledError < 1e-12);
  assert.ok(coarse.maxMomentumScaledError < 1e-12);
});

test('v1.0.1 stationary axisymmetric potential preserves Lz while the angular vector varies physically', () => {
  const s = state([1, 0, 0.5], [0, 0.8, 0.2], [1]);
  const options = { selfGravity: false, externalPotential: (x, y, z) => 0.5 * (x * x + y * y + 4 * z * z) };
  class HarmonicKDK extends Leapfrog {
    force() { for (let k = 0; k < 3; k++) s.accelerations[k] = -s.positions[k] * (k === 2 ? 4 : 1); return s.accelerations; }
  }
  const integrator = new HarmonicKDK(s, { dt: 0.002 }), before = validationSnapshot(s, options);
  integrator.step(1000);
  const after = validationSnapshot(s, options), difference = conservationSample(after, before);
  assert.ok(Math.abs(difference.deltaLzRelative) < 2e-14);
  assert.ok(difference.angularMomentumScaledError > 0.1);
  assert.equal(after.conditions.angularVector, false);
  assert.equal(conservationConditions({ external: true, externalSymmetry: 'spherical' }).angularVector, true);
  assert.equal(conservationConditions({ external: true, stationary: false }).energy, false);
});

function seeded(n) {
  let seed = 282013;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const p = [], v = [], m = [];
  for (let i = 0; i < n; i++) { p.push(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1); v.push(random() - 0.5, random() - 0.5, random() - 0.5); m.push((0.2 + random()) / n); }
  return state(p, v, m);
}

test('v1.0.1 direct oracle quantifies BH potential and force errors without mutating state', () => {
  const s = seeded(193), options = { G: 1, epsilon: 0.06 };
  s.accelerations.fill(123);
  const original = structuredClone(s);
  const exact = compareGravityWithDirect(s, { ...options, theta: 0 });
  assert.ok(Math.abs(exact.signedRelativePotentialError) < 1e-14);
  assert.ok(exact.relativeForceRms < 1e-14);
  const coarse = compareGravityWithDirect(s, { ...options, theta: 0.9 });
  const fine = compareGravityWithDirect(s, { ...options, theta: 0.3 });
  assert.ok(fine.relativeForceRms < coarse.relativeForceRms);
  assert.ok(fine.maximumForceErrorOverMaximumReference < coarse.maximumForceErrorOverMaximumReference);
  const measured = validationSnapshot(s, { ...options, algorithm: 'barnes-hut', energyAlgorithm: 'direct' });
  const estimated = validationSnapshot(s, { ...options, algorithm: 'barnes-hut' });
  assert.equal(measured.energyApproximate, false);
  assert.equal(measured.algorithm, 'barnes-hut');
  assert.equal(estimated.energyApproximate, true);
  assert.deepEqual(s.positions, original.positions);
  assert.deepEqual(s.velocities, original.velocities);
  assert.deepEqual(s.masses, original.masses);
  assert.deepEqual(s.accelerations, original.accelerations);
});

function polynomialGrid() {
  const nu = 4, nv = 4, du = 0.4, dv = 0.4, values = [];
  // Phi(u,v)=u^2+3v^2; exact tensor Hermite polynomial, values encode
  // Phi, dPhi/du, dPhi/dv, d^2Phi/(du dv) at every grid vertex.
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) values.push((i * du) ** 2 + 3 * (j * dv) ** 2, 2 * i * du, 6 * j * dv, 0);
  return { schema: 'axisymmetric-potential-hermite-v1', modelId: 'polynomial-test', nu, nv, du, dv, rscale: 1, zscale: 1, massInternal: 1, values };
}

test('v1.0.1 frozen Hermite field derives acceleration and energy from one scalar and counts extrapolation', () => {
  const grid = polynomialGrid(), p = [0.7, 0.3, -0.4], h = 1e-5;
  const q = externalGridAt(grid, ...p);
  for (let axis = 0; axis < 3; axis++) {
    const plus = p.slice(), minus = p.slice(); plus[axis] += h; minus[axis] -= h;
    const derivative = (externalGridAt(grid, ...plus).potential - externalGridAt(grid, ...minus).potential) / (2 * h);
    close(-derivative, q.acceleration[axis], 3e-10);
  }
  const s = state([...p, 100, 0, 0], Array(6).fill(0), [2, 3], [1, 1]);
  s.meta = { physicalModel: { id: grid.modelId } };
  const diagnostic = validationSnapshot(s, { externalGrid: grid, selfGravity: false });
  assert.equal(diagnostic.externalExtrapolated, 1);
  close(diagnostic.externalPotential, 2 * q.potential + 3 * externalGridAt(grid, 100, 0, 0).potential);
});

test('v1.0.1 diagnostics reject invalid values instead of serializing false precision', () => {
  const s = state([1, 0, 0], [0, 1, 0], [1]);
  assert.throws(() => validationSnapshot(s, { externalPotential: () => NaN }), /não finito/);
  assert.throws(() => validationSnapshot(s, { epsilon: -1 }), /Suavização/);
  assert.throws(() => validationSnapshot(s, { origin: [NaN, 0, 0] }), /Origem/);
  s.velocities[0] = Infinity;
  assert.throws(() => validationSnapshot(s), /Velocidades/);
});

test('v1.0.1 changing the Hamiltonian or angular origin cannot masquerade as conserved energy', () => {
  const s = state([-1, 0, 0, 1, 0, 0], [0, -0.4, 0, 0, 0.4, 0], [1, 1]);
  const first = validationSnapshot(s, { G: 1, epsilon: 0.1 });
  const modified = validationSnapshot(s, { G: 1, epsilon: 0.2 });
  assert.throws(() => conservationSample(modified, first), /definição da energia mudou.*epsilon/);
  const external = validationSnapshot(s, { selfGravity: false, externalPotential: (x, y, z) => x * x + y * y + z * z, externalSymmetry: 'spherical', origin: [1, 0, 0] });
  assert.equal(external.conditions.angularVector, false);
  assert.equal(external.conditions.angularZ, false);
  const centric = validationSnapshot(s, { selfGravity: false, externalPotential: (x, y, z) => x * x + y * y + z * z, externalSymmetry: 'spherical' });
  assert.equal(centric.conditions.angularVector, true);
});
