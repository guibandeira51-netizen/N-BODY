import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createGalaxy } from '../src/physics/initial.js';
import { Leapfrog } from '../src/physics/integrator.js';
import { directAccelerations, barnesHutAccelerations } from '../src/physics/forces.js';
import { analyticAcceleration, analyticPotential } from '../src/physics/models.js';
import { conservationError } from '../src/physics/diagnostics.js';
import { structureDiagnostics } from '../src/physics/structure-diagnostics.js';
import { G } from '../src/physics/constants.js';

// Diagnostic experiments only. The fixed analytic field is never substituted
// for the production self-gravitating force. No generated trajectory is reused.
const destination = new URL('../reports/equilibrium/legacy-controls.json', import.meta.url);
await mkdir(new URL('../reports/equilibrium/', import.meta.url), { recursive: true });
const report = {
  schema: 'nbody-legacy-controls-v1', startedUTC: new Date().toISOString(), completedUTC: null,
  referenceCommit: '51dd8cb1c7ee68187bc092b226369f2f920ad663', initializer: 'legacy',
  sourceSha256: {}, precision: 'Float64', units: { length: 'kpc', time: 'Myr', mass: '1e10 Msun', acceleration: 'kpc/Myr^2' },
  protocol: { seeds: [2026, 2027, 2028], baselineN: 2000, durationMyr: 20, baselineDtMyr: 0.1, baselineEpsilonKpc: 0.1, baselineTheta: 0.5, sampleTimesMyr: [0, 5, 10, 20],
    pairing: 'Identical initial typed arrays cloned for every force, timestep and softening variant at a given N and seed.',
    quantiles: 'Current diagnostics use interpolated number and inverse mass-CDF quantiles; legacy number median is additionally recorded.',
    timing: 'Wall times include diagnostics and may overlap other host activity. These are experiment costs, not isolated hardware benchmarks.',
    potentialConvention: 'N-body energy: one half sum m_i Phi_i with exact softened pair Phi excluding self. Fixed field: sum m_i Phi_analytic, without factor one half.',
    caveat: 'Smooth controls are unsoftened, while N-body uses Plummer softening; their difference does not isolate discreteness alone.' },
  initialRealizations: [], initialForceComparisons: [], runs: [], summary: null,
};
for (const path of ['src/physics/initial.js', 'src/physics/forces.js', 'src/physics/integrator.js', 'src/physics/models.js', 'src/physics/constants.js', 'src/physics/structure-diagnostics.js', 'scripts/equilibrium-controls.mjs']) {
  report.sourceSha256[path] = createHash('sha256').update(await readFile(new URL('../' + path, import.meta.url))).digest('hex');
}
const persist = async () => { report.updatedUTC = new Date().toISOString(); await writeFile(destination, JSON.stringify(report, null, 2) + '\n'); };
const clone = state => ({ ...state, meta: structuredClone(state.meta), positions: state.positions.slice(), velocities: state.velocities.slice(), masses: state.masses.slice(), components: state.components.slice(), accelerations: state.accelerations.slice(), time: 0 });
const cache = new Map();
function realization(n, seed) {
  const key = `${n}:${seed}`;
  if (!cache.has(key)) {
    const state = createGalaxy({ n, seed, withHalo: true, initialization: 'legacy' });
    if (!state.meta.initialization.includes('Jeans')) throw new Error('Historical initializer was not selected. Update the explicit historical import/selector.');
    const hash = createHash('sha256');
    for (const array of [state.positions, state.velocities, state.masses, state.components]) hash.update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
    report.initialRealizations.push({ n, seed, stateSha256: hash.digest('hex'), meta: state.meta });
    cache.set(key, state);
  }
  return clone(cache.get(key));
}
function smoothAcceleration(state) {
  for (let i = 0; i < state.n; i++) {
    const k = 3 * i, a = analyticAcceleration(state.positions[k], state.positions[k + 1], state.positions[k + 2], true);
    state.accelerations.set(a, k);
  }
  return state.accelerations;
}
function specificPotential(state, mode, epsilon) {
  const phi = new Float64Array(state.n), p = state.positions, m = state.masses;
  if (mode === 'fixed-analytic') {
    for (let i = 0; i < state.n; i++) { const k = 3 * i; phi[i] = analyticPotential(p[k], p[k + 1], p[k + 2], true); }
  } else {
    for (let i = 0; i < state.n; i++) for (let j = i + 1; j < state.n; j++) {
      const a = 3 * i, b = 3 * j, dx = p[a] - p[b], dy = p[a + 1] - p[b + 1], dz = p[a + 2] - p[b + 2];
      const inv = -G / Math.sqrt(dx * dx + dy * dy + dz * dz + epsilon * epsilon);
      phi[i] += m[j] * inv; phi[j] += m[i] * inv;
    }
  }
  return phi;
}
function snapshot(state, mode, epsilon) {
  const structure = structureDiagnostics(state, { accelerations: state.accelerations, specificPotential: specificPotential(state, mode, epsilon), potentialWeight: mode === 'fixed-analytic' ? 1 : 0.5 });
  const global = { mass: 0, kinetic: 0, potential: 0, energy: 0, momentum: [0, 0, 0], angularMomentum: [0, 0, 0], momentumScale: 0, angularMomentumScale: 0, energyApproximate: false };
  for (const c of structure.components) {
    for (const key of ['mass', 'kinetic', 'potential', 'energy', 'angularMomentumScale']) global[key] += c[key];
    for (let k = 0; k < 3; k++) { global.momentum[k] += c.momentum[k]; global.angularMomentum[k] += c.angularMomentum[k]; }
    const radii = [], heights = [];
    for (let i = 0; i < state.n; i++) if (state.components[i] === c.id) {
      const k = 3 * i; radii.push(Math.hypot(state.positions[k], state.positions[k + 1], state.positions[k + 2])); heights.push(Math.abs(state.positions[k + 2]));
    }
    radii.sort((a, b) => a - b); heights.sort((a, b) => a - b);
    c.legacyNumberMedian = { r: radii[Math.floor(radii.length / 2)], absZ: heights[Math.floor(heights.length / 2)] };
  }
  for (let i = 0; i < state.n; i++) { const k = 3 * i; global.momentumScale += state.masses[i] * Math.hypot(state.velocities[k], state.velocities[k + 1], state.velocities[k + 2]); }
  return { timeMyr: state.time ?? 0, global, structure };
}
function fixedStep(state, dt, count) {
  for (let step = 0; step < count; step++) {
    for (let k = 0; k < state.positions.length; k++) { state.velocities[k] += 0.5 * dt * state.accelerations[k]; state.positions[k] += dt * state.velocities[k]; }
    smoothAcceleration(state);
    for (let k = 0; k < state.positions.length; k++) state.velocities[k] += 0.5 * dt * state.accelerations[k];
  }
  state.time += count * dt;
}
function quantile(sorted, q) { const rank = q * (sorted.length - 1), i = Math.floor(rank); return sorted.length ? sorted[i] + (rank - i) * (sorted[Math.ceil(rank)] - sorted[i]) : null; }
function accelerationDifference(state, measured, reference) {
  const result = [];
  for (const component of [-1, 0, 1, 2]) {
    let error2 = 0, reference2 = 0; const relative = [], absolute = [];
    for (let i = 0; i < state.n; i++) if (component < 0 || state.components[i] === component) {
      const k = 3 * i, err = Math.hypot(measured[k] - reference[k], measured[k + 1] - reference[k + 1], measured[k + 2] - reference[k + 2]), ref = Math.hypot(reference[k], reference[k + 1], reference[k + 2]);
      error2 += err * err; reference2 += ref * ref; absolute.push(err); if (ref > 0) relative.push(err / ref);
    }
    absolute.sort((a, b) => a - b); relative.sort((a, b) => a - b);
    result.push({ component, count: absolute.length, relativeRms: Math.sqrt(error2 / reference2), absoluteRms: Math.sqrt(error2 / absolute.length), relativeMedian: quantile(relative, 0.5), relativeP95: quantile(relative, 0.95), relativeP99: quantile(relative, 0.99), relativeMaximum: relative.at(-1), absoluteP99: quantile(absolute, 0.99), absoluteMaximum: absolute.at(-1), zeroReferenceExcluded: absolute.length - relative.length });
  }
  return result;
}
for (const seed of report.protocol.seeds) {
  const state = realization(2000, seed), exact = directAccelerations(state, { epsilon: 0.1 }, new Float64Array(3 * state.n));
  const smooth = smoothAcceleration(state).slice();
  for (const theta of [0.5, 0.25]) {
    const approximate = barnesHutAccelerations(state, { theta, epsilon: 0.1 }, new Float64Array(3 * state.n));
    report.initialForceComparisons.push({ n: state.n, seed, measured: 'Barnes–Hut', reference: 'direct-pair', epsilon: 0.1, theta, errors: accelerationDifference(state, approximate, exact) });
  }
  report.initialForceComparisons.push({ n: state.n, seed, measured: 'direct-pair softened', reference: 'fixed analytic unsoftened', epsilon: 0.1, errors: accelerationDifference(state, exact, smooth) });
  await persist();
}
const cases = [];
for (const seed of report.protocol.seeds) {
  cases.push({ n: 2000, seed, mode: 'fixed-analytic', dt: 0.1, epsilon: null, theta: null });
  cases.push({ n: 2000, seed, mode: 'barnes-hut', dt: 0.1, epsilon: 0.1, theta: 0.5 });
}
cases.push({ n: 2000, seed: 2026, mode: 'direct', dt: 0.1, epsilon: 0.1, theta: null });
cases.push({ n: 2000, seed: 2026, mode: 'barnes-hut', dt: 0.1, epsilon: 0.1, theta: 0.25 });
cases.push({ n: 2000, seed: 2026, mode: 'barnes-hut', dt: 0.05, epsilon: 0.1, theta: 0.5 });
cases.push({ n: 2000, seed: 2026, mode: 'barnes-hut', dt: 0.1, epsilon: 0.3, theta: 0.5 });
for (const seed of report.protocol.seeds) cases.push({ n: 10000, seed, mode: 'fixed-analytic', dt: 0.1, epsilon: null, theta: null });
for (const settings of cases) {
  const start = performance.now(), state = realization(settings.n, settings.seed), run = { ...settings, withHalo: true, startedUTC: new Date().toISOString(), completedUTC: null, snapshots: [] };
  let engine;
  if (settings.mode === 'fixed-analytic') smoothAcceleration(state);
  else { engine = new Leapfrog(state, { algorithm: settings.mode, dt: settings.dt, epsilon: settings.epsilon, theta: settings.theta ?? 0 }); engine.initialize(); }
  const initial = snapshot(state, settings.mode, settings.epsilon); run.snapshots.push(initial);
  report.runs.push(run); await persist();
  for (const time of report.protocol.sampleTimesMyr.slice(1)) {
    const count = Math.round((time - state.time) / settings.dt);
    if (engine) engine.step(count); else fixedStep(state, settings.dt, count);
    const measured = snapshot(state, settings.mode, settings.epsilon);
    measured.globalChange = conservationError(measured.global, initial.global);
    run.snapshots.push(measured); run.wallClockMs = performance.now() - start; await persist();
  }
  run.finite = state.positions.every(Number.isFinite) && state.velocities.every(Number.isFinite);
  run.completedUTC = new Date().toISOString(); run.wallClockMs = performance.now() - start;
  const changes = run.snapshots.at(-1).structure.components.map((c, i) => ({ component: c.id, r50Fraction: c.r50 / initial.structure.components[i].r50 - 1, medianAbsZFraction: c.medianAbsZ / initial.structure.components[i].medianAbsZ - 1, sigmaZFraction: c.velocity.dispersion[2] / initial.structure.components[i].velocity.dispersion[2] - 1 }));
  run.finalStructuralChanges = changes;
  console.log(JSON.stringify({ settings, wallClockMs: run.wallClockMs, finite: run.finite, changes }));
  await persist();
}
report.completedUTC = new Date().toISOString();
report.summary = report.runs.map(({ snapshots, ...run }) => ({ ...run, finalGlobalChange: snapshots.at(-1).globalChange }));
await persist();
console.log(`Completed ${report.runs.length} actual control integrations; ${destination.pathname}`);
