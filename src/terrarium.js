import { BASE_COLORS } from "./dna.js";
import { colorFromString, hashString, seededRandom } from "./genome.js";

const TAU = Math.PI * 2;
const BASES = ["A", "C", "G", "T"];
const PAIRS = { A: "T", T: "A", C: "G", G: "C" };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mix(a, b, amount) {
  return a + (b - a) * amount;
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
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
    this.nutrients = [];
    this.pulses = [];
    this.helixProfile = this.createHelixProfile(genome);
    this.births = 0;
    this.deaths = 0;
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
    this.random = seededRandom(`${genome.seedHex}:terrarium-life`);
    this.entities = [];
    this.nutrients = [];
    this.pulses = [];
    this.births = 0;
    this.deaths = 0;
    this.frame = 0;
    this.paintBackdrop(1);

    const population = genome.traits.population;
    const paths = genome.paths.length ? genome.paths : [genome.repo];
    const shortest = Math.min(this.width, this.height);

    for (let index = 0; index < Math.round(population * 0.72); index += 1) {
      const path = paths[index % paths.length];
      const language = genome.languages[index % Math.max(1, genome.languages.length)];
      this.entities.push(this.createOrganism({
        path,
        language,
        generation: 0,
        energy: 42 + this.random() * 46,
        x: this.width / 2 + (this.random() - 0.5) * shortest * 0.56,
        y: this.height / 2 + (this.random() - 0.5) * shortest * 0.56
      }));
    }

    for (let index = 0; index < Math.max(90, Math.round(population * 0.9)); index += 1) {
      this.spawnNutrient(paths[index % paths.length], true);
    }
  }

  createHelixProfile(genome) {
    const random = seededRandom(`${genome.seedHex}:visible-helix:${genome.digitalDna.sequence.slice(0, 48)}`);
    const dominant = genome.digitalDna.dominantCodons[0]?.triplet || "ATG";
    const dominantValue = dominant.split("").reduce((sum, base) => sum + BASES.indexOf(base) + 1, 0);
    const gcBias = genome.digitalDna.gc - 0.5;

    return {
      amplitude: 24 + random() * 34 + Math.abs(gcBias) * 28,
      spacing: 7.5 + random() * 4.5,
      twist: 0.26 + random() * 0.24 + dominantValue * 0.012,
      tilt: (random() - 0.5) * 0.42,
      drift: (random() - 0.5) * 18,
      visibleBases: 42 + Math.floor(random() * 28),
      startOffset: Math.floor(random() * genome.digitalDna.sequence.length),
      labelEvery: 8 + Math.floor(random() * 6)
    };
  }

  createOrganism({ path, language, generation, energy, x, y, parent }) {
    const genome = this.genome;
    const dna = genome.digitalDna;
    const digest = hashString(`${genome.seedHex}:${path}:${generation}:${this.random()}`);
    const dnaIndex = digest % Math.max(3, dna.sequence.length - 3);
    const base = dna.sequence[dnaIndex] || BASES[digest % 4];
    const codonStart = dnaIndex - (dnaIndex % 3);
    const codon = dna.sequence.slice(codonStart, codonStart + 3) || "ATG";
    const phenotype = dna.phenotype;
    const mutation = clamp(genome.traits.mutationRate + generation * 0.004, 0.01, 0.35);
    const languageColor = language?.color || colorFromString(path);
    const color = parent && this.random() < mutation
      ? BASE_COLORS[BASES[Math.floor(this.random() * BASES.length)]]
      : languageColor;
    const mass = 0.7 + this.random() * 1.4 + phenotype.adhesion * 0.8;
    const lifespan = 920 + phenotype.longevity * 1900 + this.random() * 720;

    return {
      x,
      y,
      px: x,
      py: y,
      vx: (this.random() - 0.5) * 0.9,
      vy: (this.random() - 0.5) * 0.9,
      angle: this.random() * TAU,
      spin: (this.random() > 0.5 ? 1 : -1) * (0.16 + phenotype.motility * 0.7),
      phase: this.random() * TAU,
      path,
      language: language?.name || "Other",
      digest,
      dnaIndex,
      base,
      pair: PAIRS[base],
      codon,
      color,
      baseColor: BASE_COLORS[base],
      generation,
      energy,
      age: 0,
      mass,
      size: 2.2 + mass * 2.2 + phenotype.adhesion * 2.6,
      speed: 0.4 + phenotype.motility * 1.9 + this.random() * 0.5,
      sense: 48 + phenotype.perception * 170,
      metabolism: 0.025 + genome.traits.metabolism * 0.055 + mass * 0.006,
      fertility: 0.04 + genome.traits.replication * 0.18,
      lifespan,
      target: null
    };
  }

  spawnNutrient(path, anywhere = false) {
    const genome = this.genome;
    const digest = hashString(`${genome.seedHex}:nutrient:${path}:${this.nutrients.length}:${this.frame}`);
    const base = genome.digitalDna.sequence[digest % genome.digitalDna.sequence.length] || BASES[digest % 4];
    const margin = 60;
    const shortest = Math.min(this.width, this.height);
    const angle = this.random() * TAU;
    const radius = anywhere ? this.random() * shortest * 0.48 : shortest * (0.18 + this.random() * 0.38);

    this.nutrients.push({
      x: anywhere ? margin + this.random() * (this.width - margin * 2) : this.width / 2 + Math.cos(angle) * radius,
      y: anywhere ? margin + this.random() * (this.height - margin * 2) : this.height / 2 + Math.sin(angle) * radius,
      base,
      color: BASE_COLORS[base],
      energy: 12 + (digest % 17),
      age: 0,
      phase: this.random() * TAU
    });
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

    const paths = this.genome?.paths || [];
    for (let index = 0; index < 12 && paths.length; index += 1) {
      this.spawnNutrient(paths[(this.frame + index) % paths.length]);
    }
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
    gradient.addColorStop(0, `rgba(14, 20, 18, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(6, 8, 8, ${alpha})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${alpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  findNutrient(entity) {
    let best = null;
    let bestDistance = entity.sense * entity.sense;

    for (let index = 0; index < this.nutrients.length; index += 1) {
      const nutrient = this.nutrients[index];
      const value = distanceSquared(entity, nutrient);
      const baseMatch = nutrient.base === entity.base ? 0.72 : 1;
      if (value * baseMatch < bestDistance) {
        bestDistance = value * baseMatch;
        best = { nutrient, index, distance: Math.sqrt(value) };
      }
    }

    return best;
  }

  update(delta) {
    if (!this.genome) {
      return;
    }

    const genome = this.genome;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const shortest = Math.min(this.width, this.height);
    const heat = genome.traits.heat;
    const orbit = genome.traits.orbit;
    const turbulence = genome.traits.turbulence;
    const pulse = genome.traits.pulse;
    const photosynthesis = genome.digitalDna.phenotype.photosynthesis;
    const time = this.frame * 0.006;
    const maxPopulation = Math.round(genome.traits.population * (1.15 + photosynthesis * 0.25));
    const nutrientTarget = Math.round(genome.traits.population * (0.72 + photosynthesis * 0.48));
    const paths = genome.paths.length ? genome.paths : [genome.repo];

    this.pointer.force = mix(this.pointer.force, this.pointer.active ? 1 : 0, 0.04);

    if (this.nutrients.length < nutrientTarget && this.random() < 0.35 + photosynthesis * 0.4) {
      this.spawnNutrient(paths[(this.frame + this.nutrients.length) % paths.length]);
    }

    for (const nutrient of this.nutrients) {
      nutrient.age += delta;
    }

    const newborns = [];
    const survivors = [];

    for (const entity of this.entities) {
      entity.px = entity.x;
      entity.py = entity.y;
      entity.age += 1;
      entity.angle += entity.spin * delta * (0.8 + pulse);
      entity.energy -= entity.metabolism * (1 + heat * 0.5);

      const nearest = this.findNutrient(entity);
      if (nearest) {
        const dx = nearest.nutrient.x - entity.x;
        const dy = nearest.nutrient.y - entity.y;
        const distance = Math.max(1, nearest.distance);
        const hunger = clamp((95 - entity.energy) / 80, 0.15, 1.25);
        entity.vx += (dx / distance) * entity.speed * hunger * delta * 1.8;
        entity.vy += (dy / distance) * entity.speed * hunger * delta * 1.8;

        if (distance < entity.size + 5) {
          const [eaten] = this.nutrients.splice(nearest.index, 1);
          entity.energy += eaten.energy * (0.8 + genome.traits.metabolism);
          entity.base = eaten.base;
          entity.baseColor = BASE_COLORS[eaten.base];
          entity.pair = PAIRS[eaten.base];
        }
      }

      const ring = shortest * (0.14 + ((entity.digest % 1000) / 1000) * 0.36);
      const orbitX = cx + Math.cos(entity.angle + time) * ring * (0.8 + orbit * 0.2);
      const orbitY = cy + Math.sin(entity.angle + time) * ring * (0.78 + orbit * 0.18);
      entity.vx += (orbitX - entity.x) * 0.00045 * (0.5 + genome.traits.adhesion);
      entity.vy += (orbitY - entity.y) * 0.00045 * (0.5 + genome.traits.adhesion);
      entity.vx += Math.cos(entity.phase + time * 3.1) * 0.018 * turbulence;
      entity.vy += Math.sin(entity.phase + time * 2.7) * 0.018 * turbulence;

      if (this.pointer.force > 0.01) {
        const pdx = entity.x - this.pointer.x;
        const pdy = entity.y - this.pointer.y;
        const distance = Math.max(24, Math.hypot(pdx, pdy));
        const field = Math.max(0, 1 - distance / (shortest * 0.42)) * this.pointer.force;
        entity.vx += (pdx / distance) * field * 0.62;
        entity.vy += (pdy / distance) * field * 0.62;
        entity.energy -= field * 0.04;
      }

      for (const burst of this.pulses) {
        const bdx = entity.x - burst.x;
        const bdy = entity.y - burst.y;
        const distance = Math.max(12, Math.hypot(bdx, bdy));
        const shell = Math.max(0, 1 - Math.abs(distance - burst.radius) / 80);
        entity.vx += (bdx / distance) * shell * burst.strength * 0.34;
        entity.vy += (bdy / distance) * shell * burst.strength * 0.34;
        entity.energy += shell * burst.strength * 0.12;
      }

      limitVector(entity, entity.speed * (0.75 + heat));
      entity.x += entity.vx * delta * 58;
      entity.y += entity.vy * delta * 58;
      entity.vx *= 0.982 - genome.traits.adhesion * 0.018;
      entity.vy *= 0.982 - genome.traits.adhesion * 0.018;

      if (entity.x < -40) entity.x = this.width + 40;
      if (entity.x > this.width + 40) entity.x = -40;
      if (entity.y < -40) entity.y = this.height + 40;
      if (entity.y > this.height + 40) entity.y = -40;

      const old = entity.age > entity.lifespan;
      const empty = entity.energy <= 0;
      if (old || empty) {
        this.deaths += 1;
        if (this.random() < 0.7) {
          this.nutrients.push({
            x: entity.x,
            y: entity.y,
            base: entity.pair,
            color: BASE_COLORS[entity.pair],
            energy: 10 + entity.mass * 4,
            age: 0,
            phase: this.random() * TAU
          });
        }
        continue;
      }

      const canBirth = entity.energy > 105 && this.entities.length + newborns.length < maxPopulation;
      const birthChance = entity.fertility * delta * (0.12 + genome.traits.replication);
      if (canBirth && this.random() < birthChance) {
        const childPath = paths[(entity.digest + entity.generation + this.births) % paths.length];
        const language = genome.languages[(entity.digest + this.births) % Math.max(1, genome.languages.length)];
        entity.energy *= 0.58;
        newborns.push(this.createOrganism({
          path: childPath,
          language,
          generation: entity.generation + 1,
          energy: entity.energy * 0.72,
          x: entity.x + (this.random() - 0.5) * 18,
          y: entity.y + (this.random() - 0.5) * 18,
          parent: entity
        }));
        this.births += 1;
      }

      survivors.push(entity);
    }

    this.entities = survivors.concat(newborns);
    this.pulses = this.pulses
      .map((burst) => ({
        ...burst,
        radius: burst.radius + delta * 260 * (0.8 + pulse),
        life: burst.life - delta * 0.72
      }))
      .filter((burst) => burst.life > 0);
  }

  drawDnaStrand() {
    const ctx = this.ctx;
    const dna = this.genome.digitalDna;
    const profile = this.helixProfile;
    const sequence = dna.sequence;
    const compact = this.width < 760;
    const visible = compact ? Math.min(36, profile.visibleBases) : profile.visibleBases;
    const spacing = compact ? Math.min(8, profile.spacing) : profile.spacing;
    const height = visible * spacing;
    const amplitude = compact ? Math.min(28, profile.amplitude * 0.68) : profile.amplitude;
    const x = compact ? this.width - 78 : this.width - 210 + profile.drift;
    const y = compact ? 132 : 94;
    const start = (profile.startOffset + Math.floor(this.frame * (0.12 + this.genome.traits.mutationRate)) * 3) % Math.max(3, sequence.length - visible);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1;
    ctx.translate(x, y);
    ctx.rotate(profile.tilt);

    for (let index = 0; index < visible; index += 1) {
      const base = sequence[(start + index) % sequence.length];
      const pair = PAIRS[base];
      const phase = index * profile.twist + this.frame * 0.014;
      const yy = index * spacing;
      const waist = 0.78 + Math.sin(index * 0.17 + this.genome.seed * 0.00001) * 0.2;
      const leftX = Math.sin(phase) * amplitude * waist;
      const rightX = -Math.sin(phase) * amplitude * waist;
      const front = Math.cos(phase) > 0;

      ctx.globalAlpha = front ? 0.42 : 0.12;
      ctx.strokeStyle = BASE_COLORS[base];
      ctx.beginPath();
      ctx.moveTo(leftX, yy);
      ctx.lineTo(rightX, yy);
      ctx.stroke();

      ctx.globalAlpha = front ? 0.82 : 0.26;
      ctx.fillStyle = BASE_COLORS[base];
      ctx.beginPath();
      ctx.arc(leftX, yy, front ? 2.6 : 1.8, 0, TAU);
      ctx.fill();

      ctx.fillStyle = BASE_COLORS[pair];
      ctx.beginPath();
      ctx.arc(rightX, yy, front ? 2.6 : 1.8, 0, TAU);
      ctx.fill();

      if (front && index % profile.labelEvery === 0 && this.width > 980) {
        ctx.globalAlpha = 0.54;
        ctx.fillStyle = "rgba(244, 255, 249, 0.72)";
        ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText(`${base}-${pair}`, amplitude + 13, yy + 3);
      }
    }

    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "rgba(244, 255, 249, 0.7)";
    ctx.beginPath();
    for (let index = 0; index < visible; index += 1) {
      const phase = index * profile.twist + this.frame * 0.014;
      const waist = 0.78 + Math.sin(index * 0.17 + this.genome.seed * 0.00001) * 0.2;
      const xx = Math.sin(phase) * amplitude * waist;
      const yy = index * spacing;
      if (index === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let index = 0; index < visible; index += 1) {
      const phase = index * profile.twist + this.frame * 0.014;
      const waist = 0.78 + Math.sin(index * 0.17 + this.genome.seed * 0.00001) * 0.2;
      const xx = -Math.sin(phase) * amplitude * waist;
      const yy = index * spacing;
      if (index === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();

    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "rgba(244, 255, 249, 0.28)";
    ctx.strokeRect(-amplitude - 15, -14, amplitude * 2 + 30, height + 24);
    ctx.restore();
  }

  drawNutrients() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const nutrient of this.nutrients) {
      const pulse = 1 + Math.sin(this.frame * 0.04 + nutrient.phase) * 0.25;
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = nutrient.color;
      ctx.fillRect(nutrient.x - 1.5 * pulse, nutrient.y - 1.5 * pulse, 3 * pulse, 3 * pulse);
    }
    ctx.restore();
  }

  drawThreads() {
    const ctx = this.ctx;
    const branch = this.genome.traits.branching;
    const maxDistance = Math.min(this.width, this.height) * (0.05 + branch * 0.08);
    const step = this.entities.length > 180 ? 4 : 3;
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
        const sameBase = first.base === second.base;
        if (distance > maxDistance || (!sameBase && distance > maxDistance * 0.58)) {
          continue;
        }
        ctx.globalAlpha = (1 - distance / maxDistance) * (sameBase ? 0.28 : 0.12) * branch;
        ctx.strokeStyle = sameBase ? first.baseColor : "rgba(244, 255, 249, 0.7)";
        ctx.beginPath();
        ctx.moveTo(first.x, first.y);
        ctx.lineTo(second.x, second.y);
        ctx.stroke();
        lines += 1;
        if (lines > 860) {
          ctx.restore();
          return;
        }
      }
    }
    ctx.restore();
  }

  drawOrganisms() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const entity of this.entities) {
      const speed = Math.hypot(entity.vx, entity.vy);
      const energy = clamp(entity.energy / 120, 0.12, 1);
      const size = entity.size * (0.75 + energy * 0.45);

      ctx.globalAlpha = 0.16 + Math.min(0.42, speed * 0.16);
      ctx.strokeStyle = entity.color;
      ctx.lineWidth = Math.max(0.8, size * 0.24);
      ctx.beginPath();
      ctx.moveTo(entity.px, entity.py);
      ctx.lineTo(entity.x, entity.y);
      ctx.stroke();

      ctx.globalAlpha = 0.48 + energy * 0.34;
      ctx.strokeStyle = entity.baseColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(entity.x, entity.y, size * 1.25, size * 0.78, entity.angle, 0, TAU);
      ctx.stroke();

      ctx.globalAlpha = 0.68;
      ctx.fillStyle = entity.color;
      ctx.beginPath();
      ctx.ellipse(entity.x, entity.y, size, size * 0.62, entity.angle, 0, TAU);
      ctx.fill();

      ctx.globalAlpha = 0.78;
      ctx.fillStyle = entity.baseColor;
      ctx.beginPath();
      ctx.arc(entity.x + Math.cos(entity.angle) * size * 0.22, entity.y + Math.sin(entity.angle) * size * 0.22, Math.max(1.2, size * 0.24), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawNucleus() {
    const ctx = this.ctx;
    const genome = this.genome;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const shortest = Math.min(this.width, this.height);
    const baseRadius = shortest * 0.052;
    const ringRadius = shortest * (0.1 + genome.traits.orbit * 0.045);
    let start = -Math.PI / 2 + this.frame * 0.003;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1.6;
    for (const gene of genome.digitalDna.genes) {
      const span = Math.max(0.08, gene.expression * 0.72);
      const color = BASE_COLORS[gene.leadCodon[0]] || genome.palette[0];
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.2 + gene.expression * 0.42;
      ctx.arc(cx, cy, ringRadius + gene.expression * 18, start, start + span);
      ctx.stroke();
      start += span + 0.05;
    }

    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 3);
    core.addColorStop(0, "rgba(244, 255, 249, 0.64)");
    core.addColorStop(0.26, genome.palette[0]);
    core.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.globalAlpha = 0.2 + genome.traits.pulse * 0.18;
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius * (1 + Math.sin(this.frame * 0.025) * 0.06), 0, TAU);
    ctx.fill();
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
    this.paintBackdrop(0.14);
    if (!this.genome) {
      return;
    }
    this.drawDnaStrand();
    this.drawNutrients();
    this.drawThreads();
    this.drawOrganisms();
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
