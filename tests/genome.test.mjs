import assert from "node:assert/strict";
import { buildGenome, genomeSummary, normalizeRepo } from "../src/genome.js";

const tree = [
  { path: "index.html", size: 1400, type: "blob" },
  { path: "src/app.js", size: 8200, type: "blob" },
  { path: "src/terrarium.js", size: 12200, type: "blob" },
  { path: "styles.css", size: 5000, type: "blob" },
  { path: "README.md", size: 2400, type: "blob" }
];

assert.equal(normalizeRepo("PondSec/repo-terrarium"), "PondSec/repo-terrarium");
assert.equal(normalizeRepo("https://github.com/PondSec/repo-terrarium"), "PondSec/repo-terrarium");
assert.equal(normalizeRepo("git@github.com:PondSec/repo-terrarium.git"), "PondSec/repo-terrarium");

const first = buildGenome({ repo: "PondSec/repo-terrarium", tree });
const second = buildGenome({ repo: "PondSec/repo-terrarium", tree });
const fork = buildGenome({ repo: "SomeoneElse/repo-terrarium", tree });

assert.equal(first.seedHex, second.seedHex);
assert.equal(first.dna, second.dna);
assert.notEqual(first.seedHex, fork.seedHex);
assert.equal(first.files, 5);
assert.ok(first.languages.some((language) => language.name === "JavaScript"));
assert.ok(first.traits.population >= 72);
assert.match(genomeSummary(first), /PondSec\/repo-terrarium/);

console.log("genome tests passed");
