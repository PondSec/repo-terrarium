# Repo Terrarium

Every GitHub repo has a shape. Repo Terrarium turns that shape into a small living ecosystem with its own visible DNA strand.

Type an `owner/repo`, and the page reads the public GitHub file tree, guesses the language mix, hashes the structure into a deterministic A/C/G/T genome, then grows a canvas simulation from it. Forks, rewrites and weird folder structures change the organism.

Built by Joshua Pond.

Demo: https://pondsec.github.io/repo-terrarium/  
Repo: https://github.com/PondSec/repo-terrarium

## Why I made it

Most repo visualizers feel like charts. I wanted something that feels more like finding a tiny object under glass: same data, less spreadsheet energy.

It is static, client-side, and intentionally small. No backend, no account, no database.

## What it does

- Loads a public GitHub repository by `owner/repo` or GitHub URL.
- Fetches the repo metadata and recursive file tree from the GitHub API.
- Builds a deterministic A/C/G/T DNA sequence from file paths, sizes, languages, folders, stars, forks and branch name.
- Translates the sequence into codons and gene expression values.
- Renders that genome as a live canvas terrarium with organisms, nutrients, energy, birth and death.
- Draws a moving double-helix strand directly inside the terrarium.
- Lets you pause, pulse, sonify, snapshot, share and open a fork flow for the current repo.
- Falls back to an offline seed if GitHub rate-limits or the network is down.

## Run locally

```bash
npm start
```

Then open:

```text
http://localhost:4173
```

No install step is required because the app has no runtime dependencies.

## Use it

1. Enter a GitHub repo like `rust-lang/rust` or paste a GitHub URL.
2. Press `grow`.
3. Move your mouse over the canvas to disturb the field.
4. Use `pulse` to throw a visible mutation wave into the ecosystem.
5. Use `sound` for a quiet generative tone based on the top languages.
6. Use `snapshot` to save a PNG.
7. Use `share` to copy a link for the current repo.
8. Use `fork` to open GitHub's fork page for the current repo.

The same repo produces the same DNA. A fork produces a different one because the owner/repo seed and file tree change.

## How the life model works

This is not biological lab DNA. It is a deterministic digital genome using real DNA letters:

- `A`, `C`, `G` and `T` come from the repo signature and file tree.
- Bases are read in triplets as codons.
- Codons are translated through a standard genetic-code-style table.
- Gene windows produce traits like motility, metabolism, replication, mutation, perception, adhesion, photosynthesis and longevity.
- Organisms move through the terrarium, eat base nutrients, spend energy, reproduce and die.

If someone forks the repo and changes files, the fork gets a new genome and a different terrarium.

## Fork loop

The project is meant to be forkable:

1. Open a repo in Repo Terrarium.
2. Fork it.
3. Change files, folders, languages or docs.
4. Open the fork in Repo Terrarium.
5. Compare the original DNA with the fork DNA.

The terrarium is deterministic, so changes are visible and repeatable.

## Notes

The point is not to be scientifically exact. It is a little instrument for seeing codebases differently.

GitHub API requests are unauthenticated, so very heavy use can hit public rate limits. When that happens, the app still generates an offline terrarium from the repo name.

## License

MIT
