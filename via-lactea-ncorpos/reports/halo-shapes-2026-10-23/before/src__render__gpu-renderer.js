import { checkedShader } from '../compute/gpu.js';
import {ContinuousHaloDensity} from './continuous-halo-density.js';
import { ALL_VISIBLE, PARTICLE_STYLE, componentExposure, renderPixelRatio, shaderFloat } from './particle-style.js';

const styles = PARTICLE_STYLE.components;

const RENDER_WGSL = /* wgsl */`
struct Camera { matrix: mat4x4<f32>, viewport: vec2<f32>, pointSize: f32, pad: f32, visible: vec4<f32>, exposure: vec4<f32>, eyeDepth: vec4<f32> };
@group(0) @binding(0) var<uniform> camera: Camera;
struct Vertex { @builtin(position) position: vec4<f32>, @location(0) color: vec4<f32>, @location(1) corner: vec2<f32>, @interpolate(flat) @location(2) component: u32 };
@vertex fn vertex(@builtin(vertex_index) index: u32, @location(0) position: vec4<f32>, @location(1) velocity: vec4<f32>) -> Vertex {
  var corners = array<vec2<f32>, 6>(vec2<f32>(-1.0,-1.0), vec2<f32>(1.0,-1.0), vec2<f32>(-1.0,1.0), vec2<f32>(-1.0,1.0), vec2<f32>(1.0,-1.0), vec2<f32>(1.0,1.0));
  var colors = array<vec3<f32>,3>(${styles.map(s => `vec3<f32>(${s.color.map(shaderFloat).join(',')})`).join(',')});
  var opacities = array<f32,3>(${styles.map(s => shaderFloat(s.opacity)).join(',')});
  var diameters = array<f32,3>(${styles.map(s => shaderFloat(s.diameter)).join(',')});
  let component = min(u32(velocity.w),2u);
  var clip = camera.matrix * vec4<f32>(position.xyz, 1.0);
  // clip.w is 1 in orthographic projection: it is not a physical eye distance.
  let eyeDepth = dot(camera.eyeDepth, vec4<f32>(position.xyz,1.0));
  let depthRatio = ${shaderFloat(PARTICLE_STYLE.depthReference)} / max(eyeDepth, 0.05);
  let depthScale = clamp(sqrt(depthRatio), ${shaderFloat(PARTICLE_STYLE.minDepthScale)}, ${shaderFloat(PARTICLE_STYLE.maxDepthScale)});
  let normalized = min(1.0, camera.exposure[component] * max(1.0, depthRatio * depthRatio));
  let diameter = camera.pointSize * diameters[component] * depthScale;
  clip = vec4<f32>(clip.xy + corners[index] * diameter / camera.viewport * clip.w, clip.zw);
  var output: Vertex;
  if (camera.visible[component] < 0.5) { clip = vec4<f32>(2.0,2.0,2.0,1.0); }
  // Camera uses WebGL/OpenGL projection. Convert clip z [-w,w] to WebGPU [0,w].
  clip.z = 0.5 * (clip.z + clip.w);
  output.position = clip;
  output.color = vec4<f32>(colors[component], opacities[component] * normalized * min(depthScale, ${shaderFloat(PARTICLE_STYLE.maxOpacityDepth)}));
  output.corner = corners[index];
  output.component = component;
  return output;
}
@fragment fn fragment(input: Vertex) -> @location(0) vec4<f32> {
  let radius2 = dot(input.corner,input.corner);
  if (radius2 > 1.0) { discard; }
  var footprint = 1.0 - smoothstep(0.35,1.0,radius2);
  if (input.component == 2u) { footprint *= smoothstep(0.16,0.38,radius2); }
  return vec4<f32>(input.color.rgb,input.color.a * footprint);
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
    this.uniform = new Float32Array(32);
    this._countsMetadata = undefined;
    this._countsN = -1;
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
      this.uniformBuffer = device.createBuffer({ size: this.uniform.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      this.bindGroup = device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }] });
      if(this.backend.meta?.haloRepresentation==='geometry'&&this.backend.meta?.haloField){this.continuousHalo=new ContinuousHaloDensity(device,this.format,this.uniformBuffer,this.backend.meta.haloField);await this.continuousHalo.initialize();}
      this.context.configure({ device, format: this.format, alphaMode: 'opaque' });
    } catch (error) { await device.popErrorScope(); this.dispose(); throw error; }
    const validation = await device.popErrorScope(); if (validation) { this.dispose(); throw new Error(`Render WebGPU: ${validation.message}`); }
    this.ready = true; this.resize(); return this;
  }
  resize() {
    const dpr = renderPixelRatio();
    this.pixelRatio = dpr;
    const limit = this.device.limits.maxTextureDimension2D;
    const width = Math.min(limit, Math.max(1, Math.round(this.canvas.clientWidth * dpr))), height = Math.min(limit, Math.max(1, Math.round(this.canvas.clientHeight * dpr)));
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
  }
  draw(cameraMatrix, visibleComponents = ALL_VISIBLE, pointSize = PARTICLE_STYLE.pointSize, {eyeDepth=null,showContinuousHalo=true,haloOpacity=.55}={}) {
    if (!this.ready || this.disposed) return;
    this.backend.assertReady();
    if (!this.backend.initialized) return;
    if (!cameraMatrix || cameraMatrix.length !== 16) throw new TypeError('A matriz da câmera precisa ter 16 valores.');
    this.resize();
    const width = this.canvas.width, height = this.canvas.height, uniform = this.uniform;
    uniform.set(cameraMatrix, 0); uniform[16] = width; uniform[17] = height; uniform[18] = pointSize * this.pixelRatio;uniform[19]=0;
    // Older perspective callers can use the homogeneous-w row unchanged.
    // Orthographic callers supply the actual view-space depth row explicitly.
    if(eyeDepth)uniform.set(eyeDepth,28);
    else if(cameraMatrix[15]!==1||cameraMatrix[3]||cameraMatrix[7]||cameraMatrix[11])uniform.set([cameraMatrix[3],cameraMatrix[7],cameraMatrix[11],cameraMatrix[15]],28);
    else throw new TypeError('Projeção ortográfica exige a profundidade real da câmera.');
    for (let c = 0; c < 3; c++) uniform[20 + c] = visibleComponents[c] ? 1 : 0;
    const counts = this.backend.meta?.counts;
    if (counts !== this._countsMetadata || this.backend.n !== this._countsN) {
      uniform.set(componentExposure(counts, this.backend.n), 24);
      this._countsMetadata = counts; this._countsN = this.backend.n;
    }
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniform);
    const encoder = this.device.createCommandEncoder(), pass = encoder.beginRenderPass({ colorAttachments: [{
      view: this.context.getCurrentTexture().createView(), clearValue: { r: 0.015, g: 0.021, b: 0.037, a: 1 }, loadOp: 'clear', storeOp: 'store',
    }] });
    if(showContinuousHalo&&haloOpacity>0)this.continuousHalo?.draw(pass,haloOpacity);
    pass.setPipeline(this.pipeline); pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.backend.positionBuffer); pass.setVertexBuffer(1, this.backend.velocityBuffer);
    pass.draw(6, this.backend.n); pass.end(); this.device.queue.submit([encoder.finish()]);
  }
  dispose() { this.disposed = true; this.ready = false; this.continuousHalo?.dispose();this.uniformBuffer?.destroy(); this.context.unconfigure(); }
}
