import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createGalaxy, sampleHernquist, sampleDisk, sampleHalo, seededRandom } from '../src/physics/initial.js';
import { MODEL, RHO_CRITICAL } from '../src/physics/constants.js';
import { analyticAcceleration, analyticPotential, R200, HALO_OUTER_RADIUS, HALO_TOTAL_MASS } from '../src/physics/models.js';
import { structureDiagnostics } from '../src/physics/structure-diagnostics.js';

// Export Monte Carlo counts, then independently integrate density in Python:
// node scripts/audit-spatial.mjs
// python scripts/audit-spatial-independent.py
const count = Number(process.env.SPATIAL_SAMPLE_COUNT ?? 100000);
const galaxyCount = Number(process.env.SPATIAL_GALAXY_COUNT ?? 100000);
const seeds = [2026, 2027, 2028];
if (!Number.isSafeInteger(count) || count < 1 || !Number.isSafeInteger(galaxyCount) || galaxyCount < 3) throw Error('Invalid sample counts.');
const radialEdges = [0, 1, 2, 4, 8, 16, 32, 64, null];
const heightEdges = [0, 0.1, 0.28, 0.56, 1.12, 2.24, 4.48, 8.96, null];
const cdfRadii = [[0.1, 0.5, 1, 1 + Math.SQRT2, 4, 8, 16, 32, 100, 300, 1000, 10000], [], [0.1, 1, 5, 15.62, 30, 60, 100, 150, R200, HALO_OUTER_RADIUS]];
const index = (value, boundaries) => { let i = 0; while (i + 1 < boundaries.length - 1 && value >= boundaries[i + 1]) i++; return i; };
const samplers = [sampleHernquist, sampleDisk, sampleHalo];
const report = { schema: 1, createdAt: new Date().toISOString(), stage: 'historical-0.6.0-spatial-audit',
  qualification: 'Independent direct sampler draws test the full joint spatial distribution. Full galaxy diagnostics separately retain antipodal pairing, recentering, and historical velocities. No positions are removed or modified.',
  countPerIndependentComponentSample: count, galaxyCount, seeds, physicalParameters: MODEL, RHO_CRITICAL, R200, HALO_OUTER_RADIUS, HALO_TOTAL_MASS,
  radialEdges, heightEdges, cdfRadii, sourceSha256: {}, independentSamples: [], galaxyRealizations: [],
  derivation: { q: 'sqrt(z^2+b^2)', A: 'a+q', verticalDensity: 'p(z)=b^2/(2 q^3)',
    conditionalRadialSurvival: '(a/A) A/sqrt(R^2+A^2) + (q/A) A^3/(R^2+A^2)^(3/2)',
    fullJoint: 'p(z)*p(R|z)=2*pi*R*rho_MN(R,z)/M; azimuth is uniform',
    note: 'Analytic identity is checked against independent two-dimensional density integration, not just marginal empirical CDFs.' },
  scientificNotes: [
    'Hernquist and Miyamoto-Nagai spatial tails are untruncated; extreme radii are not discarded.',
    'Number and mass fractions coincide within each original equal-mass component but not across components.',
    'Per-particle potentials/virials in galaxyRealizations use the smooth analytic reference field, not a discrete softened N-body force. Half m Phi apportions continuum self energy; it is not a replacement for measured discrete conservation diagnostics.',
    'Antipodal partners do not double the independent spatial sample size. Main generator COM recentering matters for odd component counts.',
    'Global spatial moments can be dominated by heavy tails; quantile profiles and aperture-labelled measures are reported separately.',
  ] };
for (const name of ['initial', 'models', 'constants']) report.sourceSha256[name] = createHash('sha256').update(await readFile(new URL(`../src/physics/${name}.js`, import.meta.url))).digest('hex');
for (const seed of seeds) {
  for (let component = 0; component < 3; component++) {
    const rng = seededRandom(seed + 1000003 * component), cdfCounts = cdfRadii[component].map(() => 0);
    const jointCounts = Array.from({ length: radialEdges.length - 1 }, () => Array(heightEdges.length - 1).fill(0));
    let maximumRadius = 0;
    for (let i = 0; i < count; i++) {
      const [x, y, z] = samplers[component](rng), radius = Math.hypot(x, y, z);
      maximumRadius = Math.max(maximumRadius, radius);
      for (let j = 0; j < cdfCounts.length; j++) if (radius <= cdfRadii[component][j]) cdfCounts[j]++;
      if (component === 1) jointCounts[index(Math.hypot(x, y), radialEdges)][index(Math.abs(z), heightEdges)]++;
    }
    report.independentSamples.push({ seed, component, independentCount: count, maximumRadius, cdfCounts, jointCounts: component === 1 ? jointCounts : null });
  }
  const started = performance.now(), galaxy = createGalaxy({ n: galaxyCount, seed, withHalo: true });
  const acceleration = new Float64Array(3 * galaxy.n), potential = new Float64Array(galaxy.n);
  for (let i = 0; i < galaxy.n; i++) { const k = 3 * i, x = galaxy.positions[k], y = galaxy.positions[k + 1], z = galaxy.positions[k + 2]; acceleration.set(analyticAcceleration(x, y, z, true), k); potential[i] = analyticPotential(x, y, z, true); }
  const structure = structureDiagnostics(galaxy, { accelerations: acceleration, specificPotential: potential });
  report.galaxyRealizations.push({ seed, n: galaxy.n, meta: galaxy.meta, independentDrawsByComponent: galaxy.meta.counts.map(n => Math.ceil(n / 2)), referenceField: 'fixed analytic unsoftened full model', potentialWeight: 0.5, elapsedMs: performance.now() - started, structure });
  console.log(`Spatial counts and full initial diagnostics: seed ${seed}, N=${galaxyCount}.`);
}
const directory = new URL('../reports/equilibrium/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('spatial-samples.json', directory), JSON.stringify(report, null, 2));
console.log('Wrote reports/equilibrium/spatial-samples.json; run independent Python quadrature next.');
