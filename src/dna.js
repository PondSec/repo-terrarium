const BASES = ["A", "C", "G", "T"];
const PAIRS = { A: "T", T: "A", C: "G", G: "C" };

export const BASE_COLORS = {
  A: "#35f2b7",
  C: "#58c4ff",
  G: "#f7d046",
  T: "#ff5c8a"
};

const CODON_TABLE = {
  TTT: "F", TTC: "F", TTA: "L", TTG: "L",
  TCT: "S", TCC: "S", TCA: "S", TCG: "S",
  TAT: "Y", TAC: "Y", TAA: "*", TAG: "*",
  TGT: "C", TGC: "C", TGA: "*", TGG: "W",
  CTT: "L", CTC: "L", CTA: "L", CTG: "L",
  CCT: "P", CCC: "P", CCA: "P", CCG: "P",
  CAT: "H", CAC: "H", CAA: "Q", CAG: "Q",
  CGT: "R", CGC: "R", CGA: "R", CGG: "R",
  ATT: "I", ATC: "I", ATA: "I", ATG: "M",
  ACT: "T", ACC: "T", ACA: "T", ACG: "T",
  AAT: "N", AAC: "N", AAA: "K", AAG: "K",
  AGT: "S", AGC: "S", AGA: "R", AGG: "R",
  GTT: "V", GTC: "V", GTA: "V", GTG: "V",
  GCT: "A", GCC: "A", GCA: "A", GCG: "A",
  GAT: "D", GAC: "D", GAA: "E", GAG: "E",
  GGT: "G", GGC: "G", GGA: "G", GGG: "G"
};

const AMINO = {
  A: { name: "alanine", family: "structure", color: "#35f2b7" },
  C: { name: "cysteine", family: "binding", color: "#00f5d4" },
  D: { name: "aspartate", family: "signal", color: "#58c4ff" },
  E: { name: "glutamate", family: "signal", color: "#8bd3ff" },
  F: { name: "phenylalanine", family: "sense", color: "#f15bb5" },
  G: { name: "glycine", family: "flex", color: "#ffffff" },
  H: { name: "histidine", family: "charge", color: "#91a7ff" },
  I: { name: "isoleucine", family: "motion", color: "#7ef29a" },
  K: { name: "lysine", family: "charge", color: "#b5f26d" },
  L: { name: "leucine", family: "motion", color: "#3de1ff" },
  M: { name: "methionine", family: "start", color: "#35f2b7" },
  N: { name: "asparagine", family: "memory", color: "#b975ff" },
  P: { name: "proline", family: "shell", color: "#ff9f7a" },
  Q: { name: "glutamine", family: "memory", color: "#c7a0ff" },
  R: { name: "arginine", family: "replicate", color: "#f7d046" },
  S: { name: "serine", family: "metabolism", color: "#ffcc66" },
  T: { name: "threonine", family: "metabolism", color: "#ffdf80" },
  V: { name: "valine", family: "motion", color: "#42d392" },
  W: { name: "tryptophan", family: "sense", color: "#ff5c8a" },
  Y: { name: "tyrosine", family: "sense", color: "#ff4d6d" },
  "*": { name: "stop", family: "limit", color: "#889096" }
};

const GENES = [
  { name: "motility", families: ["motion", "start"], codons: ["ATG", "GTT", "GTG", "CTG"] },
  { name: "metabolism", families: ["metabolism", "flex"], codons: ["AGC", "ACC", "GGC", "TCC"] },
  { name: "replication", families: ["replicate", "charge"], codons: ["CGT", "CGG", "AAG", "AAA"] },
  { name: "mutation", families: ["sense", "limit"], codons: ["TGG", "TAT", "TGA", "TAG"] },
  { name: "perception", families: ["sense", "memory", "signal"], codons: ["TTC", "AAC", "CAA", "GAT"] },
  { name: "adhesion", families: ["binding", "shell", "structure"], codons: ["TGC", "CCC", "GCC", "GCG"] },
  { name: "photosynthesis", families: ["structure", "metabolism"], codons: ["GCT", "GCA", "ACT", "ACA"] },
  { name: "longevity", families: ["motion", "shell", "binding"], codons: ["CTA", "ATT", "CCT", "TGT"] }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cyrb128(input) {
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

function sfc32(a, b, c, d) {
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

function numbersToBases(numbers) {
  let sequence = "";
  for (const number of numbers) {
    for (let shift = 0; shift < 32; shift += 2) {
      sequence += BASES[(number >>> shift) & 3];
    }
  }
  return sequence;
}

function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function topCounts(counts, limit) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function buildSequence(signature, files, targetLength) {
  let sequence = numbersToBases(cyrb128(signature));
  const sorted = files.map((file) => `${file.path}:${file.size || 1}`).sort();

  for (const file of sorted) {
    if (sequence.length >= targetLength) {
      break;
    }
    sequence += numbersToBases(cyrb128(`${signature}:${file}`));
  }

  const random = sfc32(...cyrb128(`${signature}:fill`));
  while (sequence.length < targetLength) {
    sequence += BASES[Math.floor(random() * 4)];
  }

  const trimmedLength = Math.floor(targetLength / 3) * 3;
  return sequence.slice(0, trimmedLength);
}

function translate(sequence) {
  const codons = [];
  for (let index = 0; index < sequence.length - 2; index += 3) {
    const triplet = sequence.slice(index, index + 3);
    const amino = CODON_TABLE[triplet] || "*";
    codons.push({
      triplet,
      amino,
      ...AMINO[amino]
    });
  }
  return codons;
}

function expressionForGene(gene, codons, index, entropy) {
  const windowSize = Math.max(18, Math.floor(codons.length / GENES.length));
  const start = (index * windowSize) % Math.max(1, codons.length - windowSize);
  const window = codons.slice(start, start + windowSize);
  const directHits = window.filter((codon) => gene.codons.includes(codon.triplet)).length;
  const familyHits = window.filter((codon) => gene.families.includes(codon.family)).length;
  const stops = window.filter((codon) => codon.amino === "*").length;
  const raw = (directHits * 1.8 + familyHits * 0.82 + entropy * 2 - stops * 0.6) / Math.max(1, window.length);
  return {
    name: gene.name,
    start: start * 3,
    end: (start + window.length) * 3,
    expression: Number(clamp(raw * 2.9, 0.02, 0.98).toFixed(3)),
    leadCodon: window[0]?.triplet || "ATG"
  };
}

export function buildDigitalDna({ signature, files, entropy = 0, languages = [] }) {
  const targetLength = clamp(720 + files.length * 9 + languages.length * 33, 840, 2400);
  const sequence = buildSequence(signature, files, targetLength);
  const complement = sequence.replace(/[ACGT]/g, (base) => PAIRS[base]);
  const codons = translate(sequence);
  const baseCounts = countBy(sequence, (base) => base);
  const codonCounts = countBy(codons, (codon) => codon.triplet);
  const aminoCounts = countBy(codons, (codon) => codon.amino);
  const gc = ((baseCounts.get("G") || 0) + (baseCounts.get("C") || 0)) / sequence.length;
  const genes = GENES.map((gene, index) => expressionForGene(gene, codons, index, entropy));
  const geneMap = Object.fromEntries(genes.map((gene) => [gene.name, gene.expression]));

  return {
    sequence,
    complement,
    length: sequence.length,
    baseCounts: Object.fromEntries(BASES.map((base) => [base, baseCounts.get(base) || 0])),
    gc: Number(gc.toFixed(3)),
    gcPercent: Math.round(gc * 100),
    codons,
    dominantCodons: topCounts(codonCounts, 8).map(({ key, count }) => ({
      triplet: key,
      count,
      amino: CODON_TABLE[key],
      family: AMINO[CODON_TABLE[key]]?.family || "unknown",
      color: AMINO[CODON_TABLE[key]]?.color || "#ffffff"
    })),
    aminoAcids: topCounts(aminoCounts, 8).map(({ key, count }) => ({
      amino: key,
      count,
      ...AMINO[key]
    })),
    genes,
    phenotype: {
      motility: geneMap.motility,
      metabolism: geneMap.metabolism,
      replication: geneMap.replication,
      mutation: geneMap.mutation,
      perception: geneMap.perception,
      adhesion: geneMap.adhesion,
      photosynthesis: geneMap.photosynthesis,
      longevity: geneMap.longevity
    }
  };
}
