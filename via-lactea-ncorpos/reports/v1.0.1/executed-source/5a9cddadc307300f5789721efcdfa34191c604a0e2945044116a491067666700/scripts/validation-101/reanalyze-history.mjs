/** Recompute v1.0.1 diagnostics of preserved v1.0.0 trajectories.
 * No integration, relabeling by present height, resampling or mass renormalization.
 * Run: node scripts/validation-101/reanalyze-history.mjs [--run=calibrated-A-50k]
 * Sparse direct-energy maxima are lower bounds on the true trajectory maxima.
 */
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root, read, save, hash, codeIdentity, structural } from './common.mjs';
import { validationSnapshot, conservationSample, summarizeConservationSeries } from '../../src/physics/validation-101.js';

const started = performance.now(), identity = await codeIdentity();
const onlyRun = process.argv.find(argument => argument.startsWith('--run='))?.slice(6);
const filenames = (await readdir(resolve(root, 'reports/v1.0.0/runs'))).filter(filename => filename.startsWith('calibrated-') && filename.endsWith('.json') && (!onlyRun || filename === `${onlyRun}.json`)).sort();
if (!filenames.length) throw new Error('Nenhuma trajetória histórica calibrada corresponde ao filtro.');
const rows = [];

function makeState(constants, sample, subpopulations) {
  return {
    n: constants.n, time: sample.timeMyr,
    positions: Float64Array.from(sample.positions), velocities: Float64Array.from(sample.velocities), accelerations: Float64Array.from(sample.accelerations),
    masses: Float64Array.from(constants.masses), components: Uint8Array.from(constants.components), subpopulations,
    meta: structuredClone(constants.meta),
  };
}
function denseHistoricalSample(sample, config) {
  const d = sample.conservation, angularMomentumNorm = Math.hypot(...d.angularMomentum);
  return {
    ...d, time: sample.timeMyr, Lx: d.angularMomentum[0], Ly: d.angularMomentum[1], Lz: d.angularMomentum[2], Lnorm: angularMomentumNorm, angularMomentumNorm,
    energyAlgorithm: 'barnes-hut', selfGravity: true, epsilon: config.epsilon, theta: config.theta, origin: [0, 0, 0],
    energyScale: Math.abs(d.kinetic) + Math.abs(d.selfPotential ?? d.potential) + Math.abs(d.externalPotential ?? 0),
    centerOfMassVelocity: d.mass > 0 ? d.momentum.map(value => value / d.mass) : null,
    externalExtrapolated: d.externalField?.extrapolated ?? 0,
    provenance: 'unchanged historical diagnostic, directed Barnes-Hut Float64 potential estimate of GPU Float32 states',
  };
}

for (const filename of filenames) {
  const path = `reports/v1.0.0/runs/${filename}`, bytes = await readFile(resolve(root, path)), historical = JSON.parse(bytes), c = historical.config;
  if (historical.status !== 'completed' || !historical.particleConstants || !historical.particleStates?.length) throw new Error(`${filename}: não há trajetória concluída com estados completos.`);
  const initialId = `c20-agama-n${c.nb + c.nd + c.nh}-nb${c.nb}-nd${c.nd}-nh${c.nh}-s${c.seed}-h${c.haloSeed}${c.kind === 'gaussian-control' ? '-gaussian' : ''}`;
  const snapshotPath = `reports/v1.0.0/${c.dataset}/${initialId}.json`, initialBytes = await readFile(resolve(root, snapshotPath));
  if (hash(initialBytes) !== historical.snapshotSHA256) throw new Error(`${filename}: SHA-256 do snapshot inicial divergiu da proveniência histórica.`);
  const initial = JSON.parse(initialBytes), fixed = c.haloMode === 'fixed-axisymmetric';
  const sourceIndices = Array.from({ length: initial.n }, (_, i) => i).filter(i => !fixed || initial.components[i] !== 2);
  if (sourceIndices.length !== historical.particleConstants.n || initial.subpopulations?.length !== initial.n) throw new Error(`${filename}: identidade das subpopulações não pode ser demonstrada.`);
  const subpopulations = Uint8Array.from(sourceIndices, i => initial.subpopulations[i]);
  const actual0 = historical.particleStates.find(sample => sample.timeMyr === 0);
  const match = { positions: true, velocities: true, masses: true, components: true };
  for (let i = 0; i < sourceIndices.length; i++) {
    const source = sourceIndices[i];
    match.masses &&= historical.particleConstants.masses[i] === Math.fround(initial.masses[source]);
    match.components &&= historical.particleConstants.components[i] === initial.components[source];
    for (let axis = 0; axis < 3; axis++) {
      match.positions &&= actual0.positions[3 * i + axis] === Math.fround(initial.positions[3 * source + axis]);
      match.velocities &&= actual0.velocities[3 * i + axis] === Math.fround(initial.velocities[3 * source + axis]);
    }
  }
  if (Object.values(match).some(value => !value)) throw new Error(`${filename}: ordem dos corpos ou conversão Float32 não corresponde ao snapshot original: ${JSON.stringify(match)}`);
  let externalGrid = null, externalGridPath = null;
  if (fixed) {
    externalGridPath = `reports/v1.0.0/${c.dataset}/halo-fixed-grid.json`;
    const gridBytes = await readFile(resolve(root, externalGridPath));
    if (hash(gridBytes) !== historical.externalGridSHA256) throw new Error(`${filename}: SHA-256 da tabela fixa divergiu.`);
    externalGrid = JSON.parse(gridBytes);
  }
  const options = { ...c, algorithm: 'gpu-f32', energyAlgorithm: 'direct', ...(externalGrid ? { externalGrid } : {}) };
  const directSnapshots = [];
  for (const checkpoint of historical.particleStates.toSorted((a, b) => a.timeMyr - b.timeMyr)) {
    const wall = performance.now(), s = makeState(historical.particleConstants, checkpoint, subpopulations);
    const conservation = validationSnapshot(s, options);
    const bhEstimate = validationSnapshot(s, { ...options, energyAlgorithm: 'barnes-hut' });
    const historicalAtTime = historical.samples.find(sample => sample.timeMyr === checkpoint.timeMyr)?.conservation;
    const bhVsDirect = {
      selfPotentialSignedError: bhEstimate.selfPotential - conservation.selfPotential,
      bhEnergyDifferenceRelativeToDirectU: conservation.selfPotential ? (bhEstimate.selfPotential - conservation.selfPotential) / Math.abs(conservation.selfPotential) : null,
      totalEnergyDifferenceRelativeToDirectE: conservation.energy ? (bhEstimate.energy - conservation.energy) / Math.abs(conservation.energy) : null,
      differenceFromHistoricalEstimate: historicalAtTime ? bhEstimate.energy - historicalAtTime.energy : null,
      qualification: 'Same preserved state and Plummer epsilon; direct compensated Float64 pairs versus directed Barnes-Hut half sum. Both evaluate a GPU Float32 trajectory.',
    };
    const structure = structural(s, conservation);
    directSnapshots.push({ conservation, bhEstimate, bhVsDirect, structure, checkpointSHA256: hash(JSON.stringify(checkpoint)), analysisWallMs: performance.now() - wall });
    console.log(JSON.stringify({ run: historical.id, n: s.n, timeMyr: s.time, directEnergy: conservation.energy, bhRelativeUError: bhVsDirect.bhEnergyDifferenceRelativeToDirectU, wallMs: Math.round(performance.now() - wall) }));
  }
  const directSeries = directSnapshots.map(snapshot => snapshot.conservation), baseline = directSeries[0];
  for (const snapshot of directSnapshots) snapshot.conservation = conservationSample(snapshot.conservation, baseline);
  const denseHistorical = historical.samples.map(sample => denseHistoricalSample(sample, c));
  const historicalApproximateSeries = denseHistorical.map(sample => conservationSample(sample, denseHistorical[0]));
  const directSummary = summarizeConservationSeries(directSeries), historicalApproximateSummary = summarizeConservationSeries(denseHistorical);
  const outputPath = `historical-reanalysis-${historical.id}.json`;
  const report = {
    schema: 'historical-reanalysis-101', origin: 'historical-reanalysis-1.0.0', version: '1.0.1', id: historical.id, config: c,
    provenance: {
      historicalPath: path, historicalSHA256: hash(bytes), historicalStatus: historical.status, historicalCompletedUTC: historical.completedUTC,
      originalInitialSnapshotPath: snapshotPath, originalInitialSnapshotSHA256: hash(initialBytes),
      originalInitialSnapshotMatchedFloat32: match, externalGridPath, externalGridSHA256: historical.externalGridSHA256 ?? null,
      trajectoryPrecision: historical.particleConstants.precision, diagnosticPrecision: 'Float64 compensated direct Plummer particle-pair sum',
      populationLabels: 'Unchanged per-particle IDs from the SHA-256 matched original AGAMA initial snapshot; fixed-halo states use the same baryonic indices only.',
      code: identity, newIntegration: false, physicalMassesRenormalized: false,
    },
    directSnapshots, directSummary, historicalApproximateSeries, historicalApproximateSummary,
    qualification: [
      'New diagnostics of preserved actual trajectories; no new integration and no modification of the v1.0.0 source files.',
      'Direct-energy time samples are only the preserved full states. The reported maximum is a lower bound on the maximum between checkpoints; 5 Myr historical energy diagnostics are approximate Barnes-Hut estimates.',
      'Float64 diagnostics do not convert the original GPU Float32 trajectory into a CPU Float64 trajectory.',
      'Conservation, structural stationarity and convergence require separate interpretation; none is automatically certified by these measurements.',
      'Fixed halo energy is K + Uself + sum m Phi_ext. Only Lz is an ideal angular invariant of the axisymmetric external field.',
    ],
  };
  await save(outputPath, report);
  rows.push({ id: historical.id, path: outputPath, n: historical.particleConstants.n, config: c, origin: report.origin,
    historicalSHA256: report.provenance.historicalSHA256, snapshotSHA256: report.provenance.originalInitialSnapshotSHA256,
    directTimesMyr: directSeries.map(sample => sample.time), directSummary, historicalApproximateSummary,
    maximumAbsoluteBhRelativeUError: Math.max(...directSnapshots.map(snapshot => Math.abs(snapshot.bhVsDirect.bhEnergyDifferenceRelativeToDirectU ?? 0))),
    initialPopulationH50: Object.fromEntries(['thin', 'thick'].map(name => [name, directSnapshots[0].structure.populations[name].instant?.h50 ?? null])),
    finalPopulationH50: Object.fromEntries(['thin', 'thick'].map(name => [name, directSnapshots.at(-1).structure.populations[name].instant?.h50 ?? null])),
  });
}
await save(onlyRun ? `historical-reanalysis-summary-${onlyRun}.json` : 'historical-reanalysis-summary.json', {
  schema: 'historical-reanalysis-summary-101', origin: 'historical-reanalysis-1.0.0', newIntegration: false,
  analyzedRuns: rows.length, analyzedStates: rows.reduce((sum, row) => sum + row.directTimesMyr.length, 0), runs: rows,
  wallMs: performance.now() - started,
  qualification: 'Direct Float64 energies recomputed from actual historical GPU Float32 states; sparse direct maxima are lower bounds. Thin/thick labels are fixed IDs from hash-verified initial snapshots.',
});
console.log(JSON.stringify({ completed: rows.length, directStates: rows.reduce((sum, row) => sum + row.directTimesMyr.length, 0), wallMs: performance.now() - started }));
