import { G as DEFAULT_G } from './constants.js';
import { validateState, directAccelerations, barnesHutAccelerations, barnesHutPotentialEnergy } from './forces.js';
import { validateFixedHaloState, tableValue } from './fixed-halo.js';
import { assertExternalState, externalGridAt } from './external-grid.js';

/** Additive v1.0.1 diagnostics. Internal units: kpc, Myr, 10^10 Msun.
 * Energy units are 10^10 Msun kpc^2 Myr^-2; L units are 10^10 Msun kpc^2 Myr^-1.
 * All arithmetic below is JavaScript Float64. A Float32 trajectory read back into
 * Float64 remains a Float32 trajectory; this module cannot restore lost digits.
 * Existing integrators, forces, physical masses and historical outputs are untouched.
 */
const norm = value => Math.hypot(...value);
const subtract = (a, b) => a.map((x, k) => x - b[k]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function settings(options = {}) {
  const { G = DEFAULT_G, epsilon = 0.1, theta = 0.5 } = options;
  if (!(G > 0) || !Number.isFinite(G)) throw new RangeError('G deve ser finito e positivo.');
  if (!(epsilon >= 0) || !Number.isFinite(epsilon)) throw new RangeError('Suavização deve ser finita e não negativa.');
  if (!(theta >= 0) || !Number.isFinite(theta)) throw new RangeError('Theta deve ser finito e não negativo.');
  return { G, epsilon, theta };
}

function validateVelocities(state) {
  validateState(state);
  if (!(state.velocities instanceof Float64Array) || state.velocities.length !== 3 * state.n || !state.velocities.every(Number.isFinite)) {
    throw new TypeError('Velocidades devem ser Float64Array finito de tamanho 3N.');
  }
}

// Neumaier summation improves cancellation without changing the physical model.
function accumulator() {
  let total = 0, correction = 0;
  return {
    add(value) {
      const next = total + value;
      correction += Math.abs(total) >= Math.abs(value) ? (total - next) + value : (value - next) + total;
      total = next;
    },
    value: () => total + correction,
  };
}

/** Direct Float64 particle-pair oracle, i<j exactly once, no self interaction.
 * This is the finite Plummer particle Hamiltonian, not the continuum AGAMA
 * energy and not an exact real-arithmetic result. Cost O(N^2), memory O(1).
 */
export function directPotentialEnergy64(state, options = {}) {
  validateState(state);
  const { G, epsilon } = settings(options), eps2 = epsilon * epsilon;
  const { n, positions: p, masses: m } = state;
  let total = 0, correction = 0;
  for (let i = 0; i < n; i++) {
    if (m[i] === 0) continue;
    const a = 3 * i;
    for (let j = i + 1; j < n; j++) {
      if (m[j] === 0) continue;
      const b = 3 * j, dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], dz = p[b + 2] - p[a + 2];
      const radius = Math.sqrt(dx * dx + dy * dy + dz * dz + eps2);
      if (radius === 0) throw new RangeError('Partículas coincidentes exigem suavização positiva.');
      const pair = -G * m[i] * m[j] / radius, next = total + pair;
      correction += Math.abs(total) >= Math.abs(pair) ? (total - next) + pair : (pair - next) + total;
      total = next;
    }
  }
  const result = total + correction;
  if (!Number.isFinite(result)) throw new RangeError('Energia potencial excede a representação Float64.');
  return result;
}

/** Theoretical invariants require the stated force symmetries. BH directed
 * monopoles do not ensure pair antisymmetry or a common global Hamiltonian.
 * This is a statement of conditions, never a numerical validation certificate.
 */
export function conservationConditions({ external = false, externalSymmetry = 'axisymmetric', stationary = true, algorithm = 'direct', theta = 0.5, angularOriginAtFieldCenter = true } = {}) {
  if (!['direct', 'barnes-hut', 'gpu-f32'].includes(algorithm)) throw new RangeError('Algoritmo de integração desconhecido.');
  if (!['axisymmetric', 'spherical', 'none'].includes(externalSymmetry)) throw new RangeError('Simetria externa desconhecida.');
  const approximateForce = algorithm === 'barnes-hut' && theta > 0;
  return {
    system: external ? `fixed-${externalSymmetry}` : 'isolated',
    energy: !external || stationary,
    angularVector: !external || angularOriginAtFieldCenter && externalSymmetry === 'spherical',
    angularZ: !external || angularOriginAtFieldCenter && (externalSymmetry === 'spherical' || externalSymmetry === 'axisymmetric'),
    linearMomentum: !external,
    centerOfMassBallistic: !external,
    angularOrigin: external ? angularOriginAtFieldCenter ? 'fixed external-potential center' : 'origin differs from the external center; angular invariants are not asserted' : 'specified inertial origin; also report intrinsic COM angular momentum',
    forceCaveat: approximateForce
      ? 'Directed Barnes-Hut forces need not conserve pair momentum, torque or one global Hamiltonian; measure against direct snapshots.'
      : algorithm === 'gpu-f32'
        ? 'Float32 force and accumulation roundoff must be measured; Float64 readback diagnostics do not upgrade the trajectory precision.'
        : 'Ideal invariants assume pair-symmetric conservative forces; fixed-step KDK has bounded discretization error, not exact energy conservation.',
  };
}

/** Reusable snapshot. energyAlgorithm may be 'direct' while algorithm records
 * 'barnes-hut' or 'gpu-f32': evaluating the direct Hamiltonian of an approximate
 * trajectory is intentional. selfGravity=false is required for frozen-field
 * test particles (otherwise the same mass can be counted in field and particles).
 * Supply at most one of externalGrid, haloTable or externalPotential(x,y,z).
 * External contribution is sum m_i Phi_ext, WITHOUT one half. Grid extrapolation
 * is counted because the Kepler fallback may not join the tabulated Phi smoothly.
 * origin is fixed in the same inertial frame as positions; velocities are not
 * recentered or modified. intrinsicAngularMomentum removes COM orbital motion.
 */
export function validationSnapshot(state, options = {}) {
  validateVelocities(state);
  const forceSettings = settings(options);
  const algorithm = options.algorithm ?? 'direct';
  const energyAlgorithm = options.energyAlgorithm ?? (algorithm === 'gpu-f32' ? 'direct' : algorithm);
  if (!['direct', 'barnes-hut'].includes(energyAlgorithm)) throw new RangeError('Método energético desconhecido.');
  const selfGravity = options.selfGravity ?? true;
  const origin = options.origin ?? [0, 0, 0];
  if (origin.length !== 3 || !Array.from(origin).every(Number.isFinite)) throw new TypeError('Origem inercial deve conter três coordenadas finitas.');
  const externalCenter = options.externalCenter ?? [0, 0, 0];
  if (externalCenter.length !== 3 || !Array.from(externalCenter).every(Number.isFinite)) throw new TypeError('Centro externo deve conter três coordenadas finitas.');
  if ((options.externalGrid || options.haloTable) && externalCenter.some(value => value !== 0)) throw new Error('As tabelas externas existentes estão centradas na origem da simulação.');
  const externalChoices = [options.externalGrid, options.haloTable, options.externalPotential].filter(value => value != null);
  if (externalChoices.length > 1) throw new Error('Forneça um único potencial externo para evitar contagem duplicada.');
  const external = externalChoices.length === 1;
  if (options.externalGrid) assertExternalState(state, options.externalGrid);
  if (options.haloTable) validateFixedHaloState(state);
  if (options.externalPotential != null && typeof options.externalPotential !== 'function') throw new TypeError('Potencial externo deve ser uma função de x,y,z.');
  if (external && selfGravity && state.components?.some((c, i) => c === 2 && state.masses[i] > 0)) throw new Error('Halo externo não pode coexistir com partículas massivas de halo autogravitante.');
  const totalMass = accumulator(), kineticSum = accumulator(), externalSum = accumulator();
  const posSum = [accumulator(), accumulator(), accumulator()], momentumSum = [accumulator(), accumulator(), accumulator()];
  const angularSum = [accumulator(), accumulator(), accumulator()], momentumScaleSum = accumulator(), angularScaleSum = accumulator();
  let externalExtrapolated = 0;
  for (let i = 0; i < state.n; i++) {
    const k = 3 * i, mi = state.masses[i], p = Array.from(state.positions.subarray(k, k + 3)), v = Array.from(state.velocities.subarray(k, k + 3));
    const r = subtract(p, origin), l = cross(r, v).map(x => mi * x);
    totalMass.add(mi); kineticSum.add(0.5 * mi * (v[0] ** 2 + v[1] ** 2 + v[2] ** 2));
    momentumScaleSum.add(mi * norm(v)); angularScaleSum.add(norm(l));
    for (let axis = 0; axis < 3; axis++) { posSum[axis].add(mi * p[axis]); momentumSum[axis].add(mi * v[axis]); angularSum[axis].add(l[axis]); }
    if (external && mi > 0) {
      let phi;
      if (options.externalGrid) {
        const q = externalGridAt(options.externalGrid, ...p); phi = q.potential;
        externalExtrapolated += q.extrapolated ? 1 : 0;
      } else if (options.haloTable) phi = tableValue(options.haloTable, norm(p), 'potential');
      else phi = options.externalPotential(...p);
      if (!Number.isFinite(phi)) throw new RangeError('Potencial externo não finito.');
      externalSum.add(mi * phi);
    }
  }
  const mass = totalMass.value(), kinetic = kineticSum.value(), externalPotential = externalSum.value();
  const momentum = momentumSum.map(sum => sum.value()), angularMomentum = angularSum.map(sum => sum.value());
  const centerOfMass = mass > 0 ? posSum.map(sum => sum.value() / mass) : null;
  const centerOfMassVelocity = mass > 0 ? momentum.map(value => value / mass) : null;
  const intrinsicAngularMomentum = mass > 0 ? subtract(angularMomentum, cross(subtract(centerOfMass, origin), momentum)) : null;
  const selfPotential = !selfGravity ? 0 : energyAlgorithm === 'direct'
    ? directPotentialEnergy64(state, forceSettings) : barnesHutPotentialEnergy(state, forceSettings);
  const potential = selfPotential + externalPotential, energy = kinetic + potential;
  const time = state.time ?? 0;
  if (![mass, kinetic, externalPotential, selfPotential, energy, time, ...momentum, ...angularMomentum].every(Number.isFinite)) throw new RangeError('Diagnóstico contém valor não finito.');
  return {
    time, n: state.n, mass, kinetic, selfPotential, externalPotential, potential, energy,
    energyScale: Math.abs(kinetic) + Math.abs(selfPotential) + Math.abs(externalPotential),
    algorithm, energyAlgorithm, ...forceSettings, energyApproximate: selfGravity && energyAlgorithm === 'barnes-hut' && forceSettings.theta > 0,
    energyMethod: selfGravity ? energyAlgorithm === 'direct' ? 'direct-pairs-float64-compensated' : 'barnes-hut-directed-half-sum-float64' : external ? 'external-test-particles-potential-sum' : 'free-particles',
    externalPotentialModel: options.externalGrid?.modelId ?? (options.haloTable ? `fixed-halo-table-softening-${options.haloTable.softening}` : options.externalLabel ?? (external ? 'user-supplied-function' : null)),
    selfGravity, externalExtrapolated, momentum, momentumNorm: norm(momentum), momentumScale: momentumScaleSum.value(),
    centerOfMass, centerOfMassVelocity, angularMomentum, angularMomentumNorm: norm(angularMomentum), angularMomentumScale: angularScaleSum.value(),
    Lx: angularMomentum[0], Ly: angularMomentum[1], Lz: angularMomentum[2], Lnorm: norm(angularMomentum),
    intrinsicAngularMomentum, origin: Array.from(origin),
    conditions: conservationConditions({ external, externalSymmetry: options.haloTable ? 'spherical' : options.externalSymmetry ?? 'axisymmetric', stationary: options.stationary ?? true, algorithm, theta: forceSettings.theta, angularOriginAtFieldCenter: origin.every((value, k) => value === externalCenter[k]) }),
  };
}

export const conservationSnapshot = validationSnapshot;

function relativeSigned(difference, reference, scale) {
  return Math.abs(reference) > 64 * Number.EPSILON * Math.max(scale, Number.MIN_VALUE) ? difference / Math.abs(reference) : null;
}
function normalized(value, scale) { return scale > 0 ? value / scale : value === 0 ? 0 : null; }

/** Signed deltaE=(E-E0)/|E0|. Near cancellation, deltaE is null and the
 * scale-normalized error remains available. No clipping, abs or final-only
 * reduction hides the direction or earlier excursions. L and P also include
 * robust sum-of-individual-magnitudes normalization when their totals cancel.
 */
export function conservationSample(current, reference) {
  if (current.origin?.some((value, k) => value !== reference.origin?.[k])) throw new Error('Compare momentos angulares na mesma origem inercial.');
  for (const key of ['energyAlgorithm', 'selfGravity', 'G', 'epsilon', 'externalPotentialModel']) {
    if (current[key] !== reference[key]) throw new Error(`A definição da energia mudou entre amostras (${key}).`);
  }
  if (current.energyApproximate && current.theta !== reference.theta) throw new Error('Theta energético mudou entre amostras aproximadas.');
  const deltaEnergyAbsolute = current.energy - reference.energy;
  const deltaAngularMomentum = subtract(current.angularMomentum, reference.angularMomentum);
  const deltaMomentum = subtract(current.momentum, reference.momentum);
  const elapsed = current.time - reference.time;
  const centerOfMassDisplacement = current.centerOfMass && reference.centerOfMass ? norm(subtract(current.centerOfMass, reference.centerOfMass)) : null;
  const expectedCenter = reference.centerOfMass?.map((value, k) => value + elapsed * reference.centerOfMassVelocity[k]);
  const centerOfMassBallisticResidual = current.centerOfMass && expectedCenter ? norm(subtract(current.centerOfMass, expectedCenter)) : null;
  return {
    ...current,
    deltaEnergy: relativeSigned(deltaEnergyAbsolute, reference.energy, reference.energyScale),
    deltaEnergyAbsolute, deltaEnergyScaled: normalized(deltaEnergyAbsolute, reference.energyScale),
    deltaAngularMomentum, angularMomentumScaledError: normalized(norm(deltaAngularMomentum), reference.angularMomentumScale),
    angularMomentumRelativeError: relativeSigned(norm(deltaAngularMomentum), reference.angularMomentumNorm, reference.angularMomentumScale),
    deltaLz: current.Lz - reference.Lz,
    deltaLzRelative: relativeSigned(current.Lz - reference.Lz, reference.Lz, reference.angularMomentumScale),
    deltaLzScaled: normalized(current.Lz - reference.Lz, reference.angularMomentumScale),
    deltaMomentum, momentumScaledError: normalized(norm(deltaMomentum), reference.momentumScale),
    centerOfMassDisplacement, centerOfMassBallisticResidual,
  };
}

/** Maxima and oscillation statistics apply only to supplied measured samples.
 * Unsampled extrema may be larger; every integrator step can be sampled in the
 * inexpensive small reference tests. sampleIntervalMax exposes coarse gaps.
 */
export function summarizeConservationSeries(snapshots) {
  if (!snapshots.length) throw new RangeError('A série de conservação deve conter ao menos uma amostra.');
  const reference = snapshots[0], samples = snapshots.map(snapshot => conservationSample(snapshot, reference));
  for (let i = 1; i < samples.length; i++) if (!(samples[i].time > samples[i - 1].time)) throw new RangeError('Tempos das amostras devem ser estritamente crescentes.');
  const available = key => samples.map(sample => sample[key]).filter(value => value !== null && Number.isFinite(value));
  const maxAbs = key => { const values = available(key); return values.length ? values.reduce((max, value) => Math.max(max, Math.abs(value)), 0) : null; };
  const errors = available('deltaEnergy'), mean = errors.length ? errors.reduce((sum, value) => sum + value, 0) / errors.length : null;
  const minimum = errors.length ? errors.reduce((min, value) => Math.min(min, value), Infinity) : null, maximum = errors.length ? errors.reduce((max, value) => Math.max(max, value), -Infinity) : null;
  const intervals = samples.slice(1).map((sample, i) => sample.time - samples[i].time);
  return {
    samples: samples.length, initialTime: reference.time, finalTime: samples.at(-1).time,
    sampleIntervalMax: intervals.reduce((max, value) => Math.max(max, value), 0),
    finalEnergyError: samples.at(-1).deltaEnergy, maxAbsEnergyError: maxAbs('deltaEnergy'),
    minEnergyError: minimum, maxEnergyError: maximum, meanEnergyError: mean,
    energyErrorPeakToPeak: errors.length ? maximum - minimum : null,
    energyErrorRmsAboutMean: errors.length ? Math.sqrt(errors.reduce((sum, value) => sum + (value - mean) ** 2, 0) / errors.length) : null,
    maxAbsEnergyScaledError: maxAbs('deltaEnergyScaled'), maxAngularMomentumScaledError: maxAbs('angularMomentumScaledError'),
    maxAbsLzRelativeError: maxAbs('deltaLzRelative'), maxAbsLzScaledError: maxAbs('deltaLzScaled'),
    maxMomentumScaledError: maxAbs('momentumScaledError'), maxCenterOfMassDisplacement: maxAbs('centerOfMassDisplacement'),
    maxCenterOfMassBallisticResidual: maxAbs('centerOfMassBallisticResidual'),
    energyApproximate: snapshots.some(snapshot => snapshot.energyApproximate),
    externalExtrapolatedMax: snapshots.reduce((max, snapshot) => Math.max(max, snapshot.externalExtrapolated ?? 0), 0),
    scope: 'sampled instants only; conservation does not establish structural equilibrium',
  };
}

/** Compare the existing BH engine with the direct force and direct pair energy
 * on exactly the same state and epsilon. RMS is mass-weighted by default,
 * while unweighted RMS and maximum normalized absolute force error expose
 * low-mass/tracer behavior. Physical state and accelerations are not modified.
 */
export function compareGravityWithDirect(state, options = {}) {
  validateState(state);
  const configured = settings(options), exact = directAccelerations(state, configured, new Float64Array(3 * state.n));
  const approximate = barnesHutAccelerations(state, configured, new Float64Array(3 * state.n));
  const directPotential = directPotentialEnergy64(state, configured), approximatePotential = barnesHutPotentialEnergy(state, configured);
  let error2 = 0, reference2 = 0, weightedError2 = 0, weightedReference2 = 0, maximumError = 0, maximumReference = 0, zeroReferenceForceCount = 0;
  const relativeErrors = [];
  for (let i = 0; i < state.n; i++) {
    const k = 3 * i, e2 = (approximate[k] - exact[k]) ** 2 + (approximate[k + 1] - exact[k + 1]) ** 2 + (approximate[k + 2] - exact[k + 2]) ** 2;
    const a2 = exact[k] ** 2 + exact[k + 1] ** 2 + exact[k + 2] ** 2;
    error2 += e2; reference2 += a2; weightedError2 += state.masses[i] * e2; weightedReference2 += state.masses[i] * a2;
    maximumError = Math.max(maximumError, Math.sqrt(e2)); maximumReference = Math.max(maximumReference, Math.sqrt(a2));
    if (a2 > 0) relativeErrors.push(Math.sqrt(e2 / a2)); else zeroReferenceForceCount++;
  }
  relativeErrors.sort((a, b) => a - b);
  const quantile = probability => relativeErrors.length ? relativeErrors[Math.round(probability * (relativeErrors.length - 1))] : null;
  return {
    n: state.n, epsilon: configured.epsilon, theta: configured.theta, precision: 'Float64',
    directPotential, approximatePotential,
    signedRelativePotentialError: normalized(approximatePotential - directPotential, Math.abs(directPotential)),
    bhEnergyDifferenceRelativeToDirectU: normalized(approximatePotential - directPotential, Math.abs(directPotential)),
    relativeForceRms: normalized(Math.sqrt(error2), Math.sqrt(reference2)),
    massWeightedRelativeForceRms: normalized(Math.sqrt(weightedError2), Math.sqrt(weightedReference2)),
    maximumForceErrorOverMaximumReference: normalized(maximumError, maximumReference),
    forceAbsoluteRms: state.n ? Math.sqrt(error2 / state.n) : 0, forceAbsoluteMax: maximumError,
    relativeForceMedian: quantile(0.5), relativeForceP95: quantile(0.95), relativeForceP99: quantile(0.99), relativeForceMax: quantile(1), zeroReferenceForceCount,
    reference: 'direct Plummer pairs, Float64; same snapshot and epsilon; no self interaction',
  };
}
