import { buildDigitalDna } from "./dna.js";

export const DEFAULT_REPO = "PondSec/repo-terrarium";

const LANGUAGE_RULES = [
  { name: "JavaScript", color: "#35f2b7", extensions: ["js", "jsx", "mjs", "cjs", "ts", "tsx"] },
  { name: "Python", color: "#58c4ff", extensions: ["py", "pyw", "ipynb"] },
  { name: "Rust", color: "#ff6b6b", extensions: ["rs"] },
  { name: "Go", color: "#3de1ff", extensions: ["go"] },
  { name: "Svelte", color: "#ff5c35", extensions: ["svelte"] },
  { name: "Vue", color: "#42d392", extensions: ["vue"] },
  { name: "Astro", color: "#b975ff", extensions: ["astro"] },
  { name: "HTML", color: "#ff4d6d", extensions: ["html", "htm"] },
  { name: "CSS", color: "#f7d046", extensions: ["css", "scss", "sass", "less"] },
  { name: "C/C++", color: "#7ef29a", extensions: ["c", "h", "cpp", "hpp", "cc", "hh", "cxx"] },
  { name: "Java", color: "#ff9f7a", extensions: ["java", "kt", "kts"] },
  { name: "Shell", color: "#b5f26d", extensions: ["sh", "bash", "zsh", "fish", "ps1"] },
  { name: "Ruby", color: "#ff5c8a", extensions: ["rb", "erb"] },
  { name: "PHP", color: "#91a7ff", extensions: ["php"] },
  { name: "Swift", color: "#ffcc66", extensions: ["swift"] },
  { name: "SQL", color: "#8bd3ff", extensions: ["sql"] },
  { name: "Docs", color: "#ffffff", extensions: ["md", "mdx", "txt", "rst", "adoc"] },
  { name: "Data", color: "#00f5d4", extensions: ["json", "yaml", "yml", "toml", "xml", "csv", "tsv", "lock"] },
  { name: "Media", color: "#f15bb5", extensions: ["png", "jpg", "jpeg", "gif", "svg", "webp", "mp3", "wav", "mp4"] }
];

const LANGUAGE_BY_EXTENSION = new Map();
for (const rule of LANGUAGE_RULES) {
  for (const extension of rule.extensions) {
    LANGUAGE_BY_EXTENSION.set(extension, rule);
  }
}

const FALLBACK_PATHS = [
  "index.html",
  "styles.css",
  "src/app.js",
  "src/genome.js",
  "src/terrarium.js",
  "tests/genome.test.mjs",
  "README.md",
  "REDDIT_POST.txt",
  "LICENSE"
];

const ADJECTIVES = [
  "solar",
  "lucid",
  "feral",
  "electric",
  "quiet",
  "bright",
  "wild",
  "glass",
  "neon",
  "tidal",
  "kinetic",
  "luminous"
];

const NOUNS = [
  "mycelium",
  "reef",
  "orchard",
  "comet",
  "choir",
  "atlas",
  "weather",
  "signal",
  "lagoon",
  "engine",
  "colony",
  "garden"
];

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function hashString(input) {
  let hash = 2166136261 >>> 0;
  const text = String(input);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function cyrb128(input) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  const text = String(input);

  for (let index = 0; index < text.length; index += 1) {
    const k = text.charCodeAt(index);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }

  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);

  return [
    (h1 ^ h2 ^ h3 ^ h4) >>> 0,
    (h2 ^ h1) >>> 0,
    (h3 ^ h1) >>> 0,
    (h4 ^ h1) >>> 0
  ];
}

export function sfc32(a, b, c, d) {
  return function random() {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const result = (t + d) | 0;
    c = (c + result) | 0;
    return (result >>> 0) / 4294967296;
  };
}

export function seededRandom(seedInput) {
  return sfc32(...cyrb128(seedInput));
}

export function normalizeRepo(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    return DEFAULT_REPO;
  }

  let candidate = raw.replace(/^git@github\.com:/i, "").replace(/\.git$/i, "");

  if (/^https?:\/\//i.test(candidate)) {
    const url = new URL(candidate);
    if (!/github\.com$/i.test(url.hostname)) {
      throw new Error("Use a github.com repository URL or owner/name.");
    }
    candidate = url.pathname.replace(/^\/+/, "");
  }

  const parts = candidate
    .replace(/^github\.com\//i, "")
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean);

  if (parts.length < 2) {
    throw new Error("Use owner/name, for example vercel/next.js.");
  }

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");
  const valid = /^[A-Za-z0-9_.-]+$/.test(owner) && /^[A-Za-z0-9_.-]+$/.test(repo);

  if (!valid) {
    throw new Error("Repository names can only contain letters, numbers, dots, dashes and underscores.");
  }

  return `${owner}/${repo}`;
}

export function extensionOf(path) {
  const cleanPath = String(path).split("?")[0].split("#")[0];
  const fileName = cleanPath.split("/").pop() || "";
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0 || dot === fileName.length - 1) {
    return "";
  }
  return fileName.slice(dot + 1).toLowerCase();
}

export function guessLanguage(path) {
  const extension = extensionOf(path);
  const fileName = String(path).split("/").pop() || "";
  const lowerName = fileName.toLowerCase();
  if (lowerName === "dockerfile" || lowerName.endsWith(".dockerfile")) {
    return { name: "Docker", color: "#58c4ff" };
  }
  if (/^(makefile|justfile|rakefile)$/i.test(fileName)) {
    return { name: "Build", color: "#b5f26d" };
  }
  if (/^\.env/.test(lowerName) || lowerName.endsWith("rc")) {
    return { name: "Config", color: "#91a7ff" };
  }
  return LANGUAGE_BY_EXTENSION.get(extension) || { name: "Other", color: colorFromString(extension || path) };
}

export function colorFromString(input) {
  const hue = hashString(input) % 360;
  return `hsl(${hue} 92% 66%)`;
}

function shannonEntropy(counts) {
  const values = [...counts].filter((count) => count > 0);
  const total = values.reduce((sum, count) => sum + count, 0);
  if (!total) {
    return 0;
  }

  return values.reduce((entropy, count) => {
    const probability = count / total;
    return entropy - probability * Math.log2(probability);
  }, 0);
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length) % list.length];
}

function normalizeTree(tree) {
  if (!Array.isArray(tree)) {
    return [];
  }

  return tree
    .map((item) => {
      if (typeof item === "string") {
        return { path: item, size: 1, type: "blob" };
      }
      return {
        path: item.path,
        size: Number.isFinite(item.size) ? item.size : 1,
        type: item.type || "blob"
      };
    })
    .filter((item) => item.path && item.type !== "tree");
}

export function buildGenome({ repo = DEFAULT_REPO, metadata = {}, tree = [] } = {}) {
  const normalizedRepo = normalizeRepo(repo);
  const normalizedTree = normalizeTree(tree);
  const files = normalizedTree.length ? normalizedTree : normalizeTree(FALLBACK_PATHS);
  const paths = files.map((file) => file.path).sort((a, b) => a.localeCompare(b));
  const extensions = new Map();
  const languages = new Map();
  const directories = new Set();
  let totalSize = 0;

  for (const file of files) {
    const extension = extensionOf(file.path) || "none";
    const language = guessLanguage(file.path);
    const weight = Math.max(1, Math.min(50, Math.log2((file.size || 1) + 1)));

    extensions.set(extension, (extensions.get(extension) || 0) + 1);
    const current = languages.get(language.name) || { name: language.name, count: 0, weight: 0, color: language.color };
    current.count += 1;
    current.weight += weight;
    languages.set(language.name, current);
    totalSize += file.size || 1;

    const parts = file.path.split("/");
    parts.pop();
    let prefix = "";
    for (const part of parts) {
      prefix = prefix ? `${prefix}/${part}` : part;
      directories.add(prefix);
    }
  }

  const languageList = [...languages.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .map((language) => ({
      ...language,
      ratio: language.count / files.length
    }));

  const branch = metadata.default_branch || metadata.defaultBranch || "main";
  const stars = metadata.stargazers_count || metadata.stars || 0;
  const forks = metadata.forks_count || metadata.forks || 0;
  const signature = [
    normalizedRepo,
    branch,
    stars,
    forks,
    totalSize,
    paths.join("|")
  ].join("::");
  const seedParts = cyrb128(signature);
  const rng = sfc32(...seedParts);
  const entropy = shannonEntropy(extensions.values());
  const fileFactor = clamp(Math.log10(files.length + 1) / 4, 0, 1);
  const directoryFactor = clamp(Math.log10(directories.size + 1) / 3, 0, 1);
  const languageFactor = clamp(languageList.length / 10, 0, 1);
  const heat = clamp((entropy / 4 + languageFactor + rng()) / 3, 0, 1);
  const pulse = clamp(0.18 + heat * 0.6 + rng() * 0.22, 0.18, 0.98);
  const population = Math.round(72 + fileFactor * 150 + languageFactor * 46 + rng() * 58);
  const seedHex = seedParts
    .map((part) => part.toString(16).padStart(8, "0"))
    .join("")
    .slice(0, 16);

  const palette = languageList.slice(0, 6).map((language) => language.color);
  while (palette.length < 6) {
    palette.push(colorFromString(`${signature}:${palette.length}`));
  }

  const topLanguage = languageList[0] || { name: "Other", color: "#ffffff", count: files.length, ratio: 1 };
  const lineage = `${pick(ADJECTIVES, rng)} ${pick(NOUNS, rng)}`;
  const digitalDna = buildDigitalDna({
    signature,
    files,
    entropy,
    languages: languageList
  });
  const phenotype = digitalDna.phenotype;
  const shapedPopulation = Math.round(population * (0.82 + phenotype.replication * 0.34));

  return {
    repo: normalizedRepo,
    displayName: metadata.full_name || normalizedRepo,
    description: metadata.description || "A repository-shaped living system.",
    htmlUrl: metadata.html_url || `https://github.com/${normalizedRepo}`,
    defaultBranch: branch,
    stars,
    forks,
    files: files.length,
    directories: directories.size,
    totalSize,
    entropy: Number(entropy.toFixed(3)),
    seed: seedParts[0],
    seedHex,
    dna: `DNA-${seedHex.slice(0, 4)}-${digitalDna.gcPercent}-${digitalDna.dominantCodons[0]?.triplet || "ATG"}`,
    digitalDna,
    lineage,
    topLanguage,
    languages: languageList,
    palette,
    paths: paths.slice(0, 420),
    traits: {
      population: shapedPopulation,
      heat: Number(heat.toFixed(3)),
      pulse: Number(pulse.toFixed(3)),
      branching: Number(clamp(0.24 + entropy / 5 + directoryFactor * 0.24 + rng() * 0.2, 0.18, 0.96).toFixed(3)),
      orbit: Number(clamp(0.22 + fileFactor * 0.48 + rng() * 0.18, 0.16, 0.92).toFixed(3)),
      turbulence: Number(clamp(0.15 + heat * 0.55 + rng() * 0.2, 0.1, 0.92).toFixed(3)),
      bloom: Number(clamp(0.2 + languageFactor * 0.55 + phenotype.photosynthesis * 0.2 + rng() * 0.12, 0.18, 0.98).toFixed(3)),
      mutationRate: Number(clamp(0.015 + phenotype.mutation * 0.16 + Math.log1p(forks) / 80, 0.015, 0.24).toFixed(3)),
      metabolism: Number(clamp(0.12 + phenotype.metabolism * 0.72, 0.12, 0.94).toFixed(3)),
      replication: Number(clamp(0.08 + phenotype.replication * 0.78, 0.08, 0.92).toFixed(3)),
      adhesion: Number(clamp(0.08 + phenotype.adhesion * 0.78, 0.08, 0.92).toFixed(3)),
      perception: Number(clamp(0.1 + phenotype.perception * 0.76, 0.1, 0.94).toFixed(3)),
      longevity: Number(clamp(0.2 + phenotype.longevity * 0.7, 0.2, 0.98).toFixed(3))
    }
  };
}

export function genomeSummary(genome) {
  const languages = genome.languages
    .slice(0, 3)
    .map((language) => `${language.name} ${Math.round(language.ratio * 100)}%`)
    .join(" / ");

  return `${genome.displayName} grows as ${genome.lineage}: ${genome.files} files, ${genome.directories} folders, ${genome.digitalDna.length} bases, ${languages}.`;
}
