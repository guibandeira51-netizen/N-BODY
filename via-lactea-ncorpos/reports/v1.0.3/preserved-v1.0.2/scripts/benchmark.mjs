import {createGalaxy} from '../src/physics/initial.js';
import {Leapfrog} from '../src/physics/integrator.js';
import {estimateTreeBytes, getBarnesHutStats} from '../src/physics/forces.js';
import {writeFile} from 'node:fs/promises';
import os from 'node:os';

const ns = process.argv.slice(2).map(Number);
if (!ns.length) ns.push(1000, 10000, 100000);
if (ns.some(n => !Number.isSafeInteger(n) || n < 3)) throw Error('N inválido: informe inteiros seguros com ao menos três corpos.');
const config = {seed: 2026, withHalo: true, dt: 0.1, epsilon: 0.1, theta: 0.5};
const warmupSteps = 2, sampleCount = 3, stepsPerSample = 3;
const reportPath = new URL('../reports/benchmark-cpu.json', import.meta.url);
const report = {
  dateUTC: new Date().toISOString(), runtime: process.version, platform: process.platform,
  cpu: os.cpus()[0]?.model, logicalProcessors: os.availableParallelism(), memoryBytes: os.totalmem(),
  config, warmupSteps, sampleCount, stepsPerSample,
  method: 'CPU Float64. Same freshly generated realization per N is cloned for each algorithm. Initial force and two real KDK warmup steps are excluded; stepMs is the median of three wall-clock samples, each containing three real KDK steps. Samples follow one evolving state; no timing is extrapolated.',
  timingExcludes: 'Initial-condition generation, state copying, initial force, warmup, diagnostics, rendering and file writes.',
  directBenchmarkPolicy: 'Direct CPU is measured only for N <= 10000 to contain quadratic benchmark cost; this is not a limit on the simulation engine.',
  qualification: 'Short performance measurement at one seed. Finite values do not establish equilibrium, conservation bounds or long-term stability.',
  results: [],
};
const persist = () => writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
await persist();

for (const n of ns) {
  // The original realization and one working copy coexist. The estimate excludes
  // the runtime, driver and other applications and uses a conservative tree size.
  const estimateFor = algorithm => 2 * 81 * n + (algorithm === 'barnes-hut' ? estimateTreeBytes(n) : 0);
  const availableBytes = os.freemem(), worstCaseBytes = estimateFor('barnes-hut');
  if (worstCaseBytes > availableBytes * 0.65 || n > 0xffffffff) {
    report.results.push({n, status: 'not_run', estimatedBytes: worstCaseBytes, availableBytes,
      reason: n > 0xffffffff ? 'N exceeds Uint32 tree indices.' : 'Estimated working memory exceeds 65% of currently free host memory.'});
    await persist(); continue;
  }
  const initialStart = performance.now(), initial = createGalaxy({n, ...config});
  const initialMs = performance.now() - initialStart;
  for (const algorithm of n <= 10000 ? ['direct', 'barnes-hut'] : ['barnes-hut']) {
    const estimatedBytes = estimateFor(algorithm);
    try {
      let started = performance.now(); const state = structuredClone(initial);
      const copyMs = performance.now() - started;
      const engine = new Leapfrog(state, {...config, algorithm});
      started = performance.now(); engine.initialize(); const forceMs = performance.now() - started;
      started = performance.now(); engine.step(warmupSteps); const warmupMs = performance.now() - started;
      const samples = [];
      for (let sample = 0; sample < sampleCount; sample++) {
        const timeStartMyr = engine.time, stepsStart = engine.steps;
        started = performance.now(); engine.step(stepsPerSample); const elapsedMs = performance.now() - started;
        samples.push({sample: sample + 1, steps: stepsPerSample, elapsedMs, stepMs: elapsedMs / stepsPerSample,
          stepsStart, stepsEnd: engine.steps, timeStartMyr, timeEndMyr: engine.time});
        console.log(JSON.stringify({status: 'sample_measured', n, algorithm, ...samples.at(-1)}));
      }
      const sorted = samples.map(s => s.stepMs).sort((a, b) => a - b);
      const finite = state.positions.every(Number.isFinite) && state.velocities.every(Number.isFinite);
      const entry = {n, algorithm, status: finite ? 'measured' : 'failed', precision: 'f64',
        initialMs, copyMs, forceMs, warmupMs, warmupSteps, sampleCount, stepsPerSample,
        stepMs: sorted[1], stepMsMean: samples.reduce((sum, s) => sum + s.stepMs, 0) / sampleCount,
        stepMsMin: sorted[0], stepMsMax: sorted[2], samples,
        steps: engine.steps, measuredSteps: sampleCount * stepsPerSample, physicalMyr: engine.time,
        measuredPhysicalMyr: sampleCount * stepsPerSample * config.dt, finite, estimatedBytes,
        rssBytes: process.memoryUsage().rss,
        tree: algorithm === 'barnes-hut' ? getBarnesHutStats(state) : null,
        initializationTiming: 'Shared per N; the first call also builds cached Jeans tables. It is not an algorithm performance comparison.',
        ...(finite ? {} : {reason: 'Final state contains nonfinite values.'}),
      };
      report.results.push(entry); console.log(JSON.stringify(entry));
      if (!finite) process.exitCode = 1;
    } catch (error) {
      const entry = {n, algorithm, status: 'failed', estimatedBytes, reason: String(error.message ?? error)};
      report.results.push(entry); console.log(JSON.stringify(entry)); process.exitCode = 1;
    }
    await persist();
  }
}
report.completedUTC = new Date().toISOString();
await persist();
