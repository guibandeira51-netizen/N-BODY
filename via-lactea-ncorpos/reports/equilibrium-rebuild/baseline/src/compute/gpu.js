import { G as DEFAULT_G, KM_S_TO_KPC_MYR } from '../physics/constants.js';
import { directAccelerations, validateState } from '../physics/forces.js';
import { Leapfrog } from '../physics/integrator.js';
import { createGalaxy } from '../physics/initial.js';
import { diagnostics, conservationError } from '../physics/diagnostics.js';
import { assessResources, defaultBudgetBytes, serializeLimits } from './capability.js';
import {physicalEpoch} from '../physics/physical-time.js';

export const WORKGROUP_SIZE = 64;
export const FORCE_WGSL = /* wgsl */`
struct Params { n: u32, groupsX: u32, epsilon2: f32, gravity: f32, dt: f32, pad0: f32, pad1: f32, pad2: f32 };
@group(0) @binding(0) var<storage, read> positions: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> accelerations: array<vec4<f32>>;
@group(0) @binding(3) var<uniform> params: Params;
var<workgroup> tile: array<vec4<f32>, 64>;

@compute @workgroup_size(64)
fn force(@builtin(workgroup_id) group: vec3<u32>, @builtin(local_invocation_index) lane: u32) {
  let i = (group.y * params.groupsX + group.x) * 64u + lane;
  let validParticle = i < params.n;
  var own = vec3<f32>(0.0);
  if (validParticle) { own = positions[i].xyz; }
  var acceleration = vec3<f32>(0.0);
  for (var base = 0u; base < params.n; base += 64u) {
    let source = base + lane;
    if (source < params.n) { tile[lane] = positions[source]; }
    else { tile[lane] = vec4<f32>(0.0); }
    // Every invocation, including the partial last group, executes both barriers.
    workgroupBarrier();
    if (validParticle) {
      let tileCount = min(64u, params.n - base);
      for (var k = 0u; k < tileCount; k++) {
        if (base + k != i) {
          let displacement = tile[k].xyz - own;
          let r2 = dot(displacement, displacement) + params.epsilon2;
          let invR = inverseSqrt(r2);
          acceleration += displacement * (params.gravity * tile[k].w * invR * invR * invR);
        }
      }
    }
    workgroupBarrier();
  }
  if (validParticle) { accelerations[i] = vec4<f32>(acceleration, 0.0); }
}
`;

export const INTEGRATE_WGSL = /* wgsl */`
struct Params { n: u32, groupsX: u32, epsilon2: f32, gravity: f32, dt: f32, pad0: f32, pad1: f32, pad2: f32 };
@group(0) @binding(0) var<storage, read_write> positions: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> accelerations: array<vec4<f32>>;
@group(0) @binding(3) var<uniform> params: Params;
@compute @workgroup_size(64)
fn kickDrift(@builtin(workgroup_id) group: vec3<u32>, @builtin(local_invocation_index) lane: u32) {
  let i = (group.y * params.groupsX + group.x) * 64u + lane;
  if (i >= params.n) { return; }
  let velocity = velocities[i].xyz + 0.5 * params.dt * accelerations[i].xyz;
  positions[i] = vec4<f32>(positions[i].xyz + params.dt * velocity, positions[i].w);
  velocities[i] = vec4<f32>(velocity, velocities[i].w);
}
@compute @workgroup_size(64)
fn finalKick(@builtin(workgroup_id) group: vec3<u32>, @builtin(local_invocation_index) lane: u32) {
  let i = (group.y * params.groupsX + group.x) * 64u + lane;
  if (i >= params.n) { return; }
  velocities[i] = vec4<f32>(velocities[i].xyz + 0.5 * params.dt * accelerations[i].xyz, velocities[i].w);
}
`;

export async function checkedShader(device, code, label) {
  const module = device.createShaderModule({ label, code });
  if (typeof module.getCompilationInfo === 'function') {
    const info = await module.getCompilationInfo();
    const errors = info.messages.filter(message => message.type === 'error');
    if (errors.length) throw new Error(`${label}: ${errors.map(e => `${e.lineNum}:${e.linePos} ${e.message}`).join('; ')}`);
  }
  return module;
}

export class GPUBackend {
  static async create(adapter, onLost) {
    if (!globalThis.navigator?.gpu) throw new Error('WebGPU não está disponível neste navegador/contexto.');
    adapter ??= await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('O navegador não forneceu um adaptador WebGPU.');
    const limits = serializeLimits(adapter.limits);
    if (limits.maxComputeWorkgroupSizeX < 64 || limits.maxComputeInvocationsPerWorkgroup < 64 || limits.maxComputeWorkgroupStorageSize < 1024)
      throw new Error('Limites do adaptador insuficientes para o kernel direto.');
    const device = await adapter.requestDevice({ requiredLimits: {
      maxBufferSize: limits.maxBufferSize,
      maxStorageBufferBindingSize: limits.maxStorageBufferBindingSize,
      maxComputeWorkgroupsPerDimension: limits.maxComputeWorkgroupsPerDimension,
    } });
    const backend = new this(device, adapter, onLost);
    try { await backend.createPipelines(); }
    catch (error) { backend.dispose(); throw error; }
    return backend;
  }

  constructor(device, adapter, onLost) {
    this.device = device; this.adapter = adapter; this.limits = serializeLimits(device.limits);
    this.n = 0; this.steps = 0; this.time = 0; this.lastStepMs = 0; this.initialized = false; this.disposed = false;
    this.error = null; this.busy = false; this.meta = null;
    device.addEventListener('uncapturederror', event => { this.error = event.error; onLost?.(event.error); });
    device.lost.then(info => { if (!this.disposed) { this.error = new Error(`Dispositivo GPU perdido: ${info.reason} ${info.message}`); onLost?.(this.error); } });
  }

  async createPipelines() {
    const device = this.device;
    device.pushErrorScope('validation');
    try {
      const force = await checkedShader(device, FORCE_WGSL, 'Força direta Plummer f32');
      const integrate = await checkedShader(device, INTEGRATE_WGSL, 'Leapfrog KDK f32');
      this.forceLayout = device.createBindGroupLayout({ entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ] });
      this.integrateLayout = device.createBindGroupLayout({ entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ] });
      const pipeline = (module, entryPoint, bindGroupLayout) => device.createComputePipelineAsync({
        label: entryPoint, layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }), compute: { module, entryPoint } });
      this.forcePipeline = await pipeline(force, 'force', this.forceLayout);
      this.kickDriftPipeline = await pipeline(integrate, 'kickDrift', this.integrateLayout);
      this.finalKickPipeline = await pipeline(integrate, 'finalKick', this.integrateLayout);
    } catch (error) { await device.popErrorScope(); throw error; }
    const validation = await device.popErrorScope();
    if (validation) throw new Error(`Validação WebGPU: ${validation.message}`);
  }

  assertReady() { if (this.disposed) throw new Error('Motor GPU foi descartado.'); if (this.error) throw this.error; }

  async initialize(state, { epsilon = 0.1, dt = 0.05, G = DEFAULT_G, budgetBytes = defaultBudgetBytes() } = {}) {
    this.assertReady();
    if (this.busy) throw new Error('Aguarde a operação GPU atual antes de reinicializar.');
    validateState(state);
    if (!(state.velocities instanceof Float64Array) || state.velocities.length !== 3 * state.n) throw new TypeError('Velocidades precisam ser Float64Array com 3N entradas.');
    if (!(state.components instanceof Uint8Array) || state.components.length !== state.n) throw new TypeError('Componentes precisam ser Uint8Array com N entradas.');
    const time = Number(state.time ?? 0);
    if (!Number.isFinite(time)) throw new RangeError('O tempo físico deve ser finito.');
    if (!Number.isFinite(epsilon) || epsilon < 0 || !Number.isFinite(dt) || dt <= 0 || !Number.isFinite(G) || G <= 0)
      throw new RangeError('epsilon ≥ 0, dt > 0 e G > 0 precisam ser finitos.');
    if (!Number.isFinite(Math.fround(epsilon * epsilon)) || (epsilon > 0 && Math.fround(epsilon * epsilon) === 0) || !Number.isFinite(Math.fround(G)) || !Number.isFinite(Math.fround(dt)) || Math.fround(dt) <= 0 || Math.fround(G) <= 0)
      throw new RangeError('Parâmetros fora da faixa f32 representável.');
    const admission = assessResources(state.n, { limits: this.limits }, { budgetBytes });
    if (!admission.admissible) throw new RangeError(admission.reasons.join(' '));
    const p = new Float32Array(4 * state.n), v = new Float32Array(4 * state.n), coincident = epsilon === 0 ? new Set() : null;
    for (let i = 0; i < state.n; i++) {
      for (let k = 0; k < 3; k++) { p[4 * i + k] = state.positions[3 * i + k]; v[4 * i + k] = state.velocities[3 * i + k]; }
      p[4 * i + 3] = state.masses[i]; v[4 * i + 3] = state.components[i];
      if (!p.subarray(4 * i, 4 * i + 4).every(Number.isFinite) || !v.subarray(4 * i, 4 * i + 4).every(Number.isFinite)) throw new RangeError('Estado fora da faixa f32.');
      if (state.masses[i] > 0 && p[4 * i + 3] === 0) throw new RangeError('Massa positiva arredondada a zero em f32.');
      if (state.components[i] < 0 || state.components[i] > 2) throw new RangeError('Componente deve ser 0, 1 ou 2.');
      if (coincident) { const key = `${p[4 * i]},${p[4 * i + 1]},${p[4 * i + 2]}`; if (coincident.has(key)) throw new RangeError('Coincidência em f32 exige suavização positiva.'); coincident.add(key); }
    }
    this.releaseBuffers();
    this.n = state.n; this.options = { epsilon, dt, G, budgetBytes }; this.dt = dt;
    this.effectiveParameters = { dt: Math.fround(dt), epsilonSquared: Math.fround(epsilon * epsilon), G: Math.fround(G), precision: 'f32' };
    this.meta = state.meta ? structuredClone(state.meta) : null; this.time = time; this.initialTime = time; this.steps = 0;
    this.dispatchX = Math.min(Math.max(1, Math.ceil(this.n / 64)), this.limits.maxComputeWorkgroupsPerDimension);
    this.dispatchY = Math.max(1, Math.ceil(Math.ceil(this.n / 64) / this.dispatchX));
    const size = admission.estimate.perStorageBufferBytes, device = this.device;
    device.pushErrorScope('out-of-memory'); device.pushErrorScope('validation');
    try {
      const storage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX;
      this.positionBuffer = device.createBuffer({ label: 'posições+massas GPU', size, usage: storage });
      this.velocityBuffer = device.createBuffer({ label: 'velocidades+componentes GPU', size, usage: storage });
      this.accelerationBuffer = device.createBuffer({ label: 'acelerações GPU', size, usage: storage });
      this.paramsBuffer = device.createBuffer({ label: 'parâmetros kpc Myr', size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const params = new ArrayBuffer(32), view = new DataView(params);
      view.setUint32(0, this.n, true); view.setUint32(4, this.dispatchX, true);
      view.setFloat32(8, epsilon * epsilon, true); view.setFloat32(12, G, true); view.setFloat32(16, dt, true);
      device.queue.writeBuffer(this.paramsBuffer, 0, params);
      if (this.n) { device.queue.writeBuffer(this.positionBuffer, 0, p); device.queue.writeBuffer(this.velocityBuffer, 0, v); }
      const entries = [this.positionBuffer, this.velocityBuffer, this.accelerationBuffer, this.paramsBuffer].map((buffer, binding) => ({ binding, resource: { buffer } }));
      this.forceBindGroup = device.createBindGroup({ layout: this.forceLayout, entries: this.forceEntries(entries) });
      this.integrateBindGroup = device.createBindGroup({ layout: this.integrateLayout, entries });
      const encoder = device.createCommandEncoder(); this.encodePass(encoder, this.forcePipeline, this.forceBindGroup);
      device.queue.submit([encoder.finish()]); await device.queue.onSubmittedWorkDone();
    } catch (error) { await device.popErrorScope(); await device.popErrorScope(); this.releaseBuffers(); throw error; }
    const validation = await device.popErrorScope(), oom = await device.popErrorScope();
    if (validation || oom) { this.releaseBuffers(); throw new Error(`Inicialização GPU: ${(validation ?? oom).message}`); }
    this.assertReady(); this.initialized = true; this.resourceEstimate = admission;
    return this;
  }

  encodePass(encoder, pipeline, bindGroup) {
    if (!this.n) return;
    const pass = encoder.beginComputePass(); pass.setPipeline(pipeline); pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(this.dispatchX, this.dispatchY); pass.end();
  }

  // Experimental external fields may add bindings; the ordinary backend is unchanged.
  forceEntries(entries) { return entries; }

  async step(count = 1) {
    this.assertReady(); if (!this.initialized) throw new Error('Inicialize o motor GPU primeiro.');
    if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('Quantidade de passos deve ser inteiro não negativo.');
    physicalEpoch(this.initialTime,this.steps+count,this.effectiveParameters.dt);
    if (this.busy) throw new Error('Passos GPU concorrentes não são permitidos.');
    this.busy = true; const start = performance.now();
    this.device.pushErrorScope('validation');
    try {
      // A separate pass ends the drift before force reads any positions, removing in-place races.
      for (let remaining = count; remaining > 0;) {
        const batch = Math.min(remaining, 32), encoder = this.device.createCommandEncoder();
        for (let s = 0; s < batch; s++) {
          this.encodePass(encoder, this.kickDriftPipeline, this.integrateBindGroup);
          this.encodePass(encoder, this.forcePipeline, this.forceBindGroup);
          this.encodePass(encoder, this.finalKickPipeline, this.integrateBindGroup);
        }
        this.device.queue.submit([encoder.finish()]); await this.device.queue.onSubmittedWorkDone();
        this.steps += batch; this.time = physicalEpoch(this.initialTime,this.steps,this.effectiveParameters.dt); remaining -= batch;
      }
      this.assertReady();
    } catch (error) { await this.device.popErrorScope(); throw error; }
    finally { this.busy = false; }
    const validation = await this.device.popErrorScope(); if (validation) throw new Error(`Passo GPU: ${validation.message}`);
    this.lastStepMs = count ? (performance.now() - start) / count : 0;
    return { steps: this.steps, time: this.time, lastStepMs: this.lastStepMs, n: this.n, precision: 'f32', algorithm: 'direct' };
  }

  async snapshot() {
    this.assertReady(); if (!this.initialized) throw new Error('Inicialize o motor GPU primeiro.');
    if (this.busy) throw new Error('Aguarde o passo GPU antes de ler diagnósticos.');
    this.busy = true; const size = Math.max(16, 16 * this.n), staging = [];
    try {
      const encoder = this.device.createCommandEncoder();
      for (const [label, source] of [['posição', this.positionBuffer], ['velocidade', this.velocityBuffer], ['aceleração', this.accelerationBuffer]]) {
        const buffer = this.device.createBuffer({ label: `snapshot ${label}`, size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        staging.push(buffer); encoder.copyBufferToBuffer(source, 0, buffer, 0, size);
      }
      this.device.queue.submit([encoder.finish()]);
      await Promise.all(staging.map(buffer => buffer.mapAsync(GPUMapMode.READ)));
      const [p, v, a] = staging.map(buffer => new Float32Array(buffer.getMappedRange()));
      const state = { n: this.n, positions: new Float64Array(3 * this.n), velocities: new Float64Array(3 * this.n),
        accelerations: new Float64Array(3 * this.n), masses: new Float64Array(this.n), components: new Uint8Array(this.n), time: this.time,
        meta: this.meta ? structuredClone(this.meta) : undefined };
      for (let i = 0; i < this.n; i++) {
        for (let k = 0; k < 3; k++) { state.positions[3 * i + k] = p[4 * i + k]; state.velocities[3 * i + k] = v[4 * i + k]; state.accelerations[3 * i + k] = a[4 * i + k]; }
        state.masses[i] = p[4 * i + 3]; state.components[i] = v[4 * i + 3];
      }
      if (![state.positions, state.velocities, state.accelerations].every(array => array.every(Number.isFinite))) throw new Error('Estado GPU contém valor não finito; reduza dt ou aumente a suavização.');
      return state;
    } finally { for (const buffer of staging) { if (buffer.mapState === 'mapped') buffer.unmap(); buffer.destroy(); } this.busy = false; }
  }

  releaseBuffers() { for (const key of ['positionBuffer', 'velocityBuffer', 'accelerationBuffer', 'paramsBuffer']) { this[key]?.destroy(); this[key] = null; } this.initialized = false; }
  dispose() { this.disposed = true; this.releaseBuffers(); this.device.destroy(); }
}

function fixture(n) {
  const state = { n, positions: new Float64Array(3 * n), velocities: new Float64Array(3 * n), accelerations: new Float64Array(3 * n), masses: new Float64Array(n), components: new Uint8Array(n) };
  let seed = 193743; const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < n; i++) { for (let k = 0; k < 3; k++) { state.positions[3 * i + k] = (random() - 0.5) * 12; state.velocities[3 * i + k] = (random() - 0.5) * 0.1; } state.masses[i] = (0.2 + random()) / n; state.components[i] = i % 3; }
  return state;
}
function arrayError(reference, actual) {
  let diff2 = 0, ref2 = 0, maxAbs = 0;
  for (let k = 0; k < reference.length; k++) { const d = actual[k] - reference[k]; diff2 += d * d; ref2 += reference[k] * reference[k]; maxAbs = Math.max(maxAbs, Math.abs(d)); }
  return { rmsRelative: Math.sqrt(diff2 / Math.max(ref2, 1e-300)), maxAbs };
}

function spatialErrors(reference, actual, initialRadius, initialCylindricalRadius) {
  const make = label => ({ label, count: 0, sumPositionSquared: 0, sumVelocitySquared: 0, maxPositionPc: 0, maxVelocityKmS: 0 });
  const components = [make('bojo'), make('disco'), make('halo')], inner = make('r esférico inicial < 30 kpc'), cylinder = make('R cilíndrico inicial < 30 kpc');
  for (let i = 0; i < reference.n; i++) {
    let p2 = 0, v2 = 0;
    for (let k = 0; k < 3; k++) {
      const d = actual.positions[3 * i + k] - reference.positions[3 * i + k];
      const dv = actual.velocities[3 * i + k] - reference.velocities[3 * i + k]; p2 += d * d; v2 += dv * dv;
    }
    const groups = [components[reference.components[i]]];
    if (initialRadius[i] < 30) groups.push(inner);
    if (initialCylindricalRadius[i] < 30) groups.push(cylinder);
    for (const group of groups) {
      group.count++; group.sumPositionSquared += p2; group.sumVelocitySquared += v2;
      group.maxPositionPc = Math.max(group.maxPositionPc, Math.sqrt(p2) * 1000);
      group.maxVelocityKmS = Math.max(group.maxVelocityKmS, Math.sqrt(v2) / KM_S_TO_KPC_MYR);
    }
  }
  const finish = ({ sumPositionSquared, sumVelocitySquared, ...group }) => ({ ...group,
    rmsPositionPc: group.count ? Math.sqrt(sumPositionSquared / group.count) * 1000 : null,
    rmsVelocityKmS: group.count ? Math.sqrt(sumVelocitySquared / group.count) / KM_S_TO_KPC_MYR : null });
  return { components: components.map(finish), innerSphere30Kpc: finish(inner), innerCylinder30Kpc: finish(cylinder),
    definition: 'RMS da norma vetorial por partícula, sem ponderação por massa. Seleção espacial usa a posição inicial CPU. Erros absolutos evitam que caudas externas grandes diluam o erro relativo global.' };
}

/** Browser-only measured comparison. Unavailable hardware returns an explicit skip. */
export async function compareCPUvsGPU(adapter, { n = 1024, steps = 8 } = {}) {
  if (!globalThis.navigator?.gpu) return { status: 'skipped', reason: 'WebGPU API indisponível; nenhum resultado GPU foi calculado.' };
  adapter ??= await navigator.gpu.requestAdapter();
  if (!adapter) return { status: 'skipped', reason: 'Adaptador WebGPU indisponível.' };
  let backend;
  try {
    backend = await GPUBackend.create(adapter);
    const options = { dt: 0.05, epsilon: 0.1 }, state = fixture(n);
    await backend.initialize(state, options);
    directAccelerations(state, options);
    const forceSnapshot = await backend.snapshot(), force = arrayError(state.accelerations, forceSnapshot.accelerations);
    const cpu = new Leapfrog(state, options); cpu.initialize(); cpu.step(steps);
    const timing = await backend.step(steps), gpu = await backend.snapshot();
    const position = arrayError(state.positions, gpu.positions), velocity = arrayError(state.velocities, gpu.velocities);
    // f32 summation of N terms vs Float64 pair order; thresholds bound this short deterministic fixture, not arbitrary duration.
    const tolerance = { forceRmsRelative: 5e-4, positionRmsRelative: 2e-5, velocityRmsRelative: 5e-4 };
    const passed = force.rmsRelative < tolerance.forceRmsRelative && position.rmsRelative < tolerance.positionRmsRelative && velocity.rmsRelative < tolerance.velocityRmsRelative;
    return { status: passed ? 'passed' : 'failed', n, steps, options, force, position, velocity, tolerance,
      gpuStepMs: timing.lastStepMs, cpuStepMs: cpu.lastStepMs, precision: { cpu: 'Float64', gpu: 'f32' },
      scope: 'Fixture determinística curta; inclui grupos parciais quando N não é múltiplo de 64. Não comprova estabilidade de longa duração.' };
  } catch (error) { return { status: 'failed', reason: String(error.message ?? error), n, steps }; }
  finally { backend?.dispose(); }
}

/** Same live three-component galaxy, with separate conservation baselines per precision. */
export async function compareGalaxyCPUvsGPU({ n = 1000, steps = 100, dt = 0.1, epsilon = 0.1, seed = 2026 } = {}) {
  if (!globalThis.navigator?.gpu) return { status: 'skipped', reason: 'WebGPU indisponível; comparação galáctica não executada.' };
  let backend;
  try {
    const state = createGalaxy({ n, seed, withHalo: true }), options = { dt, epsilon, G: DEFAULT_G };
    const initialRadius = new Float64Array(n), initialCylindricalRadius = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      initialRadius[i] = Math.hypot(state.positions[3 * i], state.positions[3 * i + 1], state.positions[3 * i + 2]);
      initialCylindricalRadius[i] = Math.hypot(state.positions[3 * i], state.positions[3 * i + 1]);
    }
    backend = await GPUBackend.create(); await backend.initialize(state, options);
    const initialGPU = await backend.snapshot(), initialCPU = diagnostics(state, options), initialGPUConservation = diagnostics(initialGPU, options);
    directAccelerations(state, options);
    const force = arrayError(state.accelerations, initialGPU.accelerations);
    const cpu = new Leapfrog(state, options); cpu.initialize(); cpu.step(steps);
    const timing = await backend.step(steps), gpu = await backend.snapshot();
    const position = arrayError(state.positions, gpu.positions), velocity = arrayError(state.velocities, gpu.velocities);
    const finalCPU = diagnostics(state, options), finalGPU = diagnostics(gpu, options);
    // Short 10 Myr default: looser than the 8-step fixture because f32 drift rounding accumulates.
    const tolerance = { forceRmsRelative: 1e-3, positionRmsRelative: 1e-4, velocityRmsRelative: 2e-3 };
    const passed = force.rmsRelative < tolerance.forceRmsRelative && position.rmsRelative < tolerance.positionRmsRelative && velocity.rmsRelative < tolerance.velocityRmsRelative;
    return { status: passed ? 'passed' : 'failed', n, seed, steps, physicalMyr: steps * dt, options, force, position, velocity, tolerance,
      spatialErrors: spatialErrors(state, gpu, initialRadius, initialCylindricalRadius), effectiveParameters: backend.effectiveParameters,
      conservation: { cpu: conservationError(finalCPU, initialCPU), gpu: conservationError(finalGPU, initialGPUConservation) },
      initial: { cpu: initialCPU, gpu: initialGPUConservation }, final: { cpu: finalCPU, gpu: finalGPU },
      gpuStepMs: timing.lastStepMs, cpuStepMs: cpu.lastStepMs, precision: { cpu: 'Float64', gpu: 'f32' },
      scope: 'Mesma realização autogravitante com bojo, disco e halo. Conservação usa potencial Plummer direto e referência inicial própria de cada precisão. Ensaio curto; não certifica equilíbrio ou estabilidade secular.' };
  } catch (error) { return { status: 'failed', reason: String(error.message ?? error), n, steps }; }
  finally { backend?.dispose(); }
}

export async function benchmarkGPU({ n = 1000, steps = 5, dt = 0.1, epsilon = 0.1, seed = 2026, sampleCount = 3, batchSize = steps } = {}) {
  if (!Number.isSafeInteger(steps) || steps <= 0) throw new RangeError('Benchmark requer uma quantidade inteira positiva de passos.');
  if (!Number.isSafeInteger(sampleCount) || sampleCount < 1 || !Number.isSafeInteger(batchSize) || batchSize < 1) throw new RangeError('Amostras e tamanho do lote devem ser inteiros positivos.');
  if (!globalThis.navigator?.gpu) return { status: 'skipped', n, reason: 'WebGPU indisponível; nenhum tempo GPU calculado.' };
  let backend;
  try {
    const initialStart = performance.now(), state = createGalaxy({ n, seed }), initialMs = performance.now() - initialStart;
    backend = await GPUBackend.create();
    const uploadStart = performance.now(); await backend.initialize(state, { dt, epsilon });
    const uploadAndInitialForceMs = performance.now() - uploadStart;
    await backend.step(2); // warmup is excluded from each measured sample
    const samples=[];
    for(let sample=0;sample<sampleCount;sample++){
      const timeStartMyr=backend.time,stepsStart=backend.steps,start=performance.now();
      for(let remaining=steps;remaining>0;){const count=Math.min(remaining,batchSize);await backend.step(count);remaining-=count;}
      const elapsedMs=performance.now()-start;samples.push({elapsedMs,stepMs:elapsedMs/steps,stepsStart,stepsEnd:backend.steps,timeStartMyr,timeEndMyr:backend.time});
    }
    const sorted=samples.map(s=>s.stepMs).sort((a,b)=>a-b),stepMs=sorted[Math.floor(sorted.length/2)];
    const final = await backend.snapshot();
    let finalStateSha256=null;if(globalThis.crypto?.subtle){const bytes=new Uint8Array(final.positions.byteLength+final.velocities.byteLength);bytes.set(new Uint8Array(final.positions.buffer));bytes.set(new Uint8Array(final.velocities.buffer),final.positions.byteLength);finalStateSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
    return { status: 'measured', n, steps, dt, epsilon, seed, initialMs, uploadAndInitialForceMs, stepMs,
      sampleCount,batchSize,warmupSteps:2,measuredSteps:steps*sampleCount,samples,finalStateSha256,
      particlesPerSecond: n * 1000 / stepMs, physicalMyr: final.time,
      finite: final.positions.every(Number.isFinite) && final.velocities.every(Number.isFinite),
      algorithm: 'direct', precision: 'f32', timing: 'mediana de amostras wall clock, incluindo submit e queue.onSubmittedWorkDone; sem extrapolação; geração/readback/diagnóstico/render excluídos',
      effectiveParameters: backend.effectiveParameters, resources: backend.resourceEstimate };
  } catch (error) { return { status: 'failed', n, reason: String(error.message ?? error) }; }
  finally { backend?.dispose(); }
}
