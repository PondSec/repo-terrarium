import { DEFAULT_REPO, buildGenome, genomeSummary, normalizeRepo, seededRandom } from "./genome.js";
import { Terrarium } from "./terrarium.js";

const canvas = document.querySelector("#terrarium");
const form = document.querySelector("#repo-form");
const input = document.querySelector("#repo-input");
const statusText = document.querySelector("#status-text");
const title = document.querySelector("#repo-title");
const subtitle = document.querySelector("#repo-subtitle");
const dna = document.querySelector("#dna");
const dnaSequence = document.querySelector("#dna-sequence");
const geneList = document.querySelector("#genes");
const gcReadout = document.querySelector("#gc-readout");
const stats = document.querySelector("#stats");
const languages = document.querySelector("#languages");
const examples = document.querySelectorAll("[data-repo]");
const pauseButton = document.querySelector("#pause-button");
const shuffleButton = document.querySelector("#shuffle-button");
const shareButton = document.querySelector("#share-button");
const snapshotButton = document.querySelector("#snapshot-button");
const soundButton = document.querySelector("#sound-button");
const forkButton = document.querySelector("#fork-button");

const terrarium = new Terrarium(canvas);
let activeGenome = null;
let currentAbort = null;
let sonifier = null;

function setStatus(message, tone = "plain") {
  statusText.textContent = message;
  statusText.dataset.tone = tone;
}

function urlForRepo(repo) {
  const url = new URL(window.location.href);
  url.searchParams.set("repo", repo);
  return url;
}

function repoFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("repo") || DEFAULT_REPO;
}

async function fetchJson(url, signal) {
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: "application/vnd.github+json"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status}`);
  }

  return response.json();
}

async function loadFromGitHub(repo, signal) {
  const normalized = normalizeRepo(repo);
  const metadata = await fetchJson(`https://api.github.com/repos/${normalized}`, signal);
  const tree = await fetchJson(
    `https://api.github.com/repos/${normalized}/git/trees/${metadata.default_branch}?recursive=1`,
    signal
  );

  return buildGenome({
    repo: metadata.full_name,
    metadata,
    tree: Array.isArray(tree.tree) ? tree.tree : []
  });
}

function offlineTree(repo) {
  const rng = seededRandom(`${repo}:offline-tree`);
  const folders = ["src", "lib", "notes", "assets", "tests", "tools", "docs", "experiments"];
  const stems = ["seed", "pulse", "field", "orbit", "sketch", "panel", "worker", "shape", "index", "readme"];
  const extensions = ["js", "css", "html", "md", "json", "svg", "txt", "py"];
  const count = 42 + Math.floor(rng() * 96);

  return Array.from({ length: count }, (_, index) => {
    const folder = folders[Math.floor(rng() * folders.length)];
    const stem = stems[Math.floor(rng() * stems.length)];
    const extension = extensions[Math.floor(rng() * extensions.length)];
    return {
      path: `${folder}/${stem}-${index.toString(36)}.${extension}`,
      size: 200 + Math.floor(rng() * 18000),
      type: "blob"
    };
  });
}

function fallbackGenome(repo, reason) {
  const normalized = normalizeRepo(repo);
  return buildGenome({
    repo: normalized,
    metadata: {
      full_name: normalized,
      description: `Offline terrarium seed. ${reason}`
    },
    tree: offlineTree(normalized)
  });
}

function renderLanguages(genome) {
  languages.innerHTML = "";
  const top = genome.languages.slice(0, 6);
  for (const language of top) {
    const item = document.createElement("li");
    item.style.setProperty("--swatch", language.color);
    item.innerHTML = `<span>${language.name}</span><strong>${Math.round(language.ratio * 100)}%</strong>`;
    languages.append(item);
  }
}

function renderStats(genome) {
  const statItems = [
    ["files", genome.files.toLocaleString()],
    ["bases", genome.digitalDna.length.toLocaleString()],
    ["GC", `${genome.digitalDna.gcPercent}%`],
    ["species", genome.languages.length.toLocaleString()],
    ["mutation", `${Math.round(genome.traits.mutationRate * 100)}%`],
    ["birth", `${Math.round(genome.traits.replication * 100)}%`]
  ];

  stats.innerHTML = "";
  for (const [label, value] of statItems) {
    const item = document.createElement("span");
    item.innerHTML = `<b>${value}</b>${label}`;
    stats.append(item);
  }
}

function renderDna(genome) {
  const dnaModel = genome.digitalDna;
  const sequence = dnaModel.sequence.slice(0, 144);
  dnaSequence.innerHTML = "";
  gcReadout.textContent = `GC ${dnaModel.gcPercent}%`;

  for (let index = 0; index < sequence.length; index += 3) {
    const codon = sequence.slice(index, index + 3);
    const group = document.createElement("span");
    group.className = "codon";
    for (const base of codon) {
      const item = document.createElement("i");
      item.textContent = base;
      item.style.setProperty("--base-color", dnaModel.baseCounts[base] ? `var(--base-${base.toLowerCase()})` : "#ffffff");
      group.append(item);
    }
    dnaSequence.append(group);
  }

  geneList.innerHTML = "";
  for (const gene of dnaModel.genes) {
    const item = document.createElement("li");
    item.style.setProperty("--gene-percent", `${Math.round(gene.expression * 100)}%`);
    item.style.setProperty("--gene-color", `var(--base-${gene.leadCodon[0].toLowerCase()})`);
    item.innerHTML = `<span>${gene.name}</span><b>${Math.round(gene.expression * 100)}</b>`;
    geneList.append(item);
  }
}

function renderGenome(genome, source = "live") {
  activeGenome = genome;
  input.value = genome.repo;
  title.textContent = genome.displayName;
  subtitle.textContent = genomeSummary(genome);
  dna.textContent = genome.dna;
  document.documentElement.style.setProperty("--accent-a", genome.palette[0]);
  document.documentElement.style.setProperty("--accent-b", genome.palette[1]);
  document.documentElement.style.setProperty("--accent-c", genome.palette[2]);
  renderStats(genome);
  renderLanguages(genome);
  renderDna(genome);
  terrarium.setGenome(genome);
  sonifier?.setGenome(genome);
  setStatus(source === "offline" ? "offline seed, still alive" : "live GitHub genome", source === "offline" ? "warn" : "good");
}

async function loadRepo(repo, pushState = true) {
  if (currentAbort) {
    currentAbort.abort();
  }
  currentAbort = new AbortController();

  let normalized;
  try {
    normalized = normalizeRepo(repo);
  } catch (error) {
    setStatus(error.message, "bad");
    return;
  }

  setStatus("reading GitHub tree...");
  input.value = normalized;

  try {
    const genome = await loadFromGitHub(normalized, currentAbort.signal);
    renderGenome(genome);
    if (pushState) {
      window.history.replaceState({}, "", urlForRepo(genome.repo));
    }
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }
    const genome = fallbackGenome(normalized, error.message);
    renderGenome(genome, "offline");
    if (pushState) {
      window.history.replaceState({}, "", urlForRepo(genome.repo));
    }
  }
}

class Sonifier {
  constructor() {
    this.context = null;
    this.nodes = [];
    this.running = false;
  }

  async toggle(genome) {
    if (this.running) {
      this.stop();
      return false;
    }
    await this.start(genome);
    return true;
  }

  async start(genome) {
    this.context ||= new AudioContext();
    await this.context.resume();
    this.running = true;
    this.setGenome(genome);
  }

  stop() {
    for (const node of this.nodes) {
      node.gain.gain.cancelScheduledValues(this.context.currentTime);
      node.gain.gain.linearRampToValueAtTime(0.0001, this.context.currentTime + 0.08);
      node.oscillator.stop(this.context.currentTime + 0.1);
    }
    this.nodes = [];
    this.running = false;
  }

  setGenome(genome) {
    if (!this.running || !genome) {
      return;
    }
    this.stop();
    this.running = true;
    const now = this.context.currentTime;
    const master = this.context.createGain();
    master.gain.value = 0.055;
    master.connect(this.context.destination);

    this.nodes = genome.languages.slice(0, 4).map((language, index) => {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const base = 96 + (genome.seed % 80) + index * 47;
      oscillator.type = index % 2 ? "triangle" : "sine";
      oscillator.frequency.value = base + language.ratio * 280;
      gain.gain.value = 0.05 + language.ratio * 0.08;
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(now + index * 0.03);
      return { oscillator, gain, master };
    });
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  loadRepo(input.value);
});

for (const button of examples) {
  button.addEventListener("click", () => loadRepo(button.dataset.repo));
}

pauseButton.addEventListener("click", () => {
  const paused = terrarium.togglePause();
  pauseButton.textContent = paused ? "resume" : "pause";
});

shuffleButton.addEventListener("click", () => {
  const rect = canvas.getBoundingClientRect();
  const rng = seededRandom(`${activeGenome?.seedHex || "seed"}:${Date.now()}`);
  terrarium.injectPulse(rng() * rect.width, rng() * rect.height, 1.6);
});

shareButton.addEventListener("click", async () => {
  if (!activeGenome) {
    return;
  }
  const shareUrl = urlForRepo(activeGenome.repo).toString();
  await navigator.clipboard.writeText(shareUrl);
  setStatus("share link copied", "good");
});

snapshotButton.addEventListener("click", () => {
  if (!activeGenome) {
    return;
  }
  const link = document.createElement("a");
  link.download = `${activeGenome.repo.replace("/", "-")}-terrarium.png`;
  link.href = terrarium.snapshot();
  link.click();
});

soundButton.addEventListener("click", async () => {
  sonifier ||= new Sonifier();
  const running = await sonifier.toggle(activeGenome);
  soundButton.textContent = running ? "mute" : "sound";
});

forkButton.addEventListener("click", () => {
  if (!activeGenome) {
    return;
  }
  window.open(`https://github.com/${activeGenome.repo}/fork`, "_blank", "noopener");
});

window.addEventListener("popstate", () => loadRepo(repoFromUrl(), false));

loadRepo(repoFromUrl(), false);
