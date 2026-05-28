# Demo Deck Studio Foundation

This folder is the first non-UI foundation for Demo Deck Studio. The skill remains
the conversational entry point, while this layer gives decks a stable manifest,
pattern registry, linting, and PDF export path.

Read `STUDIO.md` for the product thesis, workflow, architecture direction, and
open decisions.

## Commands

Run from the SE-Assistant repo root:

```bash
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs lint merchants/acme/index.html
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs lint merchants/acme/index.html --config merchants/acme/deck.config.json
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs outline merchants/acme/index.html
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs plan merchants/acme/index.html --config merchants/acme/deck.config.json
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs embed-logo merchants/acme/index.html merchants/acme/acme-logo.png --config merchants/acme/deck.config.json
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs fast-follow merchants/acme/index.html merchants/acme/latest-gemini-notes.pdf --config merchants/acme/deck.config.json
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs studio merchants/acme/index.html
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs studio-api merchants/acme/index.html --port 7333
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs studio-v2 merchants/acme/index.html --port 7332 --api-port 7333
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs render-html merchants/acme/index.html merchants/acme/exports/acme-selected-deck.html
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs publish merchants/acme/index.html
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs publish merchants/acme/index.html --field-guide-copy --field-guide-dir /path/to/SE-Field-Guide
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs export-pdf merchants/acme/index.html merchants/acme/exports/acme-demo.pdf
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs update
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs init-config merchants/acme
```

`studio` is the current dependency-light Studio shell. `studio-v2` is the
React/Vite local app scaffold. Install its frontend dependencies once before
using it:

```bash
pnpm --dir .claude/skills/demo-deck-builder/studio/app install
```

The v2 app is additive during migration. Static HTML remains the working deck
artifact and PDF export remains local through `export-pdf`.

## MVP Install Path

Studio is intended to run locally for SEs and AEs:

1. Pull or update the SE Assistant repo.
2. Install the Studio app dependencies with `pnpm`.
3. Run `studio-v2` against a merchant deck.
4. Use **Open deck** for local rehearsal and live demo.
5. Use **Publish** or `publish` to render the current Studio selection to
   `exports/quick/index.html` for internal Quick upload. When the deck is safe
   as a team reference, enable **Field Guide copy** or pass
   `--field-guide-copy` to also save the selected HTML into
   `tools/demo-deck-builder/examples/` in a local Field Guide checkout.
6. Use `export-pdf` for merchant-safe sharing.

For future Studio updates, run:

```bash
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs update
```

Required local dependencies:

- Node.js
- pnpm
- Chrome or Chromium for PDF export
- Access to the merchant folder and deck files

## Philosophy

- HTML remains the editable, presentable working format.
- The strategy plan should make required slide gaps visible before polish work.
- The Studio shell includes a guided slide picker backed by `deck.config.json`.
  It marks modules as required, recommended, or optional and persists include /
  exclude choices without rewriting the deck HTML.
- Studio v2 should make `deck.config.json` / future `deck.manifest.json` the
  source of truth and treat rendered HTML as an export target.
- Every pattern in `pattern-registry.json` can be added from Studio as a real
  previewable slide. Complex modules have MVP renderers first; richer
  manifest-backed editors come next.
- Logos should be embedded as data URIs so the live deck and PDF stay portable.
- Field Guide example copies are local, git-ready files only. Studio does not
  commit or push them.
- Fast follow slides should be generated from post-demo notes and appended before the close, then polished before merchant sharing.
- PDF is the default merchant-safe share artifact.
- Evidence is internal confidence scaffolding. It should support discovery,
  pricing, integration, and case-study claims, but it should not appear in the
  merchant PDF unless explicitly requested.
- Hosting merchant-specific HTML is not the default path.
