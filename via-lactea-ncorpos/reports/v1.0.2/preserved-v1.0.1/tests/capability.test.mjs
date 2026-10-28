import test from 'node:test';
import assert from 'node:assert/strict';
import { assessResources, chooseBackend, defaultBudgetBytes, detectCapabilities, estimateResources } from '../src/compute/capability.js';

const limits = { maxBufferSize: 2 ** 28, maxStorageBufferBindingSize: 2 ** 27, maxComputeWorkgroupSizeX: 256,
  maxComputeInvocationsPerWorkgroup: 256, maxComputeWorkgroupStorageSize: 16384, maxComputeWorkgroupsPerDimension: 65535 };
const capabilities = { webgpu: { available: true, limits } };

test('admission distinguishes buffer limits, configured budget, and missing hardware', () => {
  assert.equal(assessResources(1024, capabilities).admissible, true);
  assert.match(assessResources(1024, capabilities, { budgetBytes: 1024 }).reasons.join(' '), /orçamento/);
  assert.match(assessResources(2 ** 24, capabilities, { budgetBytes: 20 * 1024 ** 3 }).reasons.join(' '), /maxStorageBufferBindingSize/);
  assert.equal(assessResources(10, {}).admissible, false);
});

test('2D dispatch admission uses actual adapter dimensions, not a fixed particle ceiling', () => {
  const tiny = { webgpu: { available: true, limits: { ...limits, maxComputeWorkgroupsPerDimension: 2 } } };
  assert.equal(assessResources(256, tiny).admissible, true);
  assert.match(assessResources(257, tiny).reasons.join(' '), /Dispatch 2D/);
});

test('resource estimate includes simultaneous CPU snapshot, f32 packing, GPU and staging', () => {
  const resource = estimateResources(1024);
  assert.equal(resource.cpuCopies, 2);
  assert.equal(resource.estimatedBytes, 290 * 1024 + 32);
  assert.equal(estimateResources(1024, { readback: false }).readbackBytes, 0);
  assert.throws(() => estimateResources(-1), RangeError);
  assert.throws(() => estimateResources(2.1), RangeError);
  assert.throws(() => assessResources(100, capabilities, { budgetBytes: 0 }), RangeError);
});

test('automatic policy requires a measured benchmark for the requested N and available resources', () => {
  const args = { n: 1024, capabilities, gpuBenchmark: { n: 1024, stepMs: 2 }, cpuBenchmark: { n: 1024, stepMs: 5 } };
  assert.equal(chooseBackend(args).backend, 'gpu-direct');
  assert.equal(chooseBackend({ ...args, gpuBenchmark: { n: 512, stepMs: 1 } }).backend, 'cpu-bh');
  assert.equal(chooseBackend({ ...args, gpuBenchmark: null }).backend, 'cpu-bh');
  assert.equal(chooseBackend({ ...args, gpuBenchmark: { n: 1024, stepMs: 60 } }).backend, 'cpu-bh');
  assert.equal(chooseBackend({ ...args, capabilities: {} }).backend, 'cpu-bh');
});

test('runtime report is serializable and memory policy is explicitly bounded', async () => {
  assert.equal(defaultBudgetBytes(undefined), 256 * 1024 ** 2);
  assert.equal(defaultBudgetBytes(8), 1024 ** 3);
  const result = await detectCapabilities();
  assert.doesNotThrow(() => JSON.stringify(result));
  assert.equal(typeof result.wasmSIMD, 'boolean');
  assert.ok(!('vram' in result));
});
