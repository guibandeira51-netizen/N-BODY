import { G as DEFAULT_G } from './constants.js';

/** CPU reference: Float64, kpc / Myr / 1e10 solar masses. */
export function validateState(state) {
  const { n, positions, masses } = state;
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError('N deve ser um inteiro não negativo representável.');
  if (!(positions instanceof Float64Array) || positions.length !== 3 * n ||
      !(masses instanceof Float64Array) || masses.length !== n) {
    throw new TypeError('Posições e massas CPU devem usar Float64Array com tamanho correspondente a N.');
  }
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(masses[i]) || masses[i] < 0) throw new RangeError('Massas devem ser finitas e não negativas.');
    const k = 3 * i;
    if (!Number.isFinite(positions[k]) || !Number.isFinite(positions[k + 1]) || !Number.isFinite(positions[k + 2])) {
      throw new RangeError('A posição contém valor não finito. Reduza o passo temporal.');
    }
  }
  return state;
}

function parameters({ epsilon = 0.1, G = DEFAULT_G, theta = 0.5 } = {}) {
  if (!Number.isFinite(epsilon) || epsilon < 0) throw new RangeError('A suavização deve ser finita e não negativa.');
  if (!Number.isFinite(G) || G <= 0) throw new RangeError('G deve ser finito e positivo.');
  if (!Number.isFinite(theta) || theta < 0) throw new RangeError('Theta deve ser finito e não negativo.');
  return { epsilon, G, theta };
}

function accelerationOutput(state, out) {
  if (!(out instanceof Float64Array) || out.length !== 3 * state.n || out === state.positions || out === state.velocities) {
    throw new TypeError('A saída de aceleração deve ser um Float64Array independente de tamanho 3N.');
  }
  out.fill(0);
  return out;
}

/** Symmetric pair evaluation. No analytic background is added. */
export function directAccelerations(state, options = {}, out = state.accelerations) {
  validateState(state);
  const { epsilon, G } = parameters(options);
  accelerationOutput(state, out);
  const { n, positions: p, masses: m } = state;
  const eps2 = epsilon * epsilon;
  for (let i = 0; i < n; i++) {
    const a = 3 * i;
    for (let j = i + 1; j < n; j++) {
      const b = 3 * j;
      const dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], dz = p[b + 2] - p[a + 2];
      const r2 = dx * dx + dy * dy + dz * dz + eps2;
      if (r2 === 0) throw new RangeError('Partículas coincidentes exigem suavização positiva.');
      const factor = G / (r2 * Math.sqrt(r2));
      const fi = factor * m[j], fj = factor * m[i];
      out[a] += fi * dx; out[a + 1] += fi * dy; out[a + 2] += fi * dz;
      out[b] -= fj * dx; out[b + 1] -= fj * dy; out[b + 2] -= fj * dz;
    }
  }
  return out;
}

/** Exact pair potential matching the Plummer-softened force. */
export function directPotentialEnergy(state, options = {}) {
  validateState(state);
  const { epsilon, G } = parameters(options);
  const { n, positions: p, masses: m } = state;
  const eps2 = epsilon * epsilon;
  let potential = 0;
  for (let i = 0; i < n; i++) {
    const a = 3 * i;
    for (let j = i + 1; j < n; j++) {
      const b = 3 * j;
      const dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], dz = p[b + 2] - p[a + 2];
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz + eps2);
      if (r === 0) throw new RangeError('Partículas coincidentes exigem suavização positiva.');
      potential -= G * m[i] * m[j] / r;
    }
  }
  return potential;
}

// Flat 3D octree. Node ranges index a permutation of bodies; this gives exact
// membership tests and prevents a node containing the target from being used.
// Eight-body leaf buckets are a computational parameter, not a limit on N.
const LEAF_BUCKET = 8;
const treeCache = new WeakMap();

class Octree {
  constructor(n) {
    // Uint32 body indices / Int32 child indices are representational limits.
    if (n > 0xffffffff) throw new RangeError('N excede a representação Uint32 de índices da árvore.');
    this.n = n;
    this.order = new Uint32Array(n);
    this.scratch = new Uint32Array(n);
    this.rank = new Uint32Array(n);
    this.capacity = 0;
    this.nodeCount = 0;
    this.stack = new Int32Array(128);
    this.counts = new Uint32Array(8);
    this.offsets = new Uint32Array(8);
    this.ensureCapacity(Math.min(Math.max(16, n), 16384));
  }

  ensureCapacity(required) {
    if (required <= this.capacity) return;
    const capacity = Math.max(required, this.capacity * 2, 16);
    if (capacity > 0x7fffffff) throw new RangeError('A árvore excede a representação Int32 dos nós.');
    for (const name of ['cx', 'cy', 'cz', 'half', 'mass', 'mx', 'my', 'mz']) {
      const next = new Float64Array(capacity);
      if (this[name]) next.set(this[name]);
      this[name] = next;
    }
    for (const name of ['start', 'count']) {
      const next = new Uint32Array(capacity);
      if (this[name]) next.set(this[name]);
      this[name] = next;
    }
    const children = new Int32Array(8 * capacity).fill(-1);
    if (this.children) children.set(this.children);
    this.children = children;
    const internal = new Uint8Array(capacity);
    if (this.internal) internal.set(this.internal);
    this.internal = internal;
    this.capacity = capacity;
  }

  addNode(cx, cy, cz, half, start, count) {
    const node = this.nodeCount++;
    this.ensureCapacity(this.nodeCount);
    this.cx[node] = cx; this.cy[node] = cy; this.cz[node] = cz; this.half[node] = half;
    this.start[node] = start; this.count[node] = count;
    this.internal[node] = 0;
    this.children.fill(-1, 8 * node, 8 * node + 8);
    return node;
  }

  build(state) {
    const started = performance.now();
    const { n, positions: p, masses: m } = state;
    this.nodeCount = 0;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < n; i++) {
      this.order[i] = i;
      const k = 3 * i;
      minX = Math.min(minX, p[k]); maxX = Math.max(maxX, p[k]);
      minY = Math.min(minY, p[k + 1]); maxY = Math.max(maxY, p[k + 1]);
      minZ = Math.min(minZ, p[k + 2]); maxZ = Math.max(maxZ, p[k + 2]);
    }
    if (!n) { this.buildMs = performance.now() - started; return this; }
    const width = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
    if (!Number.isFinite(width)) throw new RangeError('Extensão espacial excede a representação numérica da árvore.');
    const half = 0.5 * width * (1 + 16 * Number.EPSILON);
    this.addNode(minX + 0.5 * (maxX - minX), minY + 0.5 * (maxY - minY), minZ + 0.5 * (maxZ - minZ), half, 0, n);

    // Breadth-first partitioning avoids recursive JS calls and uses reusable
    // arrays. Duplicate positions form one exact leaf, with no depth cap.
    for (let node = 0; node < this.nodeCount; node++) {
      const start = this.start[node], count = this.count[node], end = start + count;
      const cx = this.cx[node], cy = this.cy[node], cz = this.cz[node], childHalf = 0.5 * this.half[node];
      let total = 0, mx = 0, my = 0, mz = 0;
      minX = Infinity; minY = Infinity; minZ = Infinity;
      maxX = -Infinity; maxY = -Infinity; maxZ = -Infinity;
      this.counts.fill(0);
      for (let at = start; at < end; at++) {
        const i = this.order[at], k = 3 * i, mi = m[i];
        const x = p[k], y = p[k + 1], z = p[k + 2];
        if (mi > 0) {
          const nextMass = total + mi;
          const ratio = mi / nextMass;
          mx += ratio * (x - mx); my += ratio * (y - my); mz += ratio * (z - mz);
          total = nextMass;
        }
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
        const octant = (x >= cx ? 1 : 0) | (y >= cy ? 2 : 0) | (z >= cz ? 4 : 0);
        this.counts[octant]++;
      }
      this.mass[node] = total;
      this.mx[node] = total > 0 ? mx : cx;
      this.my[node] = total > 0 ? my : cy;
      this.mz[node] = total > 0 ? mz : cz;
      const coincident = minX === maxX && minY === maxY && minZ === maxZ;
      if (coincident) {
        this.half[node] = 0;
        this.mx[node] = minX; this.my[node] = minY; this.mz[node] = minZ;
        continue;
      }
      // Stop only when IEEE-754 cannot resolve a smaller spatial cell.
      const canSplit = childHalf > 0 &&
        ((minX !== maxX && (cx - childHalf !== cx || cx + childHalf !== cx)) ||
         (minY !== maxY && (cy - childHalf !== cy || cy + childHalf !== cy)) ||
         (minZ !== maxZ && (cz - childHalf !== cz || cz + childHalf !== cz)));
      if (count <= LEAF_BUCKET || !canSplit) continue;
      this.internal[node] = 1;
      let cursor = start;
      for (let octant = 0; octant < 8; octant++) { this.offsets[octant] = cursor; cursor += this.counts[octant]; }
      for (let at = start; at < end; at++) {
        const i = this.order[at], k = 3 * i;
        const octant = (p[k] >= cx ? 1 : 0) | (p[k + 1] >= cy ? 2 : 0) | (p[k + 2] >= cz ? 4 : 0);
        this.scratch[this.offsets[octant]++] = i;
      }
      for (let at = start; at < end; at++) this.order[at] = this.scratch[at];
      cursor = start;
      for (let octant = 0; octant < 8; octant++) {
        const childCount = this.counts[octant];
        if (childCount) {
          const child = this.addNode(cx + (octant & 1 ? childHalf : -childHalf), cy + (octant & 2 ? childHalf : -childHalf), cz + (octant & 4 ? childHalf : -childHalf), childHalf, cursor, childCount);
          this.children[8 * node + octant] = child;
        }
        cursor += childCount;
      }
    }
    for (let at = 0; at < n; at++) this.rank[this.order[at]] = at;
    this.buildMs = performance.now() - started;
    return this;
  }

  ensureStack(required) {
    if (required > this.stack.length) {
      const next = new Int32Array(Math.max(required, this.stack.length * 2));
      next.set(this.stack); this.stack = next;
    }
  }

  get bytes() {
    return 105 * this.capacity + this.order.byteLength + this.scratch.byteLength + this.rank.byteLength + this.stack.byteLength + this.counts.byteLength + this.offsets.byteLength;
  }
}

function buildTree(state) {
  let tree = treeCache.get(state);
  if (!tree || tree.n !== state.n) { tree = new Octree(state.n); treeCache.set(state, tree); }
  return tree.build(state);
}

/** Conservative working estimate (two nodes/body); pathological trees differ. */
export function estimateTreeBytes(n) { return 222 * n + 1024; }
export function getBarnesHutStats(state) {
  const tree = treeCache.get(state);
  return tree ? { nodeCount: tree.nodeCount, allocatedBytes: tree.bytes, buildMs: tree.buildMs, leafBucket: LEAF_BUCKET } : null;
}

function traverse(state, tree, { epsilon, G, theta }, out, potentialOnly) {
  const { n, positions: p, masses: m } = state;
  const eps2 = epsilon * epsilon, theta2 = theta * theta;
  let energy = 0;
  for (let i = 0; i < n; i++) {
    const k = 3 * i, x = p[k], y = p[k + 1], z = p[k + 2], rank = tree.rank[i];
    let ax = 0, ay = 0, az = 0, phi = 0, top = 0;
    if (n) tree.stack[top++] = 0;
    while (top) {
      const node = tree.stack[--top], mass = tree.mass[node];
      if (mass === 0) continue;
      const start = tree.start[node], count = tree.count[node], contains = rank >= start && rank < start + count;
      const dx = tree.mx[node] - x, dy = tree.my[node] - y, dz = tree.mz[node] - z;
      const distance2 = dx * dx + dy * dy + dz * dz, half = tree.half[node];
      const hasChildren = tree.internal[node] !== 0;
      const accepted = !contains && theta2 > 0 && 4 * half * half < theta2 * distance2;
      // Coincident leaves can be summed exactly, including self subtraction.
      if (accepted || half === 0) {
        const sourceMass = half === 0 && contains ? mass - m[i] : mass;
        if (sourceMass === 0) continue;
        const r2 = distance2 + eps2;
        if (r2 === 0) throw new RangeError('Partículas coincidentes exigem suavização positiva.');
        if (potentialOnly) phi -= G * sourceMass / Math.sqrt(r2);
        else {
          const factor = G * sourceMass / (r2 * Math.sqrt(r2));
          ax += factor * dx; ay += factor * dy; az += factor * dz;
        }
      } else if (hasChildren) {
        tree.ensureStack(top + 8);
        for (let octant = 0; octant < 8; octant++) {
          const child = tree.children[8 * node + octant];
          if (child >= 0) tree.stack[top++] = child;
        }
      } else {
        for (let at = start; at < start + count; at++) {
          const j = tree.order[at];
          if (j === i || m[j] === 0) continue;
          const b = 3 * j, dxj = p[b] - x, dyj = p[b + 1] - y, dzj = p[b + 2] - z;
          const r2 = dxj * dxj + dyj * dyj + dzj * dzj + eps2;
          if (r2 === 0) throw new RangeError('Partículas coincidentes exigem suavização positiva.');
          if (potentialOnly) phi -= G * m[j] / Math.sqrt(r2);
          else {
            const factor = G * m[j] / (r2 * Math.sqrt(r2));
            ax += factor * dxj; ay += factor * dyj; az += factor * dzj;
          }
        }
      }
    }
    if (potentialOnly) energy += 0.5 * m[i] * phi;
    else { out[k] = ax; out[k + 1] = ay; out[k + 2] = az; }
  }
  return potentialOnly ? energy : out;
}

/** Real monopole Barnes–Hut octree; theta=0 gives the exact particle sum. */
export function barnesHutAccelerations(state, options = {}, out = state.accelerations) {
  validateState(state);
  const settings = parameters(options);
  accelerationOutput(state, out);
  return traverse(state, buildTree(state), settings, out, false);
}

/** Approximate energy: one half sum m_i phi_i with matching Plummer epsilon.
 * The directed BH approximation does not exactly preserve total momentum or
 * define a pair-symmetric Hamiltonian; diagnostics label this energy explicitly.
 */
export function barnesHutPotentialEnergy(state, options = {}) {
  validateState(state);
  return traverse(state, buildTree(state), parameters(options), null, true);
}
