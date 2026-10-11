import { checkedShader } from '../compute/gpu.js';

const RENDER_WGSL = /* wgsl */`
struct Camera { matrix: mat4x4<f32>, viewport: vec2<f32>, pointSize: f32, pad: f32, visible: vec4<f32> };
@group(0) @binding(0) var<uniform> camera: Camera;
struct Vertex { @builtin(position) position: vec4<f32>, @location(0) color: vec4<f32>, @location(1) corner: vec2<f32> };
@vertex fn vertex(@builtin(vertex_index) index: u32, @location(0) position: vec4<f32>, @location(1) velocity: vec4<f32>) -> Vertex {
  var corners = array<vec2<f32>, 6>(vec2<f32>(-1.0,-1.0), vec2<f32>(1.0,-1.0), vec2<f32>(-1.0,1.0), vec2<f32>(-1.0,1.0), vec2<f32>(1.0,-1.0), vec2<f32>(1.0,1.0));
  var colors = array<vec3<f32>,3>(vec3<f32>(1.0,0.741176,0.505882),vec3<f32>(0.862745,0.917647,1.0),vec3<f32>(0.321569,0.713725,0.784314));
  var opacities = array<f32,3>(0.64,0.58,0.20);
  let component = min(u32(velocity.w),2u);
  var clip = camera.matrix * vec4<f32>(position.xyz, 1.0);
  let diameter = camera.pointSize * select(1.0,0.5,component == 2u);
  clip = vec4<f32>(clip.xy + corners[index] * diameter / camera.viewport * clip.w, clip.zw);
  var output: Vertex;
  if (camera.visible[component] < 0.5) { clip = vec4<f32>(2.0,2.0,2.0,1.0); }
  // Camera uses WebGL/OpenGL projection. Convert clip z [-w,w] to WebGPU [0,w].
  clip.z = 0.5 * (clip.z + clip.w);
  output.position = clip;
  output.color = vec4<f32>(colors[component], opacities[component]);
  output.corner = corners[index];
  return output;
}
@fragment fn fragment(input: Vertex) -> @location(0) vec4<f32> {
  if (dot(input.corner,input.corner) > 1.0) { discard; }
  return vec4<f32>(input.color.rgb,input.color.a * (1.0 - smoothstep(0.35,1.0,dot(input.corner,input.corner))));
}
`;

/** Instanced particles consume the compute buffers directly: no per-frame readback. */
export class GPURenderer {
  constructor(canvas, backend) {
    this.canvas = canvas; this.backend = backend; this.device = backend.device;
    this.context = canvas.getContext('webgpu');
    if (!this.context) throw new Error('Canvas WebGPU indisponível.');
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.ready = false; this.disposed = false;
  }
  async initialize() {
    const device = this.device; device.pushErrorScope('validation');
    try {
      const module = await checkedShader(device, RENDER_WGSL, 'Partículas científicas GPU');
      this.pipeline = await device.createRenderPipelineAsync({
        label: 'Partículas com buffers compute compartilhados', layout: 'auto',
        vertex: { module, entryPoint: 'vertex', buffers: [
          { arrayStride: 16, stepMode: 'instance', attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }] },
          { arrayStride: 16, stepMode: 'instance', attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x4' }] },
        ] },
        fragment: { module, entryPoint: 'fragment', targets: [{ format: this.format,
          blend: { color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' } } }] },
        primitive: { topology: 'triangle-list' },
      });
      this.uniformBuffer = device.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      this.bindGroup = device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }] });
      this.context.configure({ device, format: this.format, alphaMode: 'opaque' });
    } catch (error) { await device.popErrorScope(); this.dispose(); throw error; }
    const validation = await device.popErrorScope(); if (validation) { this.dispose(); throw new Error(`Render WebGPU: ${validation.message}`); }
    this.ready = true; this.resize(); return this;
  }
  resize() {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    this.pixelRatio = dpr;
    const width = Math.max(1, Math.round(this.canvas.clientWidth * dpr)), height = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    return { width, height };
  }
  draw(cameraMatrix, visibleComponents = [true, true, true], pointSize = 2) {
    if (!this.ready || this.disposed) return;
    this.backend.assertReady();
    if (!this.backend.initialized) return;
    if (!cameraMatrix || cameraMatrix.length !== 16) throw new TypeError('A matriz da câmera precisa ter 16 valores.');
    const { width, height } = this.resize(), uniform = new Float32Array(24);
    uniform.set(cameraMatrix, 0); uniform[16] = width; uniform[17] = height; uniform[18] = pointSize * this.pixelRatio;
    for (let c = 0; c < 3; c++) uniform[20 + c] = visibleComponents[c] ? 1 : 0;
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniform);
    const encoder = this.device.createCommandEncoder(), pass = encoder.beginRenderPass({ colorAttachments: [{
      view: this.context.getCurrentTexture().createView(), clearValue: { r: 0.015, g: 0.021, b: 0.037, a: 1 }, loadOp: 'clear', storeOp: 'store',
    }] });
    pass.setPipeline(this.pipeline); pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.backend.positionBuffer); pass.setVertexBuffer(1, this.backend.velocityBuffer);
    pass.draw(6, this.backend.n); pass.end(); this.device.queue.submit([encoder.finish()]);
  }
  dispose() { this.disposed = true; this.ready = false; this.uniformBuffer?.destroy(); this.context.unconfigure(); }
}
