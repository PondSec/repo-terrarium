import { BASE_COLORS } from "./dna.js";
import { seededRandom } from "./genome.js";

const BASES = ["A", "C", "G", "T"];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function wrap(value, max) {
  return (value + max) % max;
}

function colorForBase(base) {
  return BASE_COLORS[base] || "#f7fffb";
}

export class LifeLab {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.running = false;
    this.frame = 0;
    this.lastStep = 0;
    this.stepMs = 120;
    this.width = 0;
    this.height = 0;
    this.cols = 0;
    this.rows = 0;
    this.cell = 8;
    this.grid = new Uint8Array(0);
    this.next = new Uint8Array(0);
    this.energy = new Float32Array(0);
    this.rules = {
      birth: new Set([3]),
      survive: new Set([2, 3]),
      drift: 0.02
    };
  }

  setGenome(genome) {
    this.genome = genome;
    this.random = seededRandom(`${genome.seedHex}:life-lab:${genome.digitalDna.sequence.slice(0, 96)}`);
    this.rules = this.buildRules(genome);
    this.resize();
    this.seed();
    this.draw();
  }

  buildRules(genome) {
    const dna = genome.digitalDna;
    const gc = dna.gc;
    const mutation = genome.traits.mutationRate;
    const replication = genome.traits.replication;
    const metabolism = genome.traits.metabolism;
    const birth = new Set([3]);
    const survive = new Set([2, 3]);

    if (gc > 0.52) survive.add(4);
    if (gc < 0.46) birth.add(2);
    if (replication > 0.62) birth.add(4);
    if (metabolism > 0.7) survive.delete(4);
    if (mutation > 0.18) birth.add(5);

    return {
      birth,
      survive,
      drift: clamp(0.01 + mutation * 0.12 + genome.languages.length * 0.002, 0.01, 0.08),
      tempo: Math.round(clamp(150 - genome.traits.pulse * 70 - replication * 40, 54, 160))
    };
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(320, rect.width);
    this.height = Math.max(320, rect.height);
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cell = this.width < 700 ? 7 : 9;
    this.cols = Math.floor(this.width / this.cell);
    this.rows = Math.floor(this.height / this.cell);
    this.grid = new Uint8Array(this.cols * this.rows);
    this.next = new Uint8Array(this.cols * this.rows);
    this.energy = new Float32Array(this.cols * this.rows);
  }

  seed() {
    if (!this.genome) return;
    const sequence = this.genome.digitalDna.sequence;
    const density = clamp(0.16 + Math.log10(this.genome.files + 1) * 0.05 + this.genome.languages.length * 0.012, 0.18, 0.46);
    const cx = this.cols / 2;
    const cy = this.rows / 2;
    const radius = Math.min(this.cols, this.rows) * 0.42;

    for (let index = 0; index < this.grid.length; index += 1) {
      const x = index % this.cols;
      const y = Math.floor(index / this.cols);
      const dx = x - cx;
      const dy = y - cy;
      const falloff = clamp(1 - Math.hypot(dx, dy) / radius, 0, 1);
      const dnaBase = sequence[(index * 7 + x * 11 + y * 13) % sequence.length];
      const threshold = density * (0.22 + falloff * 0.9);
      const alive = this.random() < threshold;
      this.grid[index] = alive ? BASES.indexOf(dnaBase) + 1 : 0;
      this.energy[index] = alive ? 0.45 + this.random() * 0.55 : 0;
    }
  }

  countNeighbors(x, y) {
    let count = 0;
    let dominant = 0;
    const baseCounts = [0, 0, 0, 0, 0];

    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        if (ox === 0 && oy === 0) continue;
        const nx = wrap(x + ox, this.cols);
        const ny = wrap(y + oy, this.rows);
        const value = this.grid[ny * this.cols + nx];
        if (value) {
          count += 1;
          baseCounts[value] += 1;
        }
      }
    }

    for (let base = 1; base < baseCounts.length; base += 1) {
      if (baseCounts[base] > baseCounts[dominant]) dominant = base;
    }

    return { count, dominant };
  }

  step() {
    for (let y = 0; y < this.rows; y += 1) {
      for (let x = 0; x < this.cols; x += 1) {
        const index = y * this.cols + x;
        const value = this.grid[index];
        const { count, dominant } = this.countNeighbors(x, y);
        let nextValue = 0;

        if (value) {
          nextValue = this.rules.survive.has(count) ? value : 0;
          if (nextValue && this.random() < this.rules.drift) {
            nextValue = (value % 4) + 1;
          }
        } else if (this.rules.birth.has(count)) {
          nextValue = dominant || Math.floor(this.random() * 4) + 1;
        }

        this.next[index] = nextValue;
        this.energy[index] = nextValue
          ? clamp((this.energy[index] || 0.25) * 0.82 + count * 0.035 + 0.12, 0.18, 1)
          : this.energy[index] * 0.82;
      }
    }

    [this.grid, this.next] = [this.next, this.grid];
    this.next.fill(0);
    this.frame += 1;
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#030505";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = "rgba(247, 255, 251, 0.045)";

    for (let y = 0; y < this.rows; y += 1) {
      for (let x = 0; x < this.cols; x += 1) {
        const index = y * this.cols + x;
        const value = this.grid[index];
        if (!value && this.energy[index] < 0.04) continue;
        const base = BASES[value - 1] || "A";
        const alpha = value ? 0.28 + this.energy[index] * 0.58 : this.energy[index] * 0.18;
        ctx.fillStyle = value ? `${colorForBase(base)}${Math.round(alpha * 255).toString(16).padStart(2, "0")}` : "rgba(247, 255, 251, 0.035)";
        const inset = value ? 1 : 2;
        ctx.fillRect(x * this.cell + inset, y * this.cell + inset, this.cell - inset * 2, this.cell - inset * 2);
      }
    }

    ctx.fillStyle = "rgba(247, 255, 251, 0.62)";
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    ctx.fillText(`generation ${this.frame}`, 18, this.height - 24);
  }

  tick(now = performance.now()) {
    if (!this.running) return;
    if (now - this.lastStep > this.rules.tempo) {
      this.step();
      this.draw();
      this.lastStep = now;
    }
    this.raf = requestAnimationFrame((time) => this.tick(time));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastStep = 0;
    this.tick();
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
  }

  reset() {
    this.seed();
    this.frame = 0;
    this.draw();
  }
}
