const VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec4 particle;
uniform mat4 matrix;
uniform vec3 visible;
uniform float pixelRatio;
out vec3 color;
out float opacity;
void main() {
  int component = int(particle.w + 0.5);
  if (component == 0) { color = vec3(1.0, 0.741176, 0.505882); opacity = 0.64; gl_PointSize = 2.0 * pixelRatio; }
  else if (component == 1) { color = vec3(0.862745, 0.917647, 1.0); opacity = 0.58; gl_PointSize = 2.0 * pixelRatio; }
  else { color = vec3(0.321569, 0.713725, 0.784314); opacity = 0.20; gl_PointSize = 1.0 * pixelRatio; }
  float shown = component == 0 ? visible.x : component == 1 ? visible.y : visible.z;
  gl_Position = shown > 0.5 ? matrix * vec4(particle.xyz, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec3 color;
in float opacity;
out vec4 outputColor;
void main() {
  vec2 point = 2.0 * gl_PointCoord - 1.0;
  float radius2 = dot(point, point);
  if (radius2 > 1.0) discard;
  outputColor = vec4(color, opacity * (1.0 - smoothstep(0.35, 1.0, radius2)));
}`;

const ALL_VISIBLE = Object.freeze([true, true, true]);

/** One GPU vertex buffer, one draw call; no per-particle JS objects.
 * Data layout: Float32Array [x_kpc, y_kpc, z_kpc, component, ...].
 * Colors/opacity identify components and do not represent physical luminosity.
 */
export class WebGLRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.count = 0;
    this.capacityBytes = 0;
    this.pixelRatio = globalThis.devicePixelRatio || 1;
    this.lost = false;
    this.disposed = false;
    this._lastData = null;
    this.gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    if (!this.gl) throw new Error('WebGL2 indisponível: este navegador não oferece o renderizador 3D necessário.');
    this._initialize();
    this._lost = event => { event.preventDefault(); this.lost = true; this.onContextLost?.(event); };
    this._restored = () => {
      this.lost = false;
      try {
        this._initialize();
        if (this._lastData) this.update(this._lastData);
        this.resize();
        this.onContextRestored?.();
      } catch (error) { this.lost = true; this.onError?.(error); }
    };
    canvas.addEventListener('webglcontextlost', this._lost);
    canvas.addEventListener('webglcontextrestored', this._restored);
    this.resize();
  }

  _initialize() {
    const gl = this.gl;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Não foi possível alocar shader WebGL2.');
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader); gl.deleteShader(shader);
        throw new Error(`Falha ao compilar renderizador WebGL2: ${message}`);
      }
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, VERTEX), fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    this.program = gl.createProgram();
    if (!this.program) { gl.deleteShader(vertex); gl.deleteShader(fragment); throw new Error('Não foi possível alocar programa WebGL2.'); }
    gl.attachShader(this.program, vertex); gl.attachShader(this.program, fragment); gl.linkProgram(this.program);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error(`Falha ao vincular renderizador WebGL2: ${gl.getProgramInfoLog(this.program)}`);
    this.buffer = gl.createBuffer(); this.vao = gl.createVertexArray();
    if (!this.buffer || !this.vao) throw new Error('Não foi possível alocar o buffer de renderização WebGL2.');
    gl.bindVertexArray(this.vao); gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
    this.matrixLocation = gl.getUniformLocation(this.program, 'matrix');
    this.visibleLocation = gl.getUniformLocation(this.program, 'visible');
    this.pixelRatioLocation = gl.getUniformLocation(this.program, 'pixelRatio');
    this.capacityBytes = 0;
    this.maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.clearColor(0.015, 0.021, 0.037, 1);
  }

  update(data) {
    if (!(data instanceof Float32Array) || data.length % 4 !== 0) throw new TypeError('O renderizador requer Float32Array com quatro valores por partícula.');
    if (this.disposed) throw new Error('O renderizador já foi encerrado.');
    this._lastData = data;
    this.count = data.length / 4;
    if (this.lost) return;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    if (data.byteLength > this.capacityBytes) {
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      this.capacityBytes = data.byteLength;
    } else if (data.byteLength) gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    const error = gl.getError();
    if (error === gl.OUT_OF_MEMORY) throw new Error('Memória GPU insuficiente para o buffer de pontos. Reduza N.');
    if (error !== gl.NO_ERROR) throw new Error(`Falha ao atualizar buffer WebGL2 (código ${error}).`);
  }

  /** Width/height parameters are CSS pixels; backing buffer uses actual DPR. */
  resize(width = this.canvas.clientWidth, height = this.canvas.clientHeight) {
    if (this.disposed || this.lost) return;
    this.pixelRatio = globalThis.devicePixelRatio || 1;
    const limit = this.maxRenderbufferSize;
    const w = Math.min(limit, Math.max(1, Math.round(width * this.pixelRatio)));
    const h = Math.min(limit, Math.max(1, Math.round(height * this.pixelRatio)));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  }

  draw(matrix, visible = ALL_VISIBLE) {
    if (this.disposed || this.lost) return false;
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!this.count) return true;
    gl.useProgram(this.program); gl.bindVertexArray(this.vao);
    gl.uniformMatrix4fv(this.matrixLocation, false, matrix);
    gl.uniform3f(this.visibleLocation, visible[0] ? 1 : 0, visible[1] ? 1 : 0, visible[2] ? 1 : 0);
    gl.uniform1f(this.pixelRatioLocation, this.pixelRatio);
    gl.drawArrays(gl.POINTS, 0, this.count);
    return true;
  }

  dispose() {
    if (this.disposed) return;
    this.canvas.removeEventListener('webglcontextlost', this._lost);
    this.canvas.removeEventListener('webglcontextrestored', this._restored);
    const gl = this.gl;
    gl.deleteBuffer(this.buffer); gl.deleteVertexArray(this.vao); gl.deleteProgram(this.program);
    this._lastData = null; this.count = 0; this.capacityBytes = 0; this.disposed = true;
  }
}
