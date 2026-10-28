import { validateState } from './forces.js';

const RADII = [0, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
const HEIGHTS = [0, 0.05, 0.1, 0.2, 0.28, 0.4, 0.6, 1, 2, 4, 8, 16, 32, 64, 128, 256];
const PROBABILITIES = [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 0.999];
const zeros = () => [0, 0, 0];
const tensor = () => Array.from({ length: 3 }, zeros);
const norm = x => Math.hypot(...x);

function edges(values, name) {
  if (!Array.isArray(values) || values.length < 2 || values[0] !== 0 ||
      values.some((x, i) => !Number.isFinite(x) || x < 0 || (i && x <= values[i - 1]))) {
    throw new RangeError(`${name}: limites finitos crescentes, começando em zero, são necessários.`);
  }
  return values.slice();
}
function vector(values, name) {
  if (!values || values.length !== 3 || !Array.from(values).every(Number.isFinite)) throw new TypeError(`${name} inválido.`);
  return Array.from(values);
}
function measuredArray(values, length, name) {
  if (values == null) return null;
  if (!(values instanceof Float64Array) || values.length !== length || !values.every(Number.isFinite)) throw new TypeError(`${name} inválido.`);
  return values;
}
function binIndex(value, boundaries) {
  let lo = 0, hi = boundaries.length;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (boundaries[mid] <= value) lo = mid + 1; else hi = mid; }
  return lo - 1;
}
function distribution(records, key, probabilities, mass) {
  const sorted = records.slice().sort((a, b) => a[key] - b[key]);
  const number = {}, weighted = {};
  for (const q of probabilities) {
    const rank = q * (sorted.length - 1), lower = Math.floor(rank), upper = Math.ceil(rank);
    number[q] = sorted.length ? sorted[lower][key] + (rank - lower) * (sorted[upper][key] - sorted[lower][key]) : null;
  }
  // Compensated sums and a roundoff-sized boundary tolerance prevent equal-mass
  // samples from jumping an order statistic when q*M lands on a particle edge.
  let total=0,totalCorrection=0;
  for(const record of sorted){const value=record.mass-totalCorrection,next=total+value;totalCorrection=(next-total)-value;total=next;}
  let cumulative = 0, correction=0, index = 0;
  for (const q of probabilities.slice().sort((a, b) => a - b)) {
    if (!(mass > 0)) { weighted[q] = null; continue; }
    while (index < sorted.length && (cumulative < q * total-8*Number.EPSILON*total || cumulative === 0)) {
      const value=sorted[index++].mass-correction,next=cumulative+value;correction=(next-cumulative)-value;cumulative=next;
    }
    weighted[q] = sorted[Math.max(0, index - 1)][key];
  }
  return { number, mass: weighted, maximum: sorted.length ? sorted.at(-1)[key] : null };
}
function moments(records) {
  let mass = 0, massSquared = 0;
  const mean = zeros(), covariance = tensor();
  // Weighted online central moments avoid cancellation for cold, rotating populations.
  for (const record of records) {
    if (!record.cylindricalVelocity || !record.mass) continue;
    const nextMass = mass + record.mass, delta = record.cylindricalVelocity.map((x, k) => x - mean[k]);
    for (let k = 0; k < 3; k++) mean[k] += record.mass / nextMass * delta[k];
    for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) covariance[k][j] += record.mass * delta[k] * (record.cylindricalVelocity[j] - mean[j]);
    mass = nextMass;
    massSquared += record.mass ** 2;
  }
  if (!mass) return { mass: 0, mean: null, covariance: null, dispersion: null };
  return { mass, effectiveCount: mass * mass / massSquared, mean, covariance: covariance.map(row => row.map(x => x / mass)), dispersion: covariance.map((row, k) => Math.sqrt(Math.max(0, row[k] / mass))) };
}
function histogram(records, key, boundaries, measure) {
  const bins = boundaries.map((lower, i) => ({ lower, upper: boundaries[i + 1] ?? null, count: 0, mass: 0 }));
  for (const record of records) { const b = bins[binIndex(record[key], boundaries)]; b.count++; b.mass += record.mass; }
  return bins.map(b => {
    const size = b.upper == null ? null : measure(b.lower, b.upper);
    return { ...b, measure: size, density: size ? b.mass / size : null };
  });
}

/**
 * Non-mutating, component-resolved diagnostics in kpc, Myr and 1e10 Msun.
 * Quantities are about a fixed supplied origin, not an independently recentered
 * component. Number quantiles interpolate ranks; mass quantiles are the inverse
 * empirical mass CDF, including r50 (spherical) and R50 (cylindrical).
 * No force/potential calculation occurs here. Optional accelerations must be the
 * current measured field; specificPotential must exclude self terms for N-body
 * energy. potentialWeight=1/2 apportions pair energy across the two components;
 * use 1 only for a prescribed external test-particle field. W is r.a, not U for
 * softened gravity. Tensor virial residuals do not certify equilibrium, and
 * finite apertures have flux/surface terms not estimated by this module.
 */
export function structureDiagnostics(state, options = {}) {
  validateState(state);
  const { n, positions, velocities, masses, components } = state;
  measuredArray(velocities, 3 * n, 'Velocidades');
  if (velocities == null) throw new TypeError('Velocidades necessárias.');
  if (components != null && (!(components instanceof Uint8Array) || components.length !== n)) throw new TypeError('Componentes inválidas.');
  const origin = vector(options.origin ?? [0, 0, 0], 'Origem'), velocityOrigin = vector(options.velocityOrigin ?? [0, 0, 0], 'Velocidade da origem');
  const radialEdges = edges(options.radialEdges ?? RADII, 'Perfil radial');
  const cylindricalEdges = edges(options.cylindricalEdges ?? RADII, 'Perfil cilíndrico');
  const heightEdges = edges(options.heightEdges ?? HEIGHTS, 'Perfil vertical');
  const quantiles = Array.from(new Set([...(options.quantiles ?? PROBABILITIES), 0.5])).sort((a, b) => a - b);
  if (!quantiles.every(x => Number.isFinite(x) && x >= 0 && x <= 1)) throw new RangeError('Quantis devem estar entre zero e um.');
  const tailRadii = options.tailRadii ?? [30, 100, 300, 1000, 10000];
  if (!Array.isArray(tailRadii) || !tailRadii.every(x => Number.isFinite(x) && x >= 0)) throw new RangeError('Raios de cauda inválidos.');
  const verticalAperture = options.verticalAperture ?? 30;
  if (!(Number.isFinite(verticalAperture) && verticalAperture > 0)) throw new RangeError('A abertura do perfil vertical deve ser positiva e finita.');
  const accelerations = measuredArray(options.accelerations, 3 * n, 'Acelerações');
  const phi = measuredArray(options.specificPotential, n, 'Potencial específico');
  const potentialWeight = options.potentialWeight ?? 0.5;
  if (![0.5, 1].includes(potentialWeight)) throw new RangeError('O peso de energia potencial deve ser 0,5 (autogravitante) ou 1 (externo).');
  const groups = new Map();
  for (let i = 0; i < n; i++) {
    const k = 3 * i, id = components?.[i] ?? 0, mass = masses[i];
    if (!groups.has(id)) groups.set(id, []);
    const r = [positions[k] - origin[0], positions[k + 1] - origin[1], positions[k + 2] - origin[2]];
    const v = [velocities[k] - velocityOrigin[0], velocities[k + 1] - velocityOrigin[1], velocities[k + 2] - velocityOrigin[2]];
    const R = Math.hypot(r[0], r[1]);
    const angularMomentum = [mass * (r[1] * v[2] - r[2] * v[1]), mass * (r[2] * v[0] - r[0] * v[2]), mass * (r[0] * v[1] - r[1] * v[0])];
    groups.get(id).push({ mass, r, v, radius: norm(r), R, height: Math.abs(r[2]), angularMomentum,
      kinetic: 0.5 * mass * v.reduce((sum, x) => sum + x * x, 0),
      potential: phi ? potentialWeight * mass * phi[i] : null,
      a: accelerations ? [accelerations[k], accelerations[k + 1], accelerations[k + 2]] : null,
      cylindricalVelocity: R > 0 ? [(r[0] * v[0] + r[1] * v[1]) / R, (r[0] * v[1] - r[1] * v[0]) / R, v[2]] : null });
  }
  const output = [];
  for (const [id, records] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    let mass = 0, kinetic = 0, potential = phi ? 0 : null, angularMomentumScale = 0;
    const centerOfMass = zeros(), momentum = zeros(), angularMomentum = zeros(), kineticTensor = tensor(), virialTensor = accelerations ? tensor() : null;
    for (const record of records) {
      mass += record.mass; kinetic += record.kinetic; if (phi) potential += record.potential;
      angularMomentumScale += norm(record.angularMomentum);
      for (let k = 0; k < 3; k++) {
        centerOfMass[k] += record.mass * record.r[k]; momentum[k] += record.mass * record.v[k]; angularMomentum[k] += record.angularMomentum[k];
        for (let j = 0; j < 3; j++) {
          kineticTensor[k][j] += 0.5 * record.mass * record.v[k] * record.v[j];
          if (virialTensor) virialTensor[k][j] += record.mass * record.r[k] * record.a[j];
        }
      }
    }
    const spherical = distribution(records, 'radius', quantiles, mass), cylindrical = distribution(records, 'R', quantiles, mass), heights = distribution(records, 'height', quantiles, mass);
    const verticalRecords = records.filter(record => record.R < verticalAperture);
    const velocity = moments(records), W = virialTensor ? virialTensor.reduce((sum, row, i) => sum + row[i], 0) : null;
    output.push({ id, name: ['bulge', 'disk', 'halo'][id] ?? `component-${id}`, count: records.length, mass,
      particleMass: { minimum: records.reduce((smallest, x) => Math.min(smallest, x.mass), Infinity), maximum: records.reduce((largest, x) => Math.max(largest, x.mass), 0) },
      centerOfMass: mass > 0 ? centerOfMass.map((x, k) => x / mass + origin[k]) : null,
      centerOfMassRelative: mass > 0 ? centerOfMass.map(x => x / mass) : null,
      momentum, angularMomentum, angularMomentumScale, kinetic, potential, energy: phi ? kinetic + potential : null,
      r50: spherical.mass[0.5], R50: cylindrical.mass[0.5], medianRadius: spherical.number[0.5],
      medianAbsZ: heights.number[0.5], massMedianAbsZ: heights.mass[0.5],
      percentiles: { spherical, cylindrical, absoluteHeight: heights },
      velocity: { axes: ['R', 'phi', 'z'], ...velocity, axisParticleCountExcluded: records.filter(record => !record.cylindricalVelocity).length },
      profiles: {
        spherical: { coordinate: 'r', densityUnit: '1e10 Msun/kpc^3', bins: histogram(records, 'radius', radialEdges, (a, b) => 4 * Math.PI / 3 * (b ** 3 - a ** 3)) },
        cylindrical: { coordinate: 'R', densityUnit: '1e10 Msun/kpc^2', integratesAllHeights: true, bins: histogram(records, 'R', cylindricalEdges, (a, b) => Math.PI * (b ** 2 - a ** 2)) },
        vertical: { coordinate: '|z|', densityUnit: '1e10 Msun/kpc^3', cylindricalApertureKpc: verticalAperture,
          excludedMass: mass - verticalRecords.reduce((sum, record) => sum + record.mass, 0),
          bins: histogram(verticalRecords, 'height', heightEdges, (a, b) => 2 * Math.PI * verticalAperture ** 2 * (b - a)) },
        velocity: cylindricalEdges.map((lower, i) => {
          const upper = cylindricalEdges[i + 1] ?? null, subset = records.filter(record => record.R >= lower && (upper == null || record.R < upper));
          const m = subset.reduce((s, x) => s + x.mass, 0), meanZ = m ? subset.reduce((s, x) => s + x.mass * x.r[2], 0) / m : null;
          return { lower, upper, count: subset.length, ...moments(subset), h50: distribution(subset, 'height', [0.5], m).mass[0.5], meanZ,
            sigmaPositionZ: m ? Math.sqrt(subset.reduce((s, x) => s + x.mass * (x.r[2] - meanZ) ** 2, 0) / m) : null };
        }),
      },
      virial: { kineticTensor, forceTensor: virialTensor, W, twiceKOverNegativeW: W < 0 ? 2 * kinetic / -W : null,
        tensorResidual: virialTensor ? kineticTensor.map((row, i) => row.map((value, j) => 2 * value + 0.5 * (virialTensor[i][j] + virialTensor[j][i]))) : null },
      tails: tailRadii.map(radius => {
        const selected = records.filter(record => record.radius > radius), tailMass = selected.reduce((sum, record) => sum + record.mass, 0), tailKinetic = selected.reduce((sum, record) => sum + record.kinetic, 0), tailL = zeros();
        let tailLScale = 0, tailPotential = phi ? 0 : null;
        for (const record of selected) { tailLScale += norm(record.angularMomentum); for (let k = 0; k < 3; k++) tailL[k] += record.angularMomentum[k]; if (phi) tailPotential += record.potential; }
        return { radius, count: selected.length, numberFraction: selected.length / records.length, mass: tailMass, massFraction: mass ? tailMass / mass : null,
          kinetic: tailKinetic, kineticFraction: kinetic ? tailKinetic / kinetic : null, potential: tailPotential, potentialFraction: phi && potential ? tailPotential / potential : null,
          angularMomentum: tailL, angularMomentumScale: tailLScale, angularMomentumMagnitudeFraction: angularMomentumScale ? tailLScale / angularMomentumScale : null };
      }),
    });
  }
  return { n, units: { length: 'kpc', time: 'Myr', mass: '1e10 Msun', velocity: 'kpc/Myr', energy: '1e10 Msun kpc^2/Myr^2', angularMomentum: '1e10 Msun kpc^2/Myr' },
    frame: { origin, velocityOrigin }, conventions: { numberQuantiles: 'linear interpolation of order-statistic ranks', massQuantiles: 'inverse empirical mass CDF; no rank interpolation',
      potential: phi ? `sum ${potentialWeight} m_i Phi_i; caller supplied field` : 'not evaluated; provide current specificPotential explicitly',
      virial: accelerations ? 'W_ij = sum m r_i a_j from caller supplied current field; surface terms not estimated' : 'force virial not evaluated; provide current accelerations explicitly',
      overflowBins: 'upper=null includes all radii above the last edge; density is undefined there',
      cylindricalAxis: 'R=0 particles omitted from cylindrical velocity moments only' }, components: output };
}
