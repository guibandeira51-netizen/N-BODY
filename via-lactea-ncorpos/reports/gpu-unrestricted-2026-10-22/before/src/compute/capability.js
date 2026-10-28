/** Capabilities are observations, never a guess about installed VRAM. */
const MiB = 1024 ** 2;

export function defaultBudgetBytes(memoryGiB = globalThis.navigator?.deviceMemory) {
  // Browser deviceMemory is a coarse RAM hint. The fallback is a stated safety policy.
  return Number.isFinite(memoryGiB) && memoryGiB > 0 ? Math.min(memoryGiB * 1024 ** 3 / 8, 1024 * MiB) : 256 * MiB;
}

export function estimateResources(n, { backend = 'gpu', readback = true, cpuCopies = 2, cpuWorkers = 1,gpuDiagnostics=false } = {}) {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError('N deve ser um inteiro seguro não negativo.');
  // CPU reference: xyz position/velocity/acceleration Float64 + mass Float64 + component Uint8.
  const cpuStateBytes = 81 * n;
  const perStorageBufferBytes = Math.max(16, 16 * n);
  const gpuResidentBytes = backend === 'gpu' ? 3 * perStorageBufferBytes + 32 : 0;
  const readbackBytes = backend === 'gpu' && readback ? 3 * perStorageBufferBytes : 0;
  const cpuScratchBytes = backend === 'gpu' ? 32 * n : 0; // f32 packing may overlap a later snapshot before GC
  const barnesHutBytes = backend === 'cpu-bh' ? 384 * n : 0; // conservative tree/work arrays estimate
  const parallelTreeBytes=backend==='cpu-bh'&&cpuWorkers>1?384*n:0; // owner tree + read-only publication, no per-worker particle clones
  const workerOverheadBytes=backend==='cpu-bh'&&cpuWorkers>1?Math.min(16,cpuWorkers)*1024**2:0; // stated estimate; engine/JIT memory varies
  const gpuDiagnosticBytes=backend==='gpu'&&gpuDiagnostics?48*31*32:0;
  const estimatedBytes = cpuStateBytes * cpuCopies + cpuScratchBytes + gpuResidentBytes + readbackBytes + barnesHutBytes+parallelTreeBytes+workerOverheadBytes+gpuDiagnosticBytes;
  return { n, cpuStateBytes, cpuCopies, cpuScratchBytes, gpuResidentBytes, readbackBytes, barnesHutBytes,parallelTreeBytes,workerOverheadBytes,cpuWorkers,gpuDiagnosticBytes,perStorageBufferBytes, estimatedBytes,
    approximate: true, includes: 'duas cópias de estado CPU por padrão, packing f32, três buffers GPU, staging opcional; árvore BH estimada',
    excludes: 'driver, canvas, navegador, fragmentação e outras aplicações' };
}

export function assessResources(n, capabilities = {}, options = {}) {
  const backend = options.backend ?? 'gpu';
  const estimate = estimateResources(n, { ...options, backend });
  const budgetBytes = options.budgetBytes ?? capabilities.safetyBudgetBytes ?? defaultBudgetBytes(capabilities.memoryGiB);
  if (!Number.isFinite(budgetBytes) || budgetBytes <= 0) throw new RangeError('Orçamento de memória deve ser positivo.');
  const reasons = [];
  if (estimate.estimatedBytes > budgetBytes) reasons.push('Estimativa de memória excede o orçamento de segurança configurado.');
  if (backend === 'gpu') {
    const limits = capabilities.webgpu?.limits ?? capabilities.limits;
    const available = capabilities.webgpu?.available ?? Boolean(limits);
    if (!available || !limits) reasons.push('WebGPU/adaptador não disponível.');
    else {
      if (estimate.perStorageBufferBytes > limits.maxBufferSize) reasons.push('Buffer excede maxBufferSize do adaptador.');
      if (estimate.perStorageBufferBytes > limits.maxStorageBufferBindingSize) reasons.push('Buffer excede maxStorageBufferBindingSize do adaptador.');
      if (limits.maxComputeWorkgroupSizeX < 64 || limits.maxComputeInvocationsPerWorkgroup < 64 || limits.maxComputeWorkgroupStorageSize < 1024)
        reasons.push('Adaptador não comporta o kernel de 64 threads e tile de 1 KiB.');
      const maxDispatch = limits.maxComputeWorkgroupsPerDimension;
      if (Math.ceil(n / 64) > maxDispatch * maxDispatch) reasons.push('Dispatch 2D excede os limites do adaptador.');
      if (n > 0xffffffff) reasons.push('Índices de partículas excedem a faixa u32 do shader.');
    }
  }
  return { admissible: reasons.length === 0, reasons, budgetBytes, estimate };
}

export function serializeLimits(limits) {
  const names = ['maxBufferSize', 'maxStorageBufferBindingSize', 'maxStorageBuffersPerShaderStage',
    'maxComputeWorkgroupSizeX', 'maxComputeInvocationsPerWorkgroup', 'maxComputeWorkgroupStorageSize',
    'maxComputeWorkgroupsPerDimension', 'maxBindGroups', 'maxUniformBufferBindingSize'];
  return Object.fromEntries(names.map(name => [name, Number(limits[name])]));
}

export async function detectCapabilities() {
  const nav = globalThis.navigator;
  let wasm = false, wasmSIMD = false;
  if (typeof WebAssembly !== 'undefined') {
    wasm = WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0]));
    // (module (func (result v128) i32.const 0 i8x16.splat))
    wasmSIMD = WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,8,1,6,0,65,0,253,15,11]));
  }
  const result = { hardwareConcurrency: nav?.hardwareConcurrency ?? null, memoryGiB: nav?.deviceMemory ?? null,
    memoryHint: 'deviceMemory é uma estimativa arredondada de RAM; não mede VRAM.',
    safetyBudgetBytes: defaultBudgetBytes(nav?.deviceMemory), wasm, wasmSIMD,
    worker: typeof Worker !== 'undefined', sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    crossOriginIsolated: Boolean(globalThis.crossOriginIsolated),
    secureContext: Boolean(globalThis.isSecureContext), webgpu: { available: false, reason: 'API WebGPU ausente.' } };
  if (nav?.gpu) {
    try {
      const adapter = await nav.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (adapter) result.webgpu = { available: true, limits: serializeLimits(adapter.limits),
        features: Array.from(adapter.features), info: adapter.info ? { vendor: adapter.info.vendor, architecture: adapter.info.architecture,
          device: adapter.info.device, description: adapter.info.description } : null,
        reason: null, precision: 'f32', algorithm: 'direto O(N²); seleção automática depende de benchmark medido' };
      else result.webgpu.reason = 'Nenhum adaptador WebGPU exposto pelo navegador.';
    } catch (error) { result.webgpu.reason = String(error.message ?? error); }
  }
  return result;
}

/** Policy uses actual timings. A missing benchmark does not establish a fast GPU. */
export function chooseBackend({ n, gpuBenchmark, cpuBenchmark, capabilities, budgetBytes, targetStepMs = 40 }) {
  const admission = assessResources(n, capabilities, { backend: 'gpu', budgetBytes });
  const valid = b => b && b.n === n && Number.isFinite(b.stepMs) && b.stepMs > 0;
  if (admission.admissible && valid(gpuBenchmark) && gpuBenchmark.stepMs <= targetStepMs &&
      (!valid(cpuBenchmark) || gpuBenchmark.stepMs < cpuBenchmark.stepMs))
    return { backend: 'gpu-direct', reason: 'Benchmark neste N cabe no orçamento temporal e de memória.', admission };
  return { backend: 'cpu-bh', reason: 'GPU direta exige benchmark favorável neste N; CPU Barnes–Hut é a alternativa escalável.', admission };
}
