import test from 'node:test';
import assert from 'node:assert/strict';
import { OrbitCamera } from '../src/render/camera.js';
import { PARTICLE_STYLE, componentExposure, countPackedComponents, projectedParticleStyle, renderPixelRatio } from '../src/render/particle-style.js';
import { createGalaxy } from '../src/physics/initial.js';

function pack(state) {
  const data = new Float32Array(4 * state.n);
  for (let i = 0; i < state.n; i++) data.set([...state.positions.subarray(3 * i, 3 * i + 3), state.components[i]], 4 * i);
  return data;
}

test('visual exposure uses actual component counts without changing a realization', () => {
  const state = createGalaxy({ n: 10001, seed: 2026 });
  const original = structuredClone(state), data = pack(state), before = data.slice();
  const counts = countPackedComponents(data);
  assert.deepEqual(counts, state.meta.counts);
  const exposure = componentExposure(counts, state.n);
  for (let c = 0; c < 3; c++) assert.ok(Math.abs(exposure[c] * counts[c] - PARTICLE_STYLE.components[c].referenceCount) < 1e-4);
  assert.deepEqual(data, before);
  assert.deepEqual(state, original);
  assert.deepEqual(componentExposure(null, 65), new Float32Array([1, 1, 1]));
  assert.deepEqual(componentExposure([1, 2, 1], 4), new Float32Array([1, 1, 1]));
  assert.throws(() => componentExposure([1, 2, 1], 5), /somar N/);
  assert.throws(() => countPackedComponents(new Float32Array([0, 0, 0, 3])), /Componente/);
});

test('perspective display is bounded and zoom recovers individual point contrast', () => {
  const gains = componentExposure([150000, 450000, 400000], 1000000);
  for (let c = 0; c < 3; c++) {
    const far = projectedParticleStyle(c, 300, gains[c]);
    const normal = projectedParticleStyle(c, 75, gains[c]);
    const near = projectedParticleStyle(c, 0.05, gains[c]);
    assert.ok(far.diameter <= normal.diameter && normal.diameter < near.diameter);
    assert.ok(far.opacity <= normal.opacity && normal.opacity < near.opacity);
    assert.ok(near.opacity > 0 && near.opacity < 1);
    assert.ok(near.diameter <= PARTICLE_STYLE.pointSize * PARTICLE_STYLE.components[c].diameter * PARTICLE_STYLE.maxDepthScale);
  }
  assert.equal(renderPixelRatio(3), 2);
  assert.equal(renderPixelRatio(1.25), 1.25);
  assert.equal(renderPixelRatio(NaN), 1);
});

test('camera views preserve the target, distance and physical particle coordinates', () => {
  const canvas = { clientWidth: 800, clientHeight: 600, width: 800, height: 600, style: {}, addEventListener() {}, removeEventListener() {} };
  const target = [1.25, -0.5, 0.2], camera = new OrbitCamera(canvas, { target, distance: 75 });
  for (const view of ['free', 'top', 'side']) {
    camera.setView(view);
    const matrix = camera.matrix();
    const clip = Array.from({ length: 4 }, (_, row) => matrix[row] * target[0] + matrix[4 + row] * target[1] + matrix[8 + row] * target[2] + matrix[12 + row]);
    assert.ok(Math.abs(clip[0] / clip[3]) < 1e-7 && Math.abs(clip[1] / clip[3]) < 1e-7);
    assert.equal(camera.distance, 75);
    assert.deepEqual(camera.target, target);
    assert.ok(matrix.every(Number.isFinite));
  }
  camera.distance = 0.05;
  assert.ok(camera.matrix().every(Number.isFinite));
  camera.dispose();
});
