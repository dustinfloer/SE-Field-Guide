# Demo Deck Studio v2 App

This is the React/Vite frontend app for Demo Deck Studio v2. It is
additive during migration: the existing `studio` command still serves the
dependency-light shell, and static HTML/PDF export remains owned by
`demo-deck-studio.mjs`.

Run from the repo root:

```bash
pnpm --dir .claude/skills/demo-deck-builder/studio/app install
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs init-manifest merchants/lt-apparel/index.html --force
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs studio-v2 merchants/lt-apparel/index.html --port 7332 --api-port 7333
```

Studio opens in your default browser automatically. Add `--no-open` if you want
the server to start without launching a browser.

Export the currently selected manifest deck as portable HTML:

```bash
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs render-html merchants/lt-apparel/index.html merchants/lt-apparel/exports/lt-apparel-selected-deck.html
```

Publish the selected Studio deck into a Quick-ready folder:

```bash
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs publish merchants/lt-apparel/index.html
```

For split-process development:

```bash
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs studio-api merchants/lt-apparel/index.html --port 7333
pnpm --dir .claude/skills/demo-deck-builder/studio/app run dev
```

The app consumes `/api/deck`, `/api/slide-picker`, `/api/pattern-library/add`,
and `/api/pattern-library/refresh`. When `deck.manifest.json` exists beside the
deck, the local API treats it as the preferred slide-selection source and mirrors
changes back into `deck.config.json` for compatibility with the existing static
HTML/PDF export path. The `/deck` preview, `render-html`, `publish`, and
`export-pdf` commands render the selected deck from manifest slide inclusion
instead of serving the full source HTML deck with excluded slides hidden.

## Local Runtime

Studio is designed to run locally. The browser UI is a local Vite app, and the
Node backend reads/writes the merchant deck files on disk. No merchant deck data
needs to leave the machine unless the seller explicitly publishes a quick site
or shares a PDF.

For org rollout, document `pnpm` as the package manager. Some Shopify
environments block global `npm` usage.

If the browser says `127.0.0.1 refused to connect`, the local Studio server is
not running. Restart the `studio-v2` command and keep that terminal process open.
