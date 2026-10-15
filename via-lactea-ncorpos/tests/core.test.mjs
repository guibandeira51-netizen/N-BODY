import test from 'node:test';
import assert from 'node:assert/strict';
import { directAccelerations, directPotentialEnergy, barnesHutAccelerations, barnesHutPotentialEnergy, getBarnesHutStats } from '../src/physics/forces.js';
import { Leapfrog } from '../src/physics/integrator.js';
import { diagnostics, conservationError } from '../src/physics/diagnostics.js';
import { GPUBackend } from '../src/compute/gpu.js';

const EPSILON = 0.05;
function state(positions, masses, velocities = positions.map(() => 0)) {
  return { n: masses.length, positions: new Float64Array(positions), velocities: new Float64Array(velocities),
    masses: new Float64Array(masses), accelerations: new Float64Array(positions.length), components: new Uint8Array(masses.length) };
}
function close(a, b, tolerance = 1e-12) { assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}; tol=${tolerance}`); }
function binary(epsilon = EPSILON) {
  const omega = Math.sqrt(2 / (4 + epsilon * epsilon) ** 1.5);
  return { state: state([-1, 0, 0, 1, 0, 0], [1, 1], [0, -omega, 0, 0, omega, 0]), omega, period: 2 * Math.PI / omega };
}
const options = { epsilon: EPSILON, G: 1 };

test('direct pair force follows the 3D Plummer law and Newton third law', () => {
  const s = state([0, 0, 0, 2, 3, 6], [2, 7]);
  const a = directAccelerations(s, { epsilon: 0.2, G: 3 });
  const factor = 3 / (49.04 ** 1.5);
  [2, 3, 6].forEach((delta, axis) => { close(a[axis], factor * 7 * delta); close(a[axis + 3], -factor * 2 * delta); });
  for (let axis = 0; axis < 3; axis++) close(2 * a[axis] + 7 * a[axis + 3], 0);
});

test('single particle has zero self force and zero self potential', () => {
  const s = state([9, -2, 4], [12]);
  assert.deepEqual([...directAccelerations(s, options)], [0, 0, 0]);
  assert.equal(directPotentialEnergy(s, options), 0);
});

test('exact potential matches the gradient of softened pair energy', () => {
  const s = state([-1, 0, 0, 1, 0, 0], [2, 3]);
  const acceleration = directAccelerations(s, options)[0];
  const h = 1e-5;
  s.positions[0] += h; const plus = directPotentialEnergy(s, options);
  s.positions[0] -= 2 * h; const minus = directPotentialEnergy(s, options);
  close(-(plus - minus) / (2 * h * 2), acceleration, 1e-10);
});

test('coincident positions stay finite with softening and reject singular unsoftened force', () => {
  const s = state([2, 2, 2, 2, 2, 2], [3, 4]);
  assert.deepEqual([...directAccelerations(s, options)], [0, 0, 0, 0, 0, 0]);
  close(directPotentialEnergy(s, options), -12 / EPSILON);
  assert.throws(() => directAccelerations(s, { epsilon: 0, G: 1 }), /coincidentes/);
});

test('softening sensitivity follows its analytic acceleration ratio', () => {
  const s = state([0, 0, 0, 1, 0, 0], [1, 1]);
  const unsoftened = directAccelerations(s, { epsilon: 0, G: 1 })[0];
  const softened = directAccelerations(s, { epsilon: 0.4, G: 1 })[0];
  close(softened / unsoftened, (1 + 0.4 ** 2) ** -1.5);
  assert.ok(softened < unsoftened);
});

test('direct force is invariant under translations and scales linearly with source mass', () => {
  const s = state([-2, 3, 1, 4, -5, 9, 6, 8, -3], [1, 2, 4]);
  const a = directAccelerations(s, options).slice();
  for (let k = 0; k < s.positions.length; k++) s.positions[k] += [100, -1000, 15][k % 3];
  const shifted = directAccelerations(s, options).slice();
  for (let k = 0; k < a.length; k++) close(a[k], shifted[k]);
  s.masses = s.masses.map(x => x * 7);
  const scaled = directAccelerations(s, options);
  for (let k = 0; k < a.length; k++) close(7 * a[k], scaled[k]);
});

test('KDK initializes acceleration and keeps physical time independent of batching', () => {
  const first = binary().state, second = binary().state;
  const one = new Leapfrog(first, { ...options, dt: 0.01 });
  const batch = new Leapfrog(second, { ...options, dt: 0.01 });
  for (let i = 0; i < 10; i++) one.step();
  batch.step(10);
  assert.deepEqual(first.positions, second.positions);
  assert.deepEqual(first.velocities, second.velocities);
  close(one.time, batch.time, 1e-15);
  assert.equal(batch.steps, 10);
});

test('two-body circular orbit conserves energy, linear momentum and angular momentum over five periods', () => {
  const { state: s, period } = binary();
  const integrator = new Leapfrog(s, { ...options, dt: period / 256 });
  const reference = diagnostics(s, options);
  let maxEnergy = 0, maxMomentum = 0, maxAngular = 0;
  for (let i = 0; i < 5 * 256; i++) {
    integrator.step();
    const error = conservationError(diagnostics(s, options), reference);
    maxEnergy = Math.max(maxEnergy, error.energy); maxMomentum = Math.max(maxMomentum, error.momentum); maxAngular = Math.max(maxAngular, error.angularMomentum);
  }
  assert.ok(maxEnergy < 1e-6, `max energy drift ${maxEnergy}`);
  assert.ok(maxMomentum < 1e-13, `max momentum drift ${maxMomentum}`);
  assert.ok(maxAngular < 1e-13, `max angular momentum drift ${maxAngular}`);
  close(s.masses[0] + s.masses[1], 2);
});

test('global orbit error converges at second order when the timestep is halved', () => {
  const endpointError = steps => {
    const { state: s, period } = binary();
    const origin = s.positions.slice();
    new Leapfrog(s, { ...options, dt: period / steps }).step(steps);
    return Math.hypot(...s.positions.map((x, i) => x - origin[i]));
  };
  const coarse = endpointError(128), fine = endpointError(256), finer = endpointError(512);
  assert.ok(coarse / fine > 3.8 && coarse / fine < 4.2, `128/256 ratio ${coarse / fine}`);
  assert.ok(fine / finer > 3.8 && fine / finer < 4.2, `256/512 ratio ${fine / finer}`);
});

test('KDK is time reversible when velocities are reversed', () => {
  const { state: s, period } = binary();
  const initial = s.positions.slice(), velocities = s.velocities.slice();
  const integrator = new Leapfrog(s, { ...options, dt: period / 256 });
  integrator.step(91);
  s.velocities = s.velocities.map(x => -x);
  integrator.step(91);
  for (let k = 0; k < s.positions.length; k++) { close(s.positions[k], initial[k], 1e-12); close(s.velocities[k], -velocities[k], 1e-12); }
});

test('component diagnostics measure mass and size without changing the physical state', () => {
  const s = state([-2, 0, -1, 2, 0, 1, 10, 0, 0], [2, 2, 5]);
  s.components[2] = 2;
  const masses = s.masses.slice(), positions = s.positions.slice();
  const result = diagnostics(s, options);
  assert.equal(result.mass, 9);
  assert.equal(result.components[0].count, 2);
  close(result.components[0].rmsRadius, Math.sqrt(5));
  close(result.components[0].rmsHeight, 1);
  assert.equal(result.components[1].id, 2);
  assert.deepEqual(s.masses, masses);
  assert.deepEqual(s.positions, positions);
});

test('invalid input fails before integration', () => {
  const s = binary().state;
  assert.throws(() => new Leapfrog(s, { dt: 0 }), /passo/);
  assert.throws(() => directAccelerations(s, { epsilon: -1 }), /suavização/);
  assert.throws(() => directAccelerations(s, options, s.positions), /independente/);
  s.masses[0] = -1;
  assert.throws(() => directAccelerations(s, options), /Massas/);
});

test('force output rejects overlapping views before changing any physical array', () => {
  for (const force of [directAccelerations, barnesHutAccelerations]) {
    for (const name of ['positions', 'velocities', 'masses', 'components']) {
      const s = binary().state, buffer = new ArrayBuffer(80), out = new Float64Array(buffer, 8, 6);
      // The source starts before the output; their byte ranges partly overlap.
      s[name] = name === 'components' ? new Uint8Array(buffer, 8, 2) : new Float64Array(buffer, 0, s[name].length);
      if (name === 'positions') s[name].set([-1, 0, 0, 1, 0, 0]);
      if (name === 'masses') s[name].set([1, 1]);
      const original = s[name].slice();
      assert.throws(() => force(s, options, out), /independente/);
      assert.deepEqual(s[name], original, `${force.name} changed ${name}`);
    }
    const s = binary().state, alias = new Float64Array(s.positions.buffer), original = s.positions.slice();
    assert.throws(() => force(s, options, alias), /independente/);
    assert.deepEqual(s.positions, original);
  }
});

test('force output permits disjoint views in the same buffer', () => {
  for (const force of [directAccelerations, barnesHutAccelerations]) {
    const s = binary().state, buffer = new ArrayBuffer(96);
    s.positions = new Float64Array(buffer, 0, 6); s.positions.set([-1, 0, 0, 1, 0, 0]);
    const out = new Float64Array(buffer, 48, 6), original = s.positions.slice();
    force(s, options, out);
    assert.ok(out[0] > 0 && out[3] < 0);
    assert.deepEqual(s.positions, original);
  }
});

test('KDK rejects nonfinite velocities and epochs without mutating the state', () => {
  for (const invalid of [NaN, Infinity, -Infinity]) {
    const s = binary().state; s.velocities[0] = invalid;
    const positions = s.positions.slice(), velocities = s.velocities.slice();
    assert.throws(() => new Leapfrog(s, options), /Velocidades.*finitas/);
    assert.deepEqual(s.positions, positions); assert.deepEqual(s.velocities, velocities);
    const timed = binary().state; timed.time = invalid;
    assert.throws(() => new Leapfrog(timed, options), /tempo.*finito/);
  }
  const s = binary().state; s.time = 12.5;
  const integrator = new Leapfrog(s, {...options, dt: 0.25}); integrator.step(2);
  assert.equal(integrator.time, 13); assert.equal(s.time, 13);
});

test('GPU rejects a nonfinite epoch before accessing device resources', async () => {
  // Only input validation runs here; actual GPU computation is tested in the browser.
  const backend = Object.create(GPUBackend.prototype);
  for (const time of [NaN, Infinity, -Infinity]) {
    const s = binary().state; s.time = time;
    await assert.rejects(backend.initialize(s), /tempo.*finito/);
  }
});

function seededState(n, seed = 73421) {
  let x = seed >>> 0;
  const random = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
  const positions = [], masses = [];
  for (let i = 0; i < n; i++) {
    positions.push(2 * random() - 1, 2 * random() - 1, 2 * random() - 1);
    masses.push((0.2 + random()) / n);
  }
  return state(positions, masses);
}
const rmsForceError = (approximate, exact) => {
  let difference2 = 0, exact2 = 0;
  for (let k = 0; k < exact.length; k++) { difference2 += (approximate[k] - exact[k]) ** 2; exact2 += exact[k] ** 2; }
  return Math.sqrt(difference2 / exact2);
};

test('real 3D octree with theta=0 agrees with the exact particle force and potential', () => {
  const s = seededState(257);
  const exact = directAccelerations(s, options).slice();
  const treeForce = barnesHutAccelerations(s, { ...options, theta: 0 });
  assert.ok(rmsForceError(treeForce, exact) < 3e-15);
  const exactU = directPotentialEnergy(s, options);
  close(barnesHutPotentialEnergy(s, { ...options, theta: 0 }), exactU, 3e-15);
  assert.ok(getBarnesHutStats(s).nodeCount > 8);
});

test('Barnes–Hut normalized RMS force error decreases with opening angle', () => {
  const s = seededState(512);
  const exact = directAccelerations(s, options).slice();
  const coarse = rmsForceError(barnesHutAccelerations(s, { ...options, theta: 0.8 }), exact);
  const fine = rmsForceError(barnesHutAccelerations(s, { ...options, theta: 0.4 }), exact);
  const finer = rmsForceError(barnesHutAccelerations(s, { ...options, theta: 0.2 }), exact);
  assert.ok(coarse < 0.035, `theta0.8 RMS ${coarse}`);
  assert.ok(fine < 0.005 && fine < coarse / 2, `theta0.4 RMS ${fine}, coarse ${coarse}`);
  assert.ok(finer < fine / 2, `theta0.2 RMS ${finer}, fine ${fine}`);
});

test('octree duplicate leaves are finite and exclude self force and self potential', () => {
  const n = 300;
  const s = state(Array.from({ length: 3 * n }, (_, k) => [2, -3, 4][k % 3]), Array(n).fill(1 / n));
  const treeForce = barnesHutAccelerations(s, { ...options, theta: 10 });
  assert.ok(treeForce.every(x => x === 0));
  close(barnesHutPotentialEnergy(s, { ...options, theta: 10 }), -(n - 1) / (2 * n * EPSILON), 1e-12);
  assert.equal(getBarnesHutStats(s).nodeCount, 1);
  assert.throws(() => barnesHutAccelerations(s, { epsilon: 0, G: 1 }), /coincidentes/);
});

test('octree excludes targets inside accepted nodes, including zero-mass tracers', () => {
  const s = seededState(129);
  s.masses[0] = 0;
  s.positions.fill(0, 0, 3);
  const exact = directAccelerations(s, options).slice();
  const approximate = barnesHutAccelerations(s, { ...options, theta: 0.3 });
  assert.ok(rmsForceError(approximate, exact) < 0.005);
  assert.ok(approximate.every(Number.isFinite));
});

test('octree handles spatial subdivisions approaching machine precision', () => {
  const n = 32, positions = [], masses = Array(n).fill(1 / n);
  for (let i = 0; i < n; i++) positions.push(1e16 + (i % 2) * 2, 0, 0);
  const s = state(positions, masses);
  const exact = directAccelerations(s, options).slice();
  const treeForce = barnesHutAccelerations(s, { ...options, theta: 0 });
  assert.ok(rmsForceError(treeForce, exact) < 3e-15);
  assert.ok(getBarnesHutStats(s).nodeCount < 200);
});

test('Barnes–Hut forces are translation invariant and preserve masses and component labels', () => {
  const s = seededState(129);
  const before = barnesHutAccelerations(s, { ...options, theta: 0.5 }).slice();
  const masses = s.masses.slice(), labels = s.components.slice();
  for (let k = 0; k < s.positions.length; k++) s.positions[k] += [20, -40, 60][k % 3];
  const after = barnesHutAccelerations(s, { ...options, theta: 0.5 });
  assert.ok(rmsForceError(after, before) < 2e-13);
  assert.deepEqual(s.masses, masses);
  assert.deepEqual(s.components, labels);
});

test('Barnes–Hut potential respects the same softening and is labeled approximate', () => {
  const s = seededState(200);
  const result = diagnostics(s, { ...options, algorithm: 'barnes-hut', theta: 0.5 });
  assert.equal(result.energyApproximate, true);
  const exact = directPotentialEnergy(s, options);
  assert.ok(Math.abs(result.potential - exact) / Math.abs(exact) < 0.01);
  assert.equal(diagnostics(s, { ...options, algorithm: 'barnes-hut', theta: 0 }).energyApproximate, false);
  const smallSoftening = barnesHutPotentialEnergy(s, { epsilon: 0.01, G: 1, theta: 0 });
  const bigSoftening = barnesHutPotentialEnergy(s, { epsilon: 0.5, G: 1, theta: 0 });
  assert.ok(Math.abs(bigSoftening) < Math.abs(smallSoftening));
});

test('Barnes–Hut KDK recalculates forces from evolving positions', () => {
  const s = seededState(64);
  const before = s.positions.slice();
  const integrator = new Leapfrog(s, { ...options, algorithm: 'barnes-hut', theta: 0.4, dt: 0.001 });
  integrator.step(2);
  assert.notDeepEqual(s.positions, before);
  const reference = barnesHutAccelerations(s, { ...options, theta: 0.4 }, new Float64Array(3 * s.n));
  assert.deepEqual(s.accelerations, reference);
  close(integrator.time, 0.002);
});
