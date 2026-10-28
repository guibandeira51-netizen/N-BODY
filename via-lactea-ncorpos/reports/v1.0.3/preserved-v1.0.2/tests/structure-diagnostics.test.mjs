import test from 'node:test';
import assert from 'node:assert/strict';
import { structureDiagnostics } from '../src/physics/structure-diagnostics.js';

const close = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
function state(positions, masses, velocities = positions.map(() => 0), components = masses.map(() => 0)) {
  return { n: masses.length, positions: new Float64Array(positions), masses: new Float64Array(masses), velocities: new Float64Array(velocities), components: new Uint8Array(components) };
}

test('structural quantiles distinguish enclosed mass from particle number and retain tails', () => {
  const s = state([1, 0, 0, 2, 0, 0, 1000, 0, 0], [1, 1, 8]);
  const before = s.positions.slice(), c = structureDiagnostics(s, { tailRadii: [100] }).components[0];
  assert.equal(c.r50, 1000); assert.equal(c.medianRadius, 2); assert.equal(c.R50, 1000);
  assert.equal(c.tails[0].numberFraction, 1 / 3); assert.equal(c.tails[0].massFraction, 0.8);
  assert.equal(c.percentiles.spherical.maximum, 1000); assert.deepEqual(s.positions, before);
});

test('equal-mass half quantiles do not shift a rank due to floating summation order',()=>{
  const positions=Array.from({length:900},(_,i)=>[i+1,0,0]).flat(),s=state(positions,Array(900).fill(6.8/900));
  const c=structureDiagnostics(s).components[0];assert.equal(c.r50,450);assert.equal(c.medianRadius,450.5);
});

test('component surface and folded vertical density integrate all included mass with explicit overflow', () => {
  const s = state([0.5, 0, 0.1, 1, 0, -0.1, 3, 0, 8], [2, 3, 5], undefined, [1, 1, 1]);
  const c = structureDiagnostics(s, { radialEdges: [0, 1, 2], cylindricalEdges: [0, 1, 2], heightEdges: [0, 0.2, 1], verticalAperture: 2 }).components[0];
  const radial = c.profiles.spherical.bins, surface = c.profiles.cylindrical.bins, vertical = c.profiles.vertical;
  assert.equal(radial.reduce((sum, bin) => sum + bin.mass, 0), 10);
  assert.equal(radial.at(-1).mass, 5); assert.equal(radial.at(-1).density, null);
  close(surface[0].density, 2 / Math.PI); close(surface[1].density, 3 / (3 * Math.PI));
  assert.equal(vertical.excludedMass, 5); close(vertical.bins[0].density, 5 / (2 * Math.PI * 4 * 0.2));
});

test('a cold circular ring has azimuthal streaming and zero random cylindrical dispersion', () => {
  const s = state([1, 0, 0, 0, 1, 0, -1, 0, 0, 0, -1, 0], [1, 1, 1, 1], [0, 2, 0, -2, 0, 0, 0, -2, 0, 2, 0, 0]);
  const c = structureDiagnostics(s).components[0];
  assert.deepEqual(c.velocity.mean, [0, 2, 0]); assert.deepEqual(c.velocity.dispersion, [0, 0, 0]);
  assert.deepEqual(c.angularMomentum, [0, 0, 8]); assert.equal(c.kinetic, 8);
});

test('force virial tensor and optional energy use supplied fields without equating softened W to U', () => {
  const s = state([-1, 0, 0, 1, 0, 0], [1, 1], [0, -1, 0, 0, 1, 0], [0, 1]);
  const result = structureDiagnostics(s, { accelerations: new Float64Array([1, 0, 0, -1, 0, 0]), specificPotential: new Float64Array([-3, -3]) });
  assert.equal(result.components.reduce((sum, c) => sum + c.potential, 0), -3);
  for (const c of result.components) {
    assert.equal(c.virial.W, -1); assert.equal(c.virial.twiceKOverNegativeW, 1);
    assert.deepEqual(c.virial.tensorResidual, [[-1, 0, 0], [0, 1, 0], [0, 0, 0]]);
    assert.equal(c.potential, -1.5); assert.equal(c.energy, -1);
  }
  const external = structureDiagnostics(s, { specificPotential: new Float64Array([-3, -3]), potentialWeight: 1 });
  assert.equal(external.components[0].potential, -3);
});

test('fixed frame diagnostics are invariant under matching coordinate and velocity translations', () => {
  const s = state([1, 2, 3, -1, -2, -3], [1, 2], [0.1, 0.2, 0.3, -0.1, -0.2, -0.3]);
  const a = structureDiagnostics(s).components[0];
  for (let i = 0; i < 6; i++) { s.positions[i] += [10, 20, 30][i % 3]; s.velocities[i] += [1, 2, 3][i % 3]; }
  const b = structureDiagnostics(s, { origin: [10, 20, 30], velocityOrigin: [1, 2, 3] }).components[0];
  close(a.r50, b.r50); close(a.kinetic, b.kinetic); close(a.medianAbsZ, b.medianAbsZ);
  for (let k = 0; k < 3; k++) { close(a.angularMomentum[k], b.angularMomentum[k]); close(a.centerOfMassRelative[k], b.centerOfMassRelative[k]); }
});

test('diagnostics reject invalid measurements and preserve undefined potential and axis velocities', () => {
  const s = state([0, 0, 0], [1]);
  const result = structureDiagnostics(s).components[0];
  assert.equal(result.energy, null); assert.equal(result.virial.W, null); assert.equal(result.velocity.mean, null);
  assert.equal(result.velocity.axisParticleCountExcluded, 1);
  assert.throws(() => structureDiagnostics(s, { accelerations: new Float64Array([NaN, 0, 0]) }), /Acelerações/);
  assert.throws(() => structureDiagnostics(s, { specificPotential: new Float64Array([Infinity]) }), /Potencial/);
  assert.throws(() => structureDiagnostics(s, { radialEdges: [0, 1, 1] }), /limites/);
  s.velocities[0] = NaN; assert.throws(() => structureDiagnostics(s), /Velocidades/);
});
