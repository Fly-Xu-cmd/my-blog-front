// A fixed-size displacement field: each gesture adds velocity, never replaces
// another gesture. Critically damped springs return gas to its moving current.
export class SkyMotion {
  columns = 0;
  rows = 0;
  private width = 1;
  private height = 1;
  private x = new Float32Array(0);
  private y = new Float32Array(0);
  private vx = new Float32Array(0);
  private vy = new Float32Array(0);
  private nextVX = new Float32Array(0);
  private nextVY = new Float32Array(0);
  energy = 0;

  constructor(width: number, height: number) {
    this.resize(width, height);
  }

  private interpolate(values: Float32Array, u: number, v: number) {
    const gx = Math.max(0, Math.min(1, u)) * (this.columns - 1);
    const gy = Math.max(0, Math.min(1, v)) * (this.rows - 1);
    const left = Math.floor(gx),
      top = Math.floor(gy);
    const right = Math.min(this.columns - 1, left + 1);
    const bottom = Math.min(this.rows - 1, top + 1);
    const tx = gx - left,
      ty = gy - top;
    return (
      (values[top * this.columns + left] * (1 - tx) +
        values[top * this.columns + right] * tx) *
        (1 - ty) +
      (values[bottom * this.columns + left] * (1 - tx) +
        values[bottom * this.columns + right] * tx) *
        ty
    );
  }

  sample(u: number, v: number): [number, number] {
    return [
      this.limit(this.interpolate(this.x, u, v)),
      this.limit(this.interpolate(this.y, u, v)),
    ];
  }

  private limit(value: number) {
    return 360 * Math.tanh(value / 360);
  }

  resize(width: number, height: number) {
    const columns = Math.max(
      24,
      Math.round((64 * width) / Math.max(width, height)),
    );
    const rows = Math.max(
      24,
      Math.round((64 * height) / Math.max(width, height)),
    );
    if (columns === this.columns && rows === this.rows) {
      this.width = width;
      this.height = height;
      return;
    }
    const old = [this.x, this.y, this.vx, this.vy];
    const next = old.map((values) => {
      const result = new Float32Array(columns * rows);
      if (this.columns) {
        for (let j = 0; j < rows; j++)
          for (let i = 0; i < columns; i++) {
            result[j * columns + i] = this.interpolate(
              values,
              i / (columns - 1),
              j / (rows - 1),
            );
          }
      }
      return result;
    });
    [this.x, this.y, this.vx, this.vy] = next;
    this.columns = columns;
    this.rows = rows;
    this.width = width;
    this.height = height;
    this.nextVX = new Float32Array(columns * rows);
    this.nextVY = new Float32Array(columns * rows);
    this.measure();
  }

  kick(x: number, y: number) {
    const radius = Math.min(
      760,
      Math.max(360, Math.min(this.width, this.height) * 0.95),
    );
    const strength = 500 * Math.min(1, Math.min(this.width, this.height) / 600);
    for (let j = 0; j < this.rows; j++)
      for (let i = 0; i < this.columns; i++) {
        const index = j * this.columns + i;
        const dx = (i / (this.columns - 1)) * this.width - x;
        const dy = (j / (this.rows - 1)) * this.height - y;
        const length = Math.sqrt(dx * dx + dy * dy + 6400);
        const rx = dx / length,
          ry = dy / length;
        const curl =
          Math.sin(dx * 0.009 + dy * 0.005) * 0.6 +
          Math.cos(dy * 0.012 - dx * 0.003) * 0.4;
        const weight = Math.exp(
          (-(dx * dx + dy * dy) / (radius * radius)) * 1.7,
        );
        // Broad outward flow, with unequal sideways currents to break up the gas.
        this.vx[index] = this.capVelocity(
          this.vx[index] + (rx - ry * curl * 0.65) * weight * strength,
        );
        this.vy[index] = this.capVelocity(
          this.vy[index] + (ry + rx * curl * 0.65) * weight * strength,
        );
      }
    this.energy = Math.max(this.energy, 1);
  }

  private capVelocity(value: number) {
    return 1400 * Math.tanh(value / 1400);
  }

  advance(dt: number) {
    if (dt > 0.15) {
      // A suspended/dropped frame must settle elapsed time, not replay hundreds
      // of simulation steps or jump through a clamped animation duration.
      const decay = Math.exp(-1.5 * dt);
      for (let i = 0; i < this.x.length; i++) {
        const bx = this.vx[i] + 1.5 * this.x[i];
        const by = this.vy[i] + 1.5 * this.y[i];
        this.x[i] = (this.x[i] + bx * dt) * decay;
        this.y[i] = (this.y[i] + by * dt) * decay;
        this.vx[i] = (this.vx[i] - 1.5 * bx * dt) * decay;
        this.vy[i] = (this.vy[i] - 1.5 * by * dt) * decay;
      }
    } else {
      const steps = Math.ceil(dt * 120);
      const step = steps ? dt / steps : 0;
      for (let n = 0; n < steps; n++) {
        for (let j = 0; j < this.rows; j++)
          for (let i = 0; i < this.columns; i++) {
            const index = j * this.columns + i;
            const left = j * this.columns + Math.max(0, i - 1);
            const right = j * this.columns + Math.min(this.columns - 1, i + 1);
            const top = Math.max(0, j - 1) * this.columns + i;
            const bottom = Math.min(this.rows - 1, j + 1) * this.columns + i;
            const ax =
              -2.25 * this.x[index] -
              3 * this.vx[index] +
              (this.vx[left] +
                this.vx[right] +
                this.vx[top] +
                this.vx[bottom] -
                4 * this.vx[index]) *
                2;
            const ay =
              -2.25 * this.y[index] -
              3 * this.vy[index] +
              (this.vy[left] +
                this.vy[right] +
                this.vy[top] +
                this.vy[bottom] -
                4 * this.vy[index]) *
                2;
            this.nextVX[index] = this.vx[index] + ax * step;
            this.nextVY[index] = this.vy[index] + ay * step;
          }
        [this.vx, this.nextVX] = [this.nextVX, this.vx];
        [this.vy, this.nextVY] = [this.nextVY, this.vy];
        for (let i = 0; i < this.x.length; i++) {
          this.x[i] += this.vx[i] * step;
          this.y[i] += this.vy[i] * step;
        }
      }
    }
    this.measure();
  }

  private measure() {
    this.energy = 0;
    for (let i = 0; i < this.x.length; i++) {
      this.energy = Math.max(
        this.energy,
        Math.abs(this.x[i]),
        Math.abs(this.y[i]),
        Math.abs(this.vx[i]) / 3,
        Math.abs(this.vy[i]) / 3,
      );
    }
  }
}

// Broad curved paths carry clouds across the scene; the fine layer overtakes
// the distant layer. Bounded orbital motion has no wrap seam or reset point.
export function ambientDrift(time: number, layer: number): [number, number] {
  const phase = layer * 0.55;
  const rate = 0.025 + layer * 0.009;
  return [
    (Math.sin(time * rate + phase) - Math.sin(phase)) * 150,
    (Math.cos(time * rate * 0.8 + phase) - Math.cos(phase)) * 95,
  ];
}
