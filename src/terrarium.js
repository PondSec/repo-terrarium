import * as THREE from "three";
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

function color(baseOrValue) {
  return new THREE.Color(BASE_COLORS[baseOrValue] || baseOrValue || "#ffffff");
}

export class Terrarium {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true
    });
    this.renderer.setClearColor(0x050607, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050607, 0.035);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120);
    this.camera.position.set(0, 0.55, 22);

    this.root = new THREE.Group();
    this.organismGroup = new THREE.Group();
    this.helixGroup = new THREE.Group();
    this.nutrientGroup = new THREE.Group();
    this.pulseGroup = new THREE.Group();
    this.scene.add(this.root, this.organismGroup, this.helixGroup, this.nutrientGroup, this.pulseGroup);

    this.clock = new THREE.Clock();
    this.frame = 0;
    this.paused = false;
    this.organisms = [];
    this.nutrients = [];
    this.births = 0;
    this.deaths = 0;
    this.pointer = {
      x: 0,
      y: 0,
      world: new THREE.Vector3(),
      active: false,
      force: 0
    };

    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    this.bindPointer();
    this.addLighting();
    this.resize();
    window.addEventListener("resize", this.resize);
    requestAnimationFrame(this.tick);
  }

  addLighting() {
    this.scene.add(new THREE.HemisphereLight(0xaeefff, 0x080b0b, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-4, 8, 9);
    const rim = new THREE.DirectionalLight(0x35f2b7, 1.2);
    rim.position.set(8, -3, 6);
    const accent = new THREE.PointLight(0xff5c8a, 18, 42, 1.8);
    accent.position.set(-7, -4, 10);
    this.scene.add(key, rim, accent);
  }

  bindPointer() {
    const update = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const point = event.touches ? event.touches[0] : event;
      this.pointer.x = ((point.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -(((point.clientY - rect.top) / rect.height) * 2 - 1);
      this.pointer.active = true;
      this.pointer.force = 1;
      this.pointer.world.set(this.pointer.x * this.worldWidth * 0.5, this.pointer.y * this.worldHeight * 0.5, 0);
    };

    this.canvas.addEventListener("pointermove", update);
    this.canvas.addEventListener("pointerdown", (event) => {
      update(event);
      this.injectPulse(this.pointer.world.x, this.pointer.world.y, 1.35);
    });
    this.canvas.addEventListener("pointerleave", () => {
      this.pointer.active = false;
    });
    this.canvas.addEventListener("touchmove", update, { passive: true });
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(320, rect.width);
    this.height = Math.max(320, rect.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    const distance = this.camera.position.z;
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    this.worldHeight = 2 * Math.tan(vFov / 2) * distance;
    this.worldWidth = this.worldHeight * this.camera.aspect;
  }

  clearGroup(group) {
    while (group.children.length) {
      const child = group.children.pop();
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material?.dispose();
      }
    }
  }

  setGenome(genome) {
    this.genome = genome;
    this.random = seededRandom(`${genome.seedHex}:webgl-life`);
    this.frame = 0;
    this.births = 0;
    this.deaths = 0;
    this.organisms = [];
    this.nutrients = [];
    this.clearGroup(this.root);
    this.clearGroup(this.organismGroup);
    this.clearGroup(this.helixGroup);
    this.clearGroup(this.nutrientGroup);
    this.clearGroup(this.pulseGroup);

    this.buildEnvironment();
    this.buildHelix();
    this.buildOrganisms();
    this.buildNutrients();
  }

  buildEnvironment() {
    const palette = this.genome.palette.map((value) => color(value));
    const fieldGeometry = new THREE.IcosahedronGeometry(7.6, 4);
    const fieldMaterial = new THREE.MeshBasicMaterial({
      color: palette[0],
      transparent: true,
      opacity: 0.055,
      wireframe: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
    field.rotation.set(this.random() * TAU, this.random() * TAU, this.random() * TAU);
    field.userData.spin = new THREE.Vector3(0.0007 + this.random() * 0.001, 0.0004 + this.random() * 0.001, 0.0002);
    this.root.add(field);

    const membrane = new THREE.Mesh(
      new THREE.IcosahedronGeometry(4.5, 5),
      new THREE.MeshPhysicalMaterial({
        color: palette[0],
        emissive: palette[1],
        emissiveIntensity: 0.08,
        roughness: 0.14,
        metalness: 0.05,
        transparent: true,
        opacity: 0.075,
        transmission: 0.28,
        thickness: 1.4,
        depthWrite: false
      })
    );
    membrane.scale.set(1.28, 0.78, 0.62);
    membrane.userData.spin = new THREE.Vector3(0.0005, -0.0007, 0.0003);
    this.root.add(membrane);

    const haloGeometry = new THREE.TorusGeometry(5.4, 0.012, 8, 180);
    for (let index = 0; index < 4; index += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: palette[index % palette.length],
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const halo = new THREE.Mesh(haloGeometry, material);
      halo.rotation.set(this.random() * TAU, this.random() * TAU, this.random() * TAU);
      halo.scale.setScalar(0.74 + index * 0.16);
      halo.userData.spin = new THREE.Vector3(
        (this.random() - 0.5) * 0.003,
        (this.random() - 0.5) * 0.003,
        (this.random() - 0.5) * 0.003
      );
      this.root.add(halo);
    }
  }

  createHelixProfile() {
    const dna = this.genome.digitalDna;
    const random = seededRandom(`${this.genome.seedHex}:helix:${dna.sequence.slice(0, 72)}`);
    const dominant = dna.dominantCodons[0]?.triplet || "ATG";
    const codonWeight = dominant.split("").reduce((sum, base) => sum + BASES.indexOf(base) + 1, 0);

    return {
      radius: 1.05 + random() * 0.42 + Math.abs(dna.gc - 0.5) * 0.7,
      pitch: 0.19 + random() * 0.07,
      twist: 0.38 + random() * 0.2 + codonWeight * 0.011,
      bases: 86 + Math.floor(random() * 42),
      offset: Math.floor(random() * dna.sequence.length),
      tilt: new THREE.Euler((random() - 0.5) * 0.36, (random() - 0.5) * 0.42, (random() - 0.5) * 0.24)
    };
  }

  buildHelix() {
    const dna = this.genome.digitalDna;
    const profile = this.createHelixProfile();
    const baseGeometry = new THREE.SphereGeometry(0.07, 18, 12);
    const rungMaterial = new THREE.LineBasicMaterial({
      color: 0xe9fff8,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending
    });
    const strandMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending
    });
    const leftPoints = [];
    const rightPoints = [];
    const rungPositions = [];
    const compact = this.width < 760;
    const xOffset = compact ? 3.25 : 5.85;
    const scale = compact ? 0.58 : 0.82;

    this.helixGroup.position.set(xOffset, compact ? 1.45 : 0.25, -1.9);
    this.helixGroup.rotation.copy(profile.tilt);
    this.helixGroup.scale.setScalar(scale);
    this.helixGroup.userData.profile = profile;

    for (let index = 0; index < profile.bases; index += 1) {
      const base = dna.sequence[(profile.offset + index) % dna.sequence.length];
      const pair = PAIRS[base];
      const y = (index - profile.bases / 2) * profile.pitch;
      const phase = index * profile.twist;
      const radius = profile.radius * (0.92 + Math.sin(index * 0.21 + this.genome.seed * 0.00002) * 0.1);
      const left = new THREE.Vector3(Math.cos(phase) * radius, y, Math.sin(phase) * radius);
      const right = new THREE.Vector3(Math.cos(phase + Math.PI) * radius, y, Math.sin(phase + Math.PI) * radius);
      leftPoints.push(left);
      rightPoints.push(right);
      rungPositions.push(left.x, left.y, left.z, right.x, right.y, right.z);

      for (const [point, letter] of [[left, base], [right, pair]]) {
        const material = new THREE.MeshStandardMaterial({
          color: color(letter),
          emissive: color(letter),
          emissiveIntensity: 0.55,
          roughness: 0.24,
          metalness: 0.18,
          transparent: true,
          opacity: 0.92
        });
        const bead = new THREE.Mesh(baseGeometry, material);
        bead.position.copy(point);
        bead.userData.phase = phase;
        bead.userData.base = letter;
        this.helixGroup.add(bead);
      }
    }

    const rungGeometry = new THREE.BufferGeometry();
    rungGeometry.setAttribute("position", new THREE.Float32BufferAttribute(rungPositions, 3));
    this.helixGroup.add(new THREE.LineSegments(rungGeometry, rungMaterial));
    this.helixGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(leftPoints), strandMaterial));
    this.helixGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rightPoints), strandMaterial.clone()));
  }

  buildOrganisms() {
    const population = Math.round(this.genome.traits.population * (this.width < 760 ? 0.14 : 0.22));
    const paths = this.genome.paths.length ? this.genome.paths : [this.genome.repo];
    const geometry = new THREE.SphereGeometry(0.34, 36, 22);

    for (let index = 0; index < population; index += 1) {
      const path = paths[index % paths.length];
      const language = this.genome.languages[index % Math.max(1, this.genome.languages.length)];
      const digest = hashString(`${this.genome.seedHex}:${path}:${index}`);
      const base = this.genome.digitalDna.sequence[digest % this.genome.digitalDna.sequence.length] || BASES[digest % 4];
      const organismColor = color(language?.color || colorFromString(path));
      const material = new THREE.MeshPhysicalMaterial({
        color: organismColor,
        emissive: color(base),
        emissiveIntensity: 0.24,
        roughness: 0.12,
        metalness: 0.05,
        transmission: 0.38,
        thickness: 0.7,
        transparent: true,
        opacity: 0.74
      });
      const mesh = new THREE.Mesh(geometry, material);
      const radius = 0.75 + this.random() * 3.35;
      const angle = (digest % 10000) / 10000 * TAU;
      mesh.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.7) * 1.05, Math.sin(angle) * radius * 0.5);
      mesh.scale.set(
        0.72 + this.random() * 0.95 + this.genome.digitalDna.phenotype.adhesion * 0.32,
        0.5 + this.random() * 0.62,
        0.72 + this.random() * 0.95
      );
      mesh.userData = {
        path,
        base,
        digest,
        angle,
        radius,
        speed: 0.12 + this.genome.digitalDna.phenotype.motility * 0.36 + this.random() * 0.1,
        energy: 0.5 + this.random() * 0.5,
        phase: this.random() * TAU,
        originalScale: mesh.scale.clone()
      };
      this.organisms.push(mesh);
      this.organismGroup.add(mesh);
    }
  }

  buildNutrients() {
    const count = Math.round(this.genome.traits.population * (this.width < 760 ? 0.3 : 0.5));
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const base = this.genome.digitalDna.sequence[(index * 17 + this.genome.seed) % this.genome.digitalDna.sequence.length] || BASES[index % 4];
      const radius = 1.8 + this.random() * 6.2;
      const angle = this.random() * TAU;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = (this.random() - 0.5) * 6.2;
      positions[index * 3 + 2] = Math.sin(angle) * radius * 0.65 - 1.2;
      const c = color(base);
      colors[index * 3] = c.r;
      colors[index * 3 + 1] = c.g;
      colors[index * 3 + 2] = c.b;
      this.nutrients.push({ base, phase: this.random() * TAU, radius, angle });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: this.width < 760 ? 0.045 : 0.065,
      vertexColors: true,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.nutrientPoints = new THREE.Points(geometry, material);
    this.nutrientGroup.add(this.nutrientPoints);
  }

  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }

  injectPulse(x = 0, y = 0, strength = 1) {
    const geometry = new THREE.RingGeometry(0.4, 0.43, 96);
    const material = new THREE.MeshBasicMaterial({
      color: color(this.genome?.palette?.[0] || "#35f2b7"),
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const pulse = new THREE.Mesh(geometry, material);
    pulse.position.set(x, y, 1.2);
    pulse.userData = { life: 1, strength };
    this.pulseGroup.add(pulse);
  }

  update(delta) {
    if (!this.genome) {
      return;
    }

    const time = this.clock.elapsedTime;
    this.pointer.force = mix(this.pointer.force, this.pointer.active ? 1 : 0, 0.05);
    this.root.rotation.y += delta * 0.08;
    this.root.rotation.x = Math.sin(time * 0.16) * 0.08;
    this.helixGroup.rotation.y += delta * (0.18 + this.genome.traits.mutationRate * 0.6);

    for (const child of this.root.children) {
      if (child.userData.spin) {
        child.rotation.x += child.userData.spin.x;
        child.rotation.y += child.userData.spin.y;
        child.rotation.z += child.userData.spin.z;
      }
    }

    for (const mesh of this.organisms) {
      const data = mesh.userData;
      data.angle += delta * data.speed;
      const breathe = 1 + Math.sin(time * 1.8 + data.phase) * 0.08;
      const targetX = Math.cos(data.angle) * data.radius;
      const targetZ = Math.sin(data.angle) * data.radius * 0.55;
      const targetY = Math.sin(data.angle * 1.7 + data.phase) * 1.35;

      mesh.position.x = mix(mesh.position.x, targetX, 0.018);
      mesh.position.y = mix(mesh.position.y, targetY, 0.018);
      mesh.position.z = mix(mesh.position.z, targetZ, 0.018);
      if (this.pointer.force > 0.01) {
        const dx = mesh.position.x - this.pointer.world.x;
        const dy = mesh.position.y - this.pointer.world.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const field = Math.max(0, 1 - distance / 5) * this.pointer.force;
        mesh.position.x += (dx / distance) * field * delta * 3;
        mesh.position.y += (dy / distance) * field * delta * 3;
      }
      mesh.rotation.x += delta * (0.4 + data.speed);
      mesh.rotation.y += delta * (0.6 + data.speed);
      mesh.scale.set(
        data.originalScale.x * breathe,
        data.originalScale.y * (0.96 + Math.sin(time * 1.2 + data.phase) * 0.05),
        data.originalScale.z * breathe
      );
    }

    if (this.nutrientPoints) {
      const positions = this.nutrientPoints.geometry.attributes.position;
      for (let index = 0; index < this.nutrients.length; index += 1) {
        const data = this.nutrients[index];
        const angle = data.angle + time * 0.025 * (index % 3 + 1);
        positions.setXYZ(
          index,
          Math.cos(angle) * data.radius,
          positions.getY(index) + Math.sin(time + data.phase) * 0.0008,
          Math.sin(angle) * data.radius * 0.65 - 1.2
        );
      }
      positions.needsUpdate = true;
    }

    for (const pulse of [...this.pulseGroup.children]) {
      pulse.userData.life -= delta * 0.8;
      pulse.scale.multiplyScalar(1 + delta * 1.8 * pulse.userData.strength);
      pulse.material.opacity = Math.max(0, pulse.userData.life * 0.65);
      if (pulse.userData.life <= 0) {
        this.pulseGroup.remove(pulse);
        pulse.geometry.dispose();
        pulse.material.dispose();
      }
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  tick() {
    const delta = Math.min(0.033, this.clock.getDelta());
    if (!this.paused) {
      this.frame += 1;
      this.update(delta);
      this.render();
    }
    requestAnimationFrame(this.tick);
  }

  snapshot() {
    this.render();
    return this.canvas.toDataURL("image/png");
  }
}
