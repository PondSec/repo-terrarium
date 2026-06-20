import { colorFromString, hashString, seededRandom } from "./genome.js";

const TAU = Math.PI * 2;

function mix(a, b, amount) {
  return a + (b - a) * amount;
}

function limitVector(entity, maxSpeed) {
  const speed = Math.hypot(entity.vx, entity.vy);
  if (speed > maxSpeed) {
    entity.vx = (entity.vx / speed) * maxSpeed;
    entity.vy = (entity.vy / speed) * maxSpeed;
  }
}

export class Terrarium {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.entities = [];
    this.pulses = [];
    this.frame = 0;
    this.lastTime = performance.now();
    this.paused = false;
    this.pointer = {
      x: 0,
      y: 0,
      active: false,
      force: 0
    };

    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    this.bindPointer();
    this.resize();
    window.addEventListener("resize", this.resize);
    requestAnimationFrame(this.tick);
  }

  bindPointer() {
    const update = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const point = event.touches ? event.touches[0] : event;
      this.pointer.x = point.clientX - rect.left;
      this.pointer.y = point.clientY - rect.top;
      this.pointer.active = true;
      this.pointer.force = 1;
    };

    this.canvas.addEventListener("pointermove", update);
    this.canvas.addEventListener("pointerdown", (event) => {
      update(event);
      this.injectPulse(this.pointer.x, this.pointer.y, 1.2);
    });
    this.canvas.addEventListener("pointerleave", () => {
      this.pointer.active = false;
    });
    this.canvas.addEventListener("touchmove", update, { passive: true });
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(320, rect.width);
    this.height = Math.max(320, rect.height);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.paintBackdrop(1);
  }

  setGenome(genome) {
    this.genome = genome;
    this.random = seededRandom(`${genome.seedHex}:terrarium`);
    this.entities = [];
    this.pulses = [];
    this.frame = 0;
    this.paintBackdrop(1);

    const population = genome.traits.population;
    const paths = genome.paths.length ? genome.paths : [genome.repo];
    const cx = this.width / 2;
    const cy = this.height / 2;
    const shortest = Math.min(this.width, this.height);

    for (let index = 0; index < population; index += 1) {
      const path = paths[index % paths.length];
      const pathHash = hashString(`${genome.seedHex}:${path}:${index}`);
      const angle = (pathHash % 10000) / 10000 * TAU;
      const ring = 0.14 + this.random() * 0.44 + (index % 9) * 0.012;
      const radius = shortest * ring;
      const language = genome.languages[index % Math.max(1, genome.languages.length)];
      const color = language?.color || colorFromString(path);
      const size = 1.2 + this.random() * 2.8 + genome.traits.bloom * 1.6;

      this.entities.push({
        x: cx + Math.cos(angle) * radius * (0.7 + this.random() * 0.6),
        y: cy + Math.sin(angle) * radius * (0.7 + this.random() * 0.6),
        px: cx,
        py: cy,
        vx: (this.random() - 0.5) * 1.2,
        vy: (this.random() - 0.5) * 1.2,
        theta: angle,
        ring,
        spin: (this.random() > 0.5 ? 1 : -1) * (0.2 + this.random() * 0.9),
        size,
        color,
        path,
        digest: pathHash,
        phase: this.random() * TAU,
        mass: 0.6 + this.random() * 1.8
      });
    }
  }

  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }

  injectPulse(x = this.width / 2, y = this.height / 2, strength = 1) {
    this.pulses.push({
      x,
      y,
      radius: 4,
      strength,
      life: 1
    });
  }

  paintBackdrop(alpha = 0.18) {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      this.width * 0.5,
      this.height * 0.42,
      0,
      this.width * 0.5,
      this.height * 0.5,
      Math.max(this.width, this.height) * 0.72
    );
    gradient.addColorStop(0, `rgba(18, 24, 22, ${alpha})`);
    gradient.addColorStop(0.46, `rgba(7, 10, 11, ${alpha})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${alpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  update(delta) {
    if (!this.genome) {
      return;
    }

    const cx = this.width / 2;
    const cy = this.height / 2;
    const shortest = Math.min(this.width, this.height);
    const heat = this.genome.traits.heat;
    const orbit = this.genome.traits.orbit;
    const turbulence = this.genome.traits.turbulence;
    const pulse = this.genome.traits.pulse;
    const time = this.frame * 0.006;
    const maxSpeed = 0.8 + heat * 2.8;

    this.pointer.force = mix(this.pointer.force, this.pointer.active ? 1 : 0, 0.04);

    for (const entity of this.entities) {
      entity.px = entity.x;
      entity.py = entity.y;
      entity.theta += delta * entity.spin * (0.12 + pulse * 0.24);

      const breathe = Math.sin(time * (0.8 + pulse) + entity.phase) * 0.12;
      const targetRadius = shortest * entity.ring * (1 + breathe + orbit * 0.18);
      const wobble = Math.sin(time * 2.3 + entity.digest * 0.00001) * turbulence * 38;
      const tx = cx + Math.cos(entity.theta) * (targetRadius + wobble);
      const ty = cy + Math.sin(entity.theta) * (targetRadius - wobble * 0.5);
      const dx = tx - entity.x;
      const dy = ty - entity.y;

      entity.vx += dx * 0.0009 * entity.mass;
      entity.vy += dy * 0.0009 * entity.mass;
      entity.vx += Math.cos(entity.phase + time * 3.1) * 0.018 * turbulence;
      entity.vy += Math.sin(entity.phase + time * 2.7) * 0.018 * turbulence;

      if (this.pointer.force > 0.01) {
        const pdx = entity.x - this.pointer.x;
        const pdy = entity.y - this.pointer.y;
        const distance = Math.max(24, Math.hypot(pdx, pdy));
        const field = Math.max(0, 1 - distance / (shortest * 0.42)) * this.pointer.force;
        entity.vx += (pdx / distance) * field * 0.55;
        entity.vy += (pdy / distance) * field * 0.55;
      }

      for (const burst of this.pulses) {
        const bdx = entity.x - burst.x;
        const bdy = entity.y - burst.y;
        const distance = Math.max(12, Math.hypot(bdx, bdy));
        const shell = Math.max(0, 1 - Math.abs(distance - burst.radius) / 80);
        entity.vx += (bdx / distance) * shell * burst.strength * 0.3;
        entity.vy += (bdy / distance) * shell * burst.strength * 0.3;
      }

      limitVector(entity, maxSpeed);
      entity.x += entity.vx * delta * 58;
      entity.y += entity.vy * delta * 58;
      entity.vx *= 0.982;
      entity.vy *= 0.982;

      if (entity.x < -40) entity.x = this.width + 40;
      if (entity.x > this.width + 40) entity.x = -40;
      if (entity.y < -40) entity.y = this.height + 40;
      if (entity.y > this.height + 40) entity.y = -40;
    }

    this.pulses = this.pulses
      .map((burst) => ({
        ...burst,
        radius: burst.radius + delta * 260 * (0.8 + pulse),
        life: burst.life - delta * 0.72
      }))
      .filter((burst) => burst.life > 0);
  }

  drawNucleus() {
    const ctx = this.ctx;
    const genome = this.genome;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const shortest = Math.min(this.width, this.height);
    const baseRadius = shortest * 0.07;
    const ringRadius = shortest * (0.11 + genome.traits.orbit * 0.05);
    let start = -Math.PI / 2 + this.frame * 0.003;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 2;
    for (const language of genome.languages.slice(0, 7)) {
      const span = Math.max(0.08, language.ratio * TAU);
      ctx.beginPath();
      ctx.strokeStyle = language.color;
      ctx.globalAlpha = 0.42;
      ctx.arc(cx, cy, ringRadius, start, start + span * 0.86);
      ctx.stroke();
      start += span;
    }

    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 2.5);
    core.addColorStop(0, "rgba(255, 255, 255, 0.58)");
    core.addColorStop(0.18, `${genome.palette[0]}`);
    core.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.globalAlpha = 0.16 + genome.traits.pulse * 0.14;
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius * (0.98 + Math.sin(this.frame * 0.025) * 0.06), 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawThreads() {
    const ctx = this.ctx;
    const branch = this.genome.traits.branching;
    const maxDistance = Math.min(this.width, this.height) * (0.065 + branch * 0.07);
    const step = this.entities.length > 180 ? 3 : 2;
    let lines = 0;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 0.7;
    for (let a = 0; a < this.entities.length; a += step) {
      const first = this.entities[a];
      for (let b = a + step; b < this.entities.length; b += step) {
        const second = this.entities[b];
        const dx = first.x - second.x;
        const dy = first.y - second.y;
        const distance = Math.hypot(dx, dy);
        if (distance > maxDistance) {
          continue;
        }
        const sameFamily = (first.digest ^ second.digest) % 5 === 0;
        if (!sameFamily && distance > maxDistance * 0.62) {
          continue;
        }
        ctx.globalAlpha = (1 - distance / maxDistance) * 0.22 * branch;
        ctx.strokeStyle = sameFamily ? first.color : "rgba(255, 255, 255, 0.8)";
        ctx.beginPath();
        ctx.moveTo(first.x, first.y);
        ctx.lineTo(second.x, second.y);
        ctx.stroke();
        lines += 1;
        if (lines > 780) {
          ctx.restore();
          return;
        }
      }
    }
    ctx.restore();
  }

  drawEntities() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const entity of this.entities) {
      const speed = Math.hypot(entity.vx, entity.vy);
      ctx.globalAlpha = 0.18 + Math.min(0.5, speed * 0.16);
      ctx.strokeStyle = entity.color;
      ctx.lineWidth = Math.max(0.8, entity.size * 0.38);
      ctx.beginPath();
      ctx.moveTo(entity.px, entity.py);
      ctx.lineTo(entity.x, entity.y);
      ctx.stroke();

      ctx.globalAlpha = 0.72;
      ctx.fillStyle = entity.color;
      ctx.beginPath();
      ctx.arc(entity.x, entity.y, entity.size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPulses() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const burst of this.pulses) {
      ctx.globalAlpha = Math.max(0, burst.life) * 0.5;
      ctx.strokeStyle = this.genome.palette[Math.floor(burst.radius) % this.genome.palette.length];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, burst.radius, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  render() {
    this.paintBackdrop(0.16);
    if (!this.genome) {
      return;
    }
    this.drawThreads();
    this.drawEntities();
    this.drawNucleus();
    this.drawPulses();
  }

  tick(now) {
    const delta = Math.min(0.033, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;
    if (!this.paused) {
      this.frame += 1;
      this.update(delta);
      this.render();
    }
    requestAnimationFrame(this.tick);
  }

  snapshot() {
    return this.canvas.toDataURL("image/png");
  }
}
