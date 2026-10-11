import { directPotentialEnergy, barnesHutPotentialEnergy, validateState } from './forces.js';

const length = a => Math.hypot(...a);
const difference = (a, b) => a.map((v, i) => v - b[i]);

/** Conservation diagnostics use the same softened potential as integration. */
export function diagnostics(state, options = {}) {
  validateState(state);
  const { n, positions: p, velocities: v, masses: m, components: c } = state;
  if (!(v instanceof Float64Array) || v.length !== 3 * n) throw new TypeError('Velocidades inválidas para diagnóstico.');
  let mass = 0, kinetic = 0, momentumScale = 0, angularMomentumScale = 0;
  const centerOfMass = [0, 0, 0], momentum = [0, 0, 0], angularMomentum = [0, 0, 0];
  const components = [];
  for (let i = 0; i < n; i++) {
    const k = 3 * i, mi = m[i], id = c?.[i] ?? 0;
    const comp = components[id] ??= { id, count: 0, mass: 0, center: [0, 0, 0], rmsRadius: 0, rmsHeight: 0, velocityRms: 0 };
    comp.count++; comp.mass += mi; mass += mi;
    const speed2 = v[k] * v[k] + v[k + 1] * v[k + 1] + v[k + 2] * v[k + 2];
    if (!Number.isFinite(speed2)) throw new RangeError('Velocidade não finita. Reduza o passo temporal.');
    kinetic += 0.5 * mi * speed2;
    comp.velocityRms += mi * speed2;
    momentumScale += mi * Math.sqrt(speed2);
    const lx = mi * (p[k + 1] * v[k + 2] - p[k + 2] * v[k + 1]);
    const ly = mi * (p[k + 2] * v[k] - p[k] * v[k + 2]);
    const lz = mi * (p[k] * v[k + 1] - p[k + 1] * v[k]);
    angularMomentum[0] += lx; angularMomentum[1] += ly; angularMomentum[2] += lz;
    angularMomentumScale += Math.hypot(lx, ly, lz);
    for (let axis = 0; axis < 3; axis++) {
      centerOfMass[axis] += mi * p[k + axis];
      comp.center[axis] += mi * p[k + axis];
      momentum[axis] += mi * v[k + axis];
    }
  }
  if (mass > 0) for (let axis = 0; axis < 3; axis++) centerOfMass[axis] /= mass;
  for (const comp of components) {
    if (!comp) continue;
    if (comp.mass > 0) {
      comp.center = comp.center.map(x => x / comp.mass);
      comp.velocityRms = Math.sqrt(comp.velocityRms / comp.mass);
    }
  }
  for (let i = 0; i < n; i++) {
    const k = 3 * i, comp = components[c?.[i] ?? 0];
    const dx = p[k] - comp.center[0], dy = p[k + 1] - comp.center[1], dz = p[k + 2] - comp.center[2];
    comp.rmsRadius += m[i] * (dx * dx + dy * dy + dz * dz);
    comp.rmsHeight += m[i] * dz * dz;
  }
  for (const comp of components) {
    if (!comp || !comp.mass) continue;
    comp.rmsRadius = Math.sqrt(comp.rmsRadius / comp.mass);
    comp.rmsHeight = Math.sqrt(comp.rmsHeight / comp.mass);
  }
  const algorithm = options.algorithm ?? 'direct';
  if (!['direct', 'barnes-hut'].includes(algorithm)) throw new RangeError('Algoritmo gravitacional desconhecido para diagnóstico.');
  const approximate = algorithm === 'barnes-hut' && (options.theta ?? 0.5) > 0;
  const potential = algorithm === 'direct' ? directPotentialEnergy(state, options) : barnesHutPotentialEnergy(state, options);
  return { mass, centerOfMass, momentum, angularMomentum, momentumScale, angularMomentumScale,
    kinetic, potential, energy: kinetic + potential, energyApproximate: approximate, algorithm, components: components.filter(Boolean) };
}

/** Zero net momentum is normalized by sum m|v|, not by |P0|. */
export function conservationError(current, reference) {
  return {
    energy: Math.abs(current.energy - reference.energy) / Math.max(Math.abs(reference.energy), Number.MIN_VALUE),
    momentum: length(difference(current.momentum, reference.momentum)) / Math.max(reference.momentumScale, Number.MIN_VALUE),
    angularMomentum: length(difference(current.angularMomentum, reference.angularMomentum)) / Math.max(reference.angularMomentumScale, Number.MIN_VALUE),
    mass: Math.abs(current.mass - reference.mass) / Math.max(reference.mass, Number.MIN_VALUE),
    energyApproximate: current.energyApproximate || reference.energyApproximate,
  };
}
