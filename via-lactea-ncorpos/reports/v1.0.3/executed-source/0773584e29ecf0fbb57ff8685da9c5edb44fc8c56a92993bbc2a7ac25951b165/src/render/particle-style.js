/** Display weights for the same physical particles in WebGL and WebGPU.
 * These values control legibility; they are neither luminosities nor a density
 * estimator. Exposure compensates large component counts and relaxes on zoom.
 * Halo symbols are hollow, to distinguish modeled dark matter from stars.
 */
export const PARTICLE_STYLE = Object.freeze({
  pointSize: 3,
  depthReference: 75,
  minDepthScale: 0.65,
  maxDepthScale: 1.65,
  maxOpacityDepth: 1.15,
  maxPixelRatio: 2,
  components: Object.freeze([
    Object.freeze({ color: Object.freeze([1, 0.741176, 0.505882]), opacity: 0.22, diameter: 0.85, referenceCount: 300 }),
    Object.freeze({ color: Object.freeze([0.862745, 0.917647, 1]), opacity: 0.68, diameter: 1, referenceCount: 1800 }),
    Object.freeze({ color: Object.freeze([0.321569, 0.713725, 0.784314]), opacity: 0.18, diameter: 0.62, referenceCount: 1000 }),
  ]),
});

export const ALL_VISIBLE = Object.freeze([true, true, true]);

/** Counts describe component labels, independently of their physical masses. */
export function countPackedComponents(data) {
  if (!(data instanceof Float32Array) || data.length % 4 !== 0) throw new TypeError('Partículas visuais requerem Float32Array [x, y, z, componente].');
  const counts = [0, 0, 0];
  for (let offset = 3; offset < data.length; offset += 4) {
    const component = data[offset];
    if (!Number.isInteger(component) || component < 0 || component > 2) throw new RangeError('Componente visual deve ser 0, 1 ou 2.');
    counts[component]++;
  }
  return counts;
}

/** Missing metadata means no count normalization, rather than invented counts. */
export function componentExposure(counts, n) {
  if (counts == null) return new Float32Array([1, 1, 1]);
  if (counts.length !== 3 || !Array.from(counts).every(c => Number.isSafeInteger(c) && c >= 0)) throw new RangeError('Contagens visuais precisam ter três inteiros não negativos.');
  if (n != null && counts[0] + counts[1] + counts[2] !== n) throw new RangeError('Contagens visuais devem somar N.');
  return Float32Array.from(counts, (count, c) => Math.min(1, PARTICLE_STYLE.components[c].referenceCount / Math.max(1, count)));
}

export function renderPixelRatio(value = globalThis.devicePixelRatio || 1) {
  return Math.max(1, Math.min(PARTICLE_STYLE.maxPixelRatio, Number.isFinite(value) && value > 0 ? value : 1));
}

/** JS counterpart of both vertex shaders, useful for checking display behavior. */
export function projectedParticleStyle(component, depthKpc, exposure = 1, pointSize = PARTICLE_STYLE.pointSize) {
  if (!Number.isInteger(component) || component < 0 || component > 2) throw new RangeError('Componente visual inválido.');
  const style = PARTICLE_STYLE.components[component];
  const ratio = PARTICLE_STYLE.depthReference / Math.max(depthKpc, 0.05);
  const depthScale = Math.max(PARTICLE_STYLE.minDepthScale, Math.min(PARTICLE_STYLE.maxDepthScale, Math.sqrt(ratio)));
  const normalized = Math.min(1, exposure * Math.max(1, ratio * ratio));
  return { diameter: pointSize * style.diameter * depthScale, opacity: style.opacity * normalized * Math.min(depthScale, PARTICLE_STYLE.maxOpacityDepth) };
}

/** Stable decimal literals shared by GLSL/WGSL source generation. */
export function shaderFloat(value) { return Number.isInteger(value) ? `${value}.0` : String(value); }
