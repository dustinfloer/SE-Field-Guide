# SE Field Guide

Tools, simulations, references, and guides — built by the **B2B SE Team** for the broader SE community.

**[Browse the Field Guide](https://dustinfloer.github.io/SE-Field-Guide/)**

---

## What Is This?

The B2B SE team builds a lot — quick sites, MCP tools, simulations, primers, theme forks. This is the single place to discover everything that exists, find the link, and learn how to use it.

The repo is the **trusted SE Field Guide**: the source of truth for the catalog entry, ownership, freshness, and review status. Each entry links out to wherever the asset actually lives.

Items that are specifically about B2B (App Directory, Field Learnings, Demo Recipes, Punchout primer, etc.) are tagged **B2B** so cross-segment SEs can filter them out or in.

See [FIELD_GUIDE_STRATEGY.md](FIELD_GUIDE_STRATEGY.md) for the product direction, governance model, and roadmap.

## Categories

| Category | What Belongs Here |
|----------|-------------------|
| **Tools** | Utilities that help SEs do their job — research, prep, scoring, automation |
| **Simulations** | Interactive demos, sandbox environments, merchant-facing proof of concepts |
| **References** | Lookup resources, cheat sheets, decision trees, comparison guides |
| **Workflows** | End-to-end processes the team has codified (deck building, demo prep, etc.) |
| **Guides** | Primers, walkthroughs, and explainers that level up SE craft |

## Adding a Tool

Built something you're proud of? Add it to the catalog in under 5 minutes — no git CLI required.

**[Full Contributing Guide](CONTRIBUTING.md)**

### Quick Version

1. Go to [templates/new-tool.md](templates/new-tool.md) and copy the contents
2. Create a new folder under `tools/` with your tool's name
3. Paste into a `README.md` in that folder and fill it out
4. Open a Pull Request — the catalog updates automatically on merge

## How It Works

- Each tool lives in its own folder under `tools/` with a `README.md` containing metadata
- Each entry includes trust metadata: owner, status, access level, reviewer, and freshness window
- A GitHub Action automatically builds the browsable catalog site on every merge to `main`
- CI validates required metadata before publishing
- The catalog site at [dustinfloer.github.io/SE-Field-Guide](https://dustinfloer.github.io/SE-Field-Guide/) provides search and filtering

## Questions?

Drop a message in the team Slack channel or open an issue on this repo.
