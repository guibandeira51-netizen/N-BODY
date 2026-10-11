import { G as DEFAULT_G } from './constants.js';
import { directAccelerations, barnesHutAccelerations, validateState } from './forces.js';

/** Fixed physical timestep, independent of render FPS: Kick–Drift–Kick. */
export class Leapfrog {
  constructor(state, { algorithm = 'direct', epsilon = 0.1, theta = 0.5, dt = 0.05, G = DEFAULT_G } = {}) {
    validateState(state);
    if (!(state.velocities instanceof Float64Array) || state.velocities.length !== 3 * state.n ||
        !(state.accelerations instanceof Float64Array) || state.accelerations.length !== 3 * state.n) {
      throw new TypeError('Velocidades e acelerações devem usar Float64Array de tamanho 3N.');
    }
    if (!Number.isFinite(dt) || dt <= 0) throw new RangeError('O passo temporal deve ser finito e positivo.');
    if (!['direct', 'barnes-hut'].includes(algorithm)) throw new RangeError('Algoritmo gravitacional desconhecido.');
    this.state = state;
    this.algorithm = algorithm;
    this.options = { epsilon, theta, G };
    this.dt = dt;
    this.time = Number(state.time ?? 0);
    this.steps = 0;
    this.lastStepMs = 0;
    this.initialized = false;
  }

  force() {
    return (this.algorithm === 'direct' ? directAccelerations : barnesHutAccelerations)(this.state, this.options);
  }

  initialize() {
    this.force();
    this.initialized = true;
    return this.state;
  }

  step(count = 1) {
    if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('Quantidade de passos deve ser um inteiro não negativo.');
    if (!this.initialized) this.initialize();
    const start = performance.now();
    const { positions: p, velocities: v, accelerations: a } = this.state;
    const dt = this.dt, half = dt * 0.5;
    for (let s = 0; s < count; s++) {
      for (let k = 0; k < p.length; k++) {
        v[k] += half * a[k];
        p[k] += dt * v[k];
      }
      this.force();
      for (let k = 0; k < p.length; k++) v[k] += half * a[k];
      this.steps++;
    }
    this.time += dt * count;
    this.state.time = this.time;
    this.lastStepMs = count ? (performance.now() - start) / count : 0;
    return this.state;
  }
}
