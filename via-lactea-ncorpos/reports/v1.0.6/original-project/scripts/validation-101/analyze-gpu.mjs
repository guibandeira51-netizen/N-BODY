/** Analyze only completed new v1.0.1 GPU integrations. No additional integration.
 * Run after collection: node scripts/validation-101/analyze-gpu.mjs
 * Optional incremental filter: --run=GPU-1000-dt0.1
 */
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root, save, codeIdentity, hash, structural } from './common.mjs';
import { validationSnapshot, conservationSample, summarizeConservationSeries } from '../../src/physics/validation-101.js';
import { G } from '../../src/physics/constants.js';

const started = performance.now(), identity = await codeIdentity();
const onlyRun = process.argv.find(argument => argument.startsWith('--run='))?.slice(6);
const directory = 'reports/v1.0.1/gpu', results = [];
const names = (await readdir(resolve(root, directory))).filter(name => name !== 'attempt.json' && name.endsWith('.json') && (!onlyRun || name === `${onlyRun}.json`)).sort();

function state(r, checkpoint, subpopulations) {
  return {
    n: r.config.n, time: checkpoint.timeMyr,
    positions: Float64Array.from(checkpoint.positions), velocities: Float64Array.from(checkpoint.velocities),
    accelerations: Float64Array.from(checkpoint.accelerations), masses: Float64Array.from(r.particleConstants.masses),
    components: Uint8Array.from(r.particleConstants.components), subpopulations,
    meta: structuredClone(r.particleConstants.meta),
  };
}
function vectorDifference(current, reference, dimensions = 3) {
  if (current.length !== reference.length || current.length % dimensions) throw new Error('Dimensões incompatíveis na comparação de estados.');
  let delta2 = 0, reference2 = 0, maximum = 0, maximumReference = 0;
  for (let i = 0; i < current.length; i += dimensions) {
    let d2 = 0, r2 = 0;
    for (let k = 0; k < dimensions; k++) { d2 += (current[i + k] - reference[i + k]) ** 2; r2 += reference[i + k] ** 2; }
    delta2 += d2; reference2 += r2; maximum = Math.max(maximum, Math.sqrt(d2)); maximumReference = Math.max(maximumReference, Math.sqrt(r2));
  }
  const count = current.length / dimensions;
  return {
    count, vectorRms: count ? Math.sqrt(delta2 / count) : 0, maximumVectorDifference: maximum,
    relativeVectorRms: reference2 > 0 ? Math.sqrt(delta2 / reference2) : delta2 === 0 ? 0 : null,
    maximumDifferenceOverMaximumReference: maximumReference > 0 ? maximum / maximumReference : maximum === 0 ? 0 : null,
  };
}
async function compareCpu(r) {
  if (r.config.n !== 1000) return null;
  const cpuId = `C-f64-dt${r.config.dt}`;
  const runPath = `reports/v1.0.1/runs/${cpuId}.json`, snapshotsPath = `reports/v1.0.1/snapshots/${cpuId}.json`;
  const cpuRunBytes = await readFile(resolve(root, runPath)), cpuStateBytes = await readFile(resolve(root, snapshotsPath));
  const cpu = JSON.parse(cpuRunBytes), cpuSnapshots = JSON.parse(cpuStateBytes);
  if (cpu.status !== 'completed' || cpu.config.n !== r.config.n || cpu.config.dt !== r.config.dt || cpu.config.epsilon !== r.config.epsilon || cpu.config.durationMyr !== r.config.duration || cpu.sourceSHA256 !== r.sourceSHA256) throw new Error(`${r.id}: comparação CPU não tem os mesmos parâmetros/fonte.`);
  const comparisons = [];
  for (const gpuState of r.particleStates) {
    const cpuState = cpuSnapshots.states.find(checkpoint => checkpoint.timeMyr === gpuState.timeMyr);
    if (!cpuState) throw new Error(`${r.id}: não há estado CPU em ${gpuState.timeMyr} Myr.`);
    comparisons.push({ timeMyr: gpuState.timeMyr,
      positionsKpc: vectorDifference(gpuState.positions, cpuState.positions),
      velocitiesKpcPerMyr: vectorDifference(gpuState.velocities, cpuState.velocities),
      masses1e10Msun: vectorDifference(r.particleConstants.masses, cpuState.masses, 1),
    });
  }
  return {
    cpuId, cpuConfig: cpu.config, cpuRunPath: runPath, cpuRunSHA256: hash(cpuRunBytes), cpuSnapshotsPath: snapshotsPath, cpuSnapshotsSHA256: hash(cpuStateBytes),
    sameSourceSHA256: true, sameDtAndEpsilon: true, initialUploadQuantization: comparisons.find(checkpoint => checkpoint.timeMyr === 0),
    finalStateDifference: comparisons.at(-1), checkpoints: comparisons,
    definition: 'vectorRms=sqrt(sum_i |qGPU_i-qCPU_i|^2/N); relativeVectorRms=sqrt(sum_i |difference|^2/sum_i |qCPU_i|^2); particles retain identical source order.',
    qualification: 'Initial difference measures Float32 upload quantization. Final difference combines different rounded initial states, masses/constants and accumulated GPU force/integration roundoff. It does not isolate trajectory precision at identical rounded initial states.',
  };
}

for (const filename of names) {
  const path = `${directory}/${filename}`, bytes = await readFile(resolve(root, path)), r = JSON.parse(bytes);
  if (r.status !== 'completed') { console.log(JSON.stringify({ skipped: path, status: r.status })); continue; }
  if (r.origin !== 'new-integration-1.0.1' || r.config.algorithm !== 'gpu-f32' || !Number.isSafeInteger(r.config.n) || r.config.n !== r.particleConstants.masses.length || !r.particleStates?.length) throw new Error(`${path}: configuração/estados GPU inválidos.`);
  const duration = r.config.duration;
  if (![duration, r.config.dt, r.config.cadence, r.config.epsilon].every(value => Number.isFinite(value) && value > 0)) throw new Error(`${path}: parâmetros físicos/temporais inválidos.`);
  const sourceBytes = await readFile(resolve(root, r.source)), sourceData = JSON.parse(sourceBytes);
  if (hash(sourceBytes) !== r.sourceSHA256 || sourceData.n !== r.config.n) throw new Error(`${path}: SHA-256/fonte inicial incompatível.`);
  if (sourceData.subpopulations?.length !== r.config.n) throw new Error(`${path}: fonte não preserva rótulos fino/espesso.`);
  const subpopulations = Uint8Array.from(sourceData.subpopulations);
  if (r.particleConstants.subpopulations?.some((value, i) => value !== subpopulations[i])) throw new Error(`${path}: rótulos de população foram alterados.`);
  const actual0 = r.particleStates.find(checkpoint => checkpoint.timeMyr === 0);
  if (!actual0 || !r.particleStates.some(checkpoint => checkpoint.timeMyr === duration)) throw new Error(`${path}: estados inicial/final completos ausentes.`);
  const matches = { positions: true, velocities: true, masses: true, components: true };
  for (let i = 0; i < r.config.n; i++) {
    matches.masses &&= r.particleConstants.masses[i] === Math.fround(sourceData.masses[i]);
    matches.components &&= r.particleConstants.components[i] === sourceData.components[i];
    for (let axis = 0; axis < 3; axis++) {
      matches.positions &&= actual0.positions[3 * i + axis] === Math.fround(sourceData.positions[3 * i + axis]);
      matches.velocities &&= actual0.velocities[3 * i + axis] === Math.fround(sourceData.velocities[3 * i + axis]);
    }
  }
  if (Object.values(matches).some(value => !value)) throw new Error(`${path}: a conversão Float32/ordem inicial não coincide com a fonte: ${JSON.stringify(matches)}`);
  const effectiveParameters = {
    GNominal: G, GFloat32: Math.fround(G), epsilonNominal: r.config.epsilon,
    epsilonSquaredFloat32: Math.fround(r.config.epsilon * r.config.epsilon), dtFloat32: Math.fround(r.config.dt),
    nominalDurationMyr: duration, sumOfFloat32StepParametersMyr: Math.round(duration / r.config.dt) * Math.fround(r.config.dt),
  };
  const raw = [], effectiveRaw = [], directSnapshots = [];
  for (const checkpoint of r.particleStates.toSorted((a, b) => a.timeMyr - b.timeMyr)) {
    const wall = performance.now(), s = state(r, checkpoint, subpopulations);
    const conservation = validationSnapshot(s, { ...r.config, energyAlgorithm: 'direct' });
    raw.push(conservation);
    const effectiveHamiltonianSnapshot = validationSnapshot(s, { ...r.config, G: effectiveParameters.GFloat32, epsilon: Math.sqrt(effectiveParameters.epsilonSquaredFloat32), energyAlgorithm: 'direct' });
    effectiveRaw.push(effectiveHamiltonianSnapshot);
    const bhEstimate = validationSnapshot(s, { ...r.config, energyAlgorithm: 'barnes-hut' });
    const structure = structural(s, conservation);
    directSnapshots.push({ conservation, effectiveHamiltonianSnapshot,
      effectiveVersusNominal: {
        energyDifference: effectiveHamiltonianSnapshot.energy - conservation.energy,
        selfPotentialDifference: effectiveHamiltonianSnapshot.selfPotential - conservation.selfPotential,
        energyDifferenceRelativeToNominal: conservation.energy ? (effectiveHamiltonianSnapshot.energy - conservation.energy) / Math.abs(conservation.energy) : null,
        qualification: 'Same rounded particle state; only G and epsilon-squared coefficients differ. GPU rounding of individual force/integration operations is not represented by one exact Hamiltonian.',
      }, bhEstimate,
      bhVsDirect: { bhEnergyDifferenceRelativeToDirectU: conservation.selfPotential ? (bhEstimate.selfPotential - conservation.selfPotential) / Math.abs(conservation.selfPotential) : null,
        totalEnergyDifferenceRelativeToDirectE: conservation.energy ? (bhEstimate.energy - conservation.energy) / Math.abs(conservation.energy) : null },
      structure, checkpointSHA256: hash(JSON.stringify(checkpoint)), analysisWallMs: performance.now() - wall,
    });
    console.log(JSON.stringify({ run: r.id, n: r.config.n, dt: r.config.dt, durationMyr: duration, timeMyr: checkpoint.timeMyr, energy: conservation.energy, wallMs: Math.round(performance.now() - wall) }));
  }
  for (const checkpoint of directSnapshots) {
    checkpoint.conservation = conservationSample(checkpoint.conservation, raw[0]);
    checkpoint.effectiveHamiltonianSnapshot = conservationSample(checkpoint.effectiveHamiltonianSnapshot, effectiveRaw[0]);
  }
  const directSummary = summarizeConservationSeries(raw), effectiveDirectSummary = summarizeConservationSeries(effectiveRaw), stateComparison = await compareCpu(r);
  const isDenseDirect = r.config.n <= 1000;
  if (isDenseDirect && (r.conservation.energyApproximate || r.conservation.sampleIntervalMax > r.config.dt * (1 + 1e-9))) throw new Error(`${path}: diagnóstico denso não corresponde à energia direta em cada passo.`);
  const analysis = {
    schema: 'gpu-analysis-101', id: r.id, status: 'completed', origin: 'new-integration-1.0.1', config: r.config, source: r.source,
    provenance: { gpuRunPath: path, gpuRunSHA256: hash(bytes), sourceSHA256: r.sourceSHA256, sourceHashes: r.sourceHashes, adapter: r.adapter,
      initialUploadFloat32Verified: matches, code: identity, newIntegrationInAnalysis: false,
      populationLabels: 'Fixed per-particle thin/thick IDs from the SHA-256 verified source snapshot, matched against actual Float32 initial state.',
    },
    directSnapshots, directSummary, effectiveParameters, effectiveDirectSummary, denseEnergySummary: r.conservation,
    denseEnergyKind: isDenseDirect ? 'direct-Float64-Hamiltonian-every-GPU-step' : 'Barnes-Hut-Float64-estimate-at-recorded-cadence',
    denseEnergyHamiltonian: 'Nominal G and epsilon; actual rounded GPU state/masses. Effective-parameter direct Hamiltonian measured separately only at saved full states.',
    denseEnergySeriesSource: `${path}#energySeries`, stateComparison,
    qualification: [
      'New completed v1.0.1 GPU Float32 integration; analysis itself performs no additional integration and never changes the preserved run.',
      'Float64 direct diagnostics evaluate the actual rounded GPU state and masses. They do not upgrade its trajectory precision.',
      'Nominal and effective coefficient Hamiltonians are distinguished: GPU uniforms round G, epsilon-squared and dt to Float32. Rounded per-operation force/integration arithmetic does not exactly follow either analytic Hamiltonian.',
      'Sparse direct maxima are lower bounds on the maximum between saved full states. N=1000 additionally has direct energy at every GPU step in denseEnergySummary; larger-N dense diagnostics remain approximate.',
      'Thin/thick structural measurements include independent fitted planes and radial rings; energy conservation alone does not establish structural equilibrium.',
    ],
  };
  const outputPath = `gpu-analysis-${r.id}.json`;
  await save(outputPath, analysis);
  results.push({ id: r.id, path: outputPath, origin: analysis.origin, config: r.config, directSummary, effectiveParameters, effectiveDirectSummary, denseEnergySummary: r.conservation,
    denseEnergyKind: analysis.denseEnergyKind, stateComparison,
    initialPopulationH50: Object.fromEntries(['thin', 'thick'].map(name => [name, directSnapshots[0].structure.populations[name].instant?.h50 ?? null])),
    finalPopulationH50: Object.fromEntries(['thin', 'thick'].map(name => [name, directSnapshots.at(-1).structure.populations[name].instant?.h50 ?? null])),
  });
}
if (!results.length) throw new Error('Nenhuma integração GPU concluída foi analisada.');
await save(onlyRun ? `gpu-analysis-summary-${onlyRun}.json` : 'gpu-analysis-summary.json', { schema: 'gpu-analysis-summary-101', origin: 'new-integration-1.0.1', analyzedRuns: results.length, analyzedStates: results.reduce((sum, row) => sum + row.directSummary.samples, 0), runs: results, wallMs: performance.now() - started });
console.log(JSON.stringify({ completed: results.length, wallMs: performance.now() - started }));
