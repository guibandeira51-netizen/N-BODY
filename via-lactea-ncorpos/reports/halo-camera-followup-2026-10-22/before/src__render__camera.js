/** Orbit camera in galactic coordinates: z is vertical, lengths are kpc.
 * Drag to orbit; wheel or touch pinch to zoom. These controls alter the camera
 * only. No particle coordinates or physical integration parameters are changed.
 */
export class OrbitCamera {
  constructor(canvas, { distance = 75, target = [0, 0, 0] } = {}) {
    this.canvas = canvas;
    this.target = [...target];
    this.distance = distance;
    this.azimuth = -0.85;
    this.elevation = 0.40;
    this.fov = Math.PI / 4;
    this.view = 'free';
    this._projection = new Float64Array(16);
    this._view = new Float64Array(16);
    this._matrix = new Float32Array(16);
    this._pointers = new Map();
    this._previousTouchAction = canvas.style.touchAction;
    canvas.style.touchAction = 'none';

    this._down = event => {
      if (this.comparisonLocked) return;
      if (event.button !== 0 && event.pointerType !== 'touch') return;
      this._pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      canvas.setPointerCapture?.(event.pointerId);
    };
    this._move = event => {
      if (this.comparisonLocked) return;
      const previous = this._pointers.get(event.pointerId);
      if (!previous) return;
      if (this._pointers.size === 2) {
        let other;
        for (const [id, position] of this._pointers) if (id !== event.pointerId) other = position;
        const before = Math.hypot(previous.x - other.x, previous.y - other.y);
        const after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
        if (before > 1 && after > 1) this.distance *= before / after;
      } else {
        this.azimuth -= (event.clientX - previous.x) * 0.006;
        this.elevation = Math.max(-Math.PI / 2 + 1e-4, Math.min(Math.PI / 2 - 1e-4, this.elevation + (event.clientY - previous.y) * 0.005));
        this.view = 'free';
      }
      previous.x = event.clientX; previous.y = event.clientY;
    };
    this._up = event => {
      this._pointers.delete(event.pointerId);
      if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    this._wheel = event => {
      event.preventDefault();
      if (this.comparisonLocked) return;
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1);
      this.distance *= Math.exp(Math.max(-2, Math.min(2, pixels * 0.001)));
    };
    canvas.addEventListener('pointerdown', this._down);
    canvas.addEventListener('pointermove', this._move);
    canvas.addEventListener('pointerup', this._up);
    canvas.addEventListener('pointercancel', this._up);
    canvas.addEventListener('lostpointercapture', this._up);
    canvas.addEventListener('wheel', this._wheel, { passive: false });
  }

  get distance() { return this._distance; }
  set distance(value) {
    if (this.comparisonLocked) return;
    if (!Number.isFinite(value) || value <= 0) throw new RangeError('Distância da câmera deve ser finita e positiva.');
    this._distance = Math.max(0.05, Math.min(1e7, value));
  }

  setView(view) {
    if (this.comparisonLocked) return this;
    if (!['top', 'side', 'free'].includes(view)) throw new RangeError('Vista de câmera desconhecida.');
    this.view = view;
    if (view === 'top') { this.azimuth = -Math.PI / 2; this.elevation = Math.PI / 2 - 1e-4; }
    else if (view === 'side') { this.azimuth = -Math.PI / 2; this.elevation = 0; }
    else { this.azimuth = -0.85; this.elevation = 0.40; }
    return this;
  }

  fitRadius(radius) {
    if (this.comparisonLocked) return this;
    const aspect = Math.max(1e-6, (this.canvas.clientWidth || 1) / (this.canvas.clientHeight || 1));
    const halfAngle = Math.atan(Math.tan(this.fov / 2) * Math.min(1, aspect));
    this.distance = 1.1 * radius / Math.sin(halfAngle);
    return this;
  }
  fitHalo(radius = 220) { return this.fitRadius(radius); }
  fitDisk(radius = 25) { return this.fitRadius(radius); }

  get comparisonLocked() { return Boolean(this._comparison); }
  setComparisonLocked(locked, width = this.canvas.clientWidth, height = this.canvas.clientHeight) {
    if (Boolean(locked) === this.comparisonLocked) return this;
    this._pointers.clear();
    this._comparison = locked ? {
      target: [...this.target], distance: this.distance, azimuth: this.azimuth,
      elevation: this.elevation, fov: this.fov, view: this.view,
      width: Math.max(1,width), height: Math.max(1,height)
    } : null;
    return this;
  }

  snapshot(width = this.canvas.clientWidth, height = this.canvas.clientHeight) {
    this.matrix(width,height);
    const pose=this._comparison??this,ce=Math.cos(pose.elevation);
    return {
      position: pose.target.map((v,k)=>v+pose.distance*[ce*Math.cos(pose.azimuth),ce*Math.sin(pose.azimuth),Math.sin(pose.elevation)][k]),
      target:[...pose.target],distance:pose.distance,azimuth:pose.azimuth,elevation:pose.elevation,fov:pose.fov,
      projection:this.comparisonLocked?'orthographic':'perspective',zoom:1,
      near:Math.max(.005,pose.distance*1e-4),far:Math.max(5000,pose.distance*20),
      viewport:[this._comparison?.width??width,this._comparison?.height??height],
      comparisonLocked:this.comparisonLocked,viewMatrix:Array.from(this._view),
      projectionMatrix:Array.from(this._projection),viewProjectionMatrix:Array.from(this._matrix)
    };
  }

  /** Column-major P*V, OpenGL clip depth -w..w. */
  matrix(width = this.canvas.width, height = this.canvas.height) {
    const pose=this._comparison??this;
    const aspect = Math.max(1e-6, Math.max(1, this._comparison?.width??width) / Math.max(1, this._comparison?.height??height));
    const ca = Math.cos(pose.azimuth), sa = Math.sin(pose.azimuth), ce = Math.cos(pose.elevation), se = Math.sin(pose.elevation);
    const x0 = -sa, x1 = ca, x2 = 0;
    const y0 = -se * ca, y1 = -se * sa, y2 = ce;
    const z0 = ce * ca, z1 = ce * sa, z2 = se;
    const [tx, ty, tz] = pose.target;
    const v = this._view;
    v[0] = x0; v[1] = y0; v[2] = z0; v[3] = 0;
    v[4] = x1; v[5] = y1; v[6] = z1; v[7] = 0;
    v[8] = x2; v[9] = y2; v[10] = z2; v[11] = 0;
    v[12] = -(x0 * tx + x1 * ty + x2 * tz);
    v[13] = -(y0 * tx + y1 * ty + y2 * tz);
    v[14] = -(z0 * tx + z1 * ty + z2 * tz + pose.distance); v[15] = 1;
    const near = Math.max(0.005, pose.distance * 1e-4), far = Math.max(5000, pose.distance * 20), f = 1 / Math.tan(pose.fov / 2);
    const p = this._projection;
    p.fill(0);
    if(this.comparisonLocked){
      const halfHeight=pose.distance/f;
      p[0]=1/(halfHeight*aspect);p[5]=1/halfHeight;
      p[10]=-2/(far-near);p[14]=-(far+near)/(far-near);p[15]=1;
    }else{
      p[0] = f / aspect; p[5] = f;
      p[10] = (far + near) / (near - far); p[11] = -1;
      p[14] = 2 * far * near / (near - far);
    }
    const matrix = this._matrix;
    for (let column = 0; column < 4; column++) {
      for (let row = 0; row < 4; row++) {
        matrix[column * 4 + row] = p[row] * v[column * 4] + p[4 + row] * v[column * 4 + 1] + p[8 + row] * v[column * 4 + 2] + p[12 + row] * v[column * 4 + 3];
      }
    }
    return matrix;
  }

  dispose() {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this._down); c.removeEventListener('pointermove', this._move);
    c.removeEventListener('pointerup', this._up); c.removeEventListener('pointercancel', this._up);
    c.removeEventListener('lostpointercapture', this._up); c.removeEventListener('wheel', this._wheel);
    this._pointers.clear();
    c.style.touchAction = this._previousTouchAction;
  }
}

export { OrbitCamera as Camera };
