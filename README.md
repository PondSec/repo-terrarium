# Repo Terrarium

Repo Terrarium turns any public GitHub repository into a living WebGL specimen with its own visible DNA.

Paste a repo like `rust-lang/rust`, `vercel/next.js`, or your own `owner/repo`. The app reads the public GitHub tree, converts the repository structure into a deterministic A/C/G/T sequence, translates that sequence into genes, and renders the result as a small living terrarium.

Built by Joshua Pond.

Demo: https://pondsec.github.io/repo-terrarium/  
Repo: https://github.com/PondSec/repo-terrarium

## What makes it different

This is not a chart dressed up as art. The repo becomes a digital organism.

- File paths, sizes, languages, stars, forks and branch name become a deterministic DNA sequence.
- DNA is read as codons.
- Codons produce gene expression values such as motility, metabolism, replication, mutation, perception, photosynthesis and longevity.
- The scene is rendered with Three.js/WebGL.
- The DNA helix is visible and repo-specific. Different repos produce different helix geometry.
- Colony size and motion respond to repo shape. Larger and more diverse repositories grow denser, faster systems; smaller repos stay quieter.
- Life Lab opens a repo-driven cellular automata mode inspired by Conway's Game of Life, but with DNA and repo metrics changing the rules.
- Forks mutate the system because the owner/repo seed and file tree change.

## Use it

1. Open https://pondsec.github.io/repo-terrarium/
2. Enter a public GitHub repo in `owner/repo` format.
3. Press `grow`.
4. Use `inspect` to open the DNA, gene and species details.
5. Use the small rounded Life Lab icon to open the cellular automata layer.
6. Use `snapshot` to save a PNG.
7. Use `share` to copy the current terrarium link.
8. Use `fork` to open GitHub's fork flow and create a mutated lineage.

## Controls

- `pause`: stop or resume the simulation.
- `pulse`: disturb the specimen.
- `sound`: play a quiet generative tone from the repo genome.
- `snapshot`: save the current view as PNG.
- `share`: copy the current repo link.
- `fork`: open the fork page for the current repo.
- `inspect`: reveal DNA, genes, presets and language mix.
- Life Lab icon: open a fullscreen repo-shaped cellular automata view.

## Life Lab

Life Lab is the deeper mode hidden behind the small rounded icon.

It takes the same repo DNA and turns it into a cellular automata field:

- File count influences density.
- Language variety changes how alive the field feels.
- GC ratio shifts survival behavior.
- Mutation and replication genes change birth rules and tempo.
- The pattern is deterministic for the repo, but it keeps evolving while open.

It is not plain Conway. It is a repo-shaped variation where the repository changes the rules.

## Run locally

```bash
npm start
```

Then open:

```text
http://localhost:4173
```

No build step is needed. Three.js is loaded as a browser module.

## Fork loop

Repo Terrarium is meant to be forked and remixed:

1. Open a repo.
2. Fork it.
3. Change files, folders, language mix, docs or structure.
4. Open the fork in Repo Terrarium.
5. Compare the DNA and organism with the original.

The same repo produces the same organism every time. A changed fork becomes a new lineage.

## Notes

GitHub API requests are unauthenticated. If public rate limits are hit, the app falls back to an offline deterministic genome from the repo name so the page still works.

## License

MIT
