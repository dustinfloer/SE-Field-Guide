---
name: "Demo Deck Studio"
description: "Local AE/SE Studio and Claude Code skill for building Shopify × Merchant demo decks. Includes a React/Vite Studio v2 app, 21 addable slide patterns, animated AI/storefront modules, linting, static HTML output, and merchant-safe PDF export."
url: "https://demo-deck-builder.quick.shopify.io/"
category: "Tools"
built_with: "Claude Code Skill + Node CLI + React/Vite Studio + HTML/CSS/JS Scaffold"
audience: "Both"
author: "Dustin Floer & Matt Ward"
author_slack: "@dustin.floer"
date_added: "2026-04-17"
status: "active"
access_level: "internal"
source_of_truth: "repo"
reviewed_by: "@dustin.floer"
last_reviewed: "2026-05-28"
review_cycle_days: "90"
screenshot: ""
slack_channel: "global-b2b-sales-team"
repo_url: "https://github.com/dustinfloer/SE-Field-Guide/tree/main/tools/demo-deck-builder"
---

# Demo Deck Studio

A reusable, local Studio workflow for building polished Shopify × Merchant demo decks — the same visual style Jordan/Terry/Matt pioneered with the transferflow deck, now moving toward collaborative AE/SE creative control. The final artifact remains a static HTML deck and merchant-safe PDF, while Studio v2 gives the team a real local app for module selection, preview, checks, and future editing controls.

## What It Does

Gives you three ways to work:

- **Natural-language generation:** Use the skill in Claude Code or Cursor to build a merchant deck from local context, Salesforce notes, meeting artifacts, and known deal signals.
- **Local Studio v2:** Run the React/Vite Studio app from the SE Assistant repo to pick modules, preview the selected deck, inspect checks, and open the static deck locally.
- **Manual HTML fallback:** Edit the generated `index.html` directly when needed. The static deck stays portable and can still be opened in Chrome without Studio.

## Why It's Different from AI HTML Decks

[AI HTML Decks](../ai-html-decks/) (Terry/Matt/Brandon's workflow) is the general approach — prompt Claude, get HTML. **This tool removes the "where do I start" friction** by providing:

- A pre-built scaffold with all CSS/JS (1,700+ lines, tuned over dozens of iterations)
- 21 registered slide patterns available as Studio modules
- Animated Gemini + Sidekick chat mockups with timed message reveals
- Visual effects baked in (mesh gradient backgrounds, floating particles, pulse rings on section headers, gradient text accents)
- Controlled Studio style libraries for color schemes, font pairings, and motion modes
- A Claude Code skill that fully automates the build for SEs
- A Studio v2 foundation with `deck.config.json`, `deck.manifest.json`, a pattern registry, a local Node API, a React/Vite frontend, linting, and PDF export

Think: **AI HTML Decks = prompt → result. Demo Deck Studio = skill → local app → selected static deck → PDF.**

## When to Use It

- Pre-sales demo decks for any B2B / DTC / hybrid Shopify deal
- Executive presentations where the merchant expects polish
- Decks that will be presented as HTML but shared with merchants as PDF
- Decks that need animated "wow" moments (Gemini simulations, Sidekick mockups)

## What You Get

Every generated deck includes:

| Feature | Description |
|---------|-------------|
| **Cover slide** | Shopify × Merchant logos, eyebrow, title, meta bar with AE/SE names |
| **Discovery Recap** | Two-column list — what's confirmed vs in motion |
| **About Shopify** | 4-tile stats grid with gradient numbers |
| **B2B Evolution** | 4-point horizontal timeline |
| **Customer Proof** | 6-tile peer brand grid |
| **Aspiration** | Big centered vision statement |
| **Agenda** | 3-column grouped TOC with staggered reveal |
| **Section Headers** | Pulse rings + glowing headline + badge row |
| **Agentic Commerce** | Animated Gemini chat (4 messages, timed reveals, embedded product page) |
| **Sidekick** | Animated Sidekick chat showing real operational workflows |
| **Feature slides** | Two-column with browser mockups (12+ mock types available) |
| **Three Anchors** | Outcomes summary with 3 cards |
| **Pricing Tiers** | 3-column with featured middle tier + math callout |
| **Closing** | Next-steps cards with staged reveal |
| **Studio v2 checks** | Local module picker, selected deck preview, style libraries, missing module checks, placeholders, assets, and print/PDF readiness |

Navigation built in: keyboard arrows, space, click zones, swipe, bottom nav dots, progress bar, speaker tag (AE/SE toggle per slide).

## Live Example

The [PDI demo deck](./examples/pdi-demo-deck.html) (152KB, 25 slides) is the reference implementation. Download it and open in Chrome to see everything in action.

## Latest Update

**May 28, 2026:** Publish can optionally save reviewed, merchant-safe decks as
local Field Guide example copies. Use this to build the inspiration library
without asking SEs to manually upload deck HTML.

**May 28, 2026:** Studio theme controls now use controlled libraries for color
schemes, font pairings, and motion modes. The renderer applies those manifest
choices to preview, Quick-ready HTML, and PDF export.

## How to Get Started

### Fast install / update path

No Field Guide folder required:

```bash
curl -fsSL https://raw.githubusercontent.com/dustinfloer/SE-Field-Guide/main/tools/demo-deck-builder/install.sh | bash
```

That command downloads the latest released skill from GitHub, copies it into
`SE-Assistant/.claude/skills/demo-deck-builder`, refreshes Codex/Cursor/Pi
symlinks when those folders exist, and installs the Studio app dependencies.
If your SE Assistant folder is somewhere custom, pass the path:

```bash
curl -fsSL https://raw.githubusercontent.com/dustinfloer/SE-Field-Guide/main/tools/demo-deck-builder/install.sh | bash -s -- --se-assistant /path/to/SE-Assistant
```

If you already have the Field Guide repo locally:

```bash
cd /path/to/SE-Field-Guide
git pull origin main
bash tools/demo-deck-builder/install.sh --se-assistant /path/to/SE-Assistant
```

If the Field Guide repo is already nested inside your local SE Assistant
workspace, the script can usually auto-detect the workspace:

```bash
bash tools/demo-deck-builder/install.sh
```

Once Demo Deck Studio is installed, future updates can be run from the Studio
CLI without remembering the curl command:

```bash
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs update
```

If the SE Assistant workspace is somewhere custom:

```bash
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs update --se-assistant /path/to/SE-Assistant
```

### Local Studio v2 prerequisites

- SE Assistant repo access
- Node.js
- pnpm
- Chrome or Chromium for PDF export

Run Studio v2 against a local deck:

```bash
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs studio-v2 merchants/[merchant]/index.html --port 7332 --api-port 7333
```

Studio v2 opens the React app in your default browser automatically. Add
`--no-open` only when you want to keep the browser closed.

### For SEs (Claude Code users)

1. Run the installer:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/dustinfloer/SE-Field-Guide/main/tools/demo-deck-builder/install.sh | bash
   ```
2. Restart Claude Code (or the VS Code extension) so it picks up the updated skill
3. In any session, type `/demo-deck-builder [merchant name]` — Claude builds the deck and can launch Studio for review

### For AEs / SEs editing locally

1. Run the installer against your SE Assistant workspace
   ```bash
   curl -fsSL https://raw.githubusercontent.com/dustinfloer/SE-Field-Guide/main/tools/demo-deck-builder/install.sh | bash
   ```
2. Open the SE Assistant repo locally
3. Run `studio-v2` against the merchant deck; the React app opens in your browser automatically
4. Choose slides, preview the selected deck, and open the static HTML deck for rehearsal or live demo
5. Click **Publish** or run `publish` to create `exports/quick/index.html` for internal Quick upload
6. Enable **Field Guide copy** during Publish only when the deck is reviewed and safe to use as team inspiration
7. Export PDF before sending anything externally to a merchant

## Reference Docs (Inside This Folder)

- [`skill/SKILL.md`](./skill/SKILL.md) — Claude Code skill definition and workflow
- [`skill/references/slide-patterns.md`](./skill/references/slide-patterns.md) — Every slide type with HTML snippets
- [`skill/references/visual-effects.md`](./skill/references/visual-effects.md) — Mesh bg, particles, pulse rings, gradient accents
- [`skill/references/chat-animation.md`](./skill/references/chat-animation.md) — Gemini/Sidekick animated chat pattern
- [`skill/references/customization-guide.md`](./skill/references/customization-guide.md) — 9-step adaptation workflow
- [`skill/studio/STUDIO.md`](./skill/studio/STUDIO.md) — Studio v2 architecture, MVP scope, and share precedence
- [`skill/studio/app/README.md`](./skill/studio/app/README.md) — React/Vite local app commands

## Sharing / Exporting

The skill outputs `merchants/[merchant]/index.html` for live local presentation and internal review. Use this precedence:

1. **Local Studio / Open Deck:** working review, rehearsal, and live demo control.
2. **Quick site:** internal Shopify collaboration and demo sharing. Quick sites are internal and IAP-gated.
3. **PDF export:** merchant-safe external follow-up, including approved post-demo fast-follow updates.
4. **Field Guide example copy:** optional local, git-ready inspiration artifact saved after review. Studio does not commit or push it.

Only save a Field Guide example when the deck is polished, reusable as pattern
inspiration, and safe for internal reuse. Remove or generalize sensitive
merchant details, raw transcript notes, private Slack/Salesforce context,
custom pricing, and anything marked internal-only before enabling the copy.

Useful commands:

```bash
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs lint merchants/[merchant]/index.html
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs outline merchants/[merchant]/index.html
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs init-manifest merchants/[merchant]/index.html --force
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs studio merchants/[merchant]/index.html
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs studio-v2 merchants/[merchant]/index.html --port 7332 --api-port 7333
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs render-html merchants/[merchant]/index.html merchants/[merchant]/exports/[merchant]-selected-deck.html
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs publish merchants/[merchant]/index.html
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs publish merchants/[merchant]/index.html --field-guide-copy --field-guide-dir /path/to/SE-Field-Guide
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs export-pdf merchants/[merchant]/index.html merchants/[merchant]/exports/[merchant]-demo-deck.pdf
```

Quick sites are useful for internal Shopify review, but they are not the default merchant-share artifact. Password-protected GitHub Pages is now a legacy exception path, not the default.

## Tips

- **Let the Gemini chat play out** — the 12.5s message reveal sequence gives you time to narrate
- **Pick the right persona** — Gemini = consumer buyer, Sidekick = merchant operator. Don't mix them
- **Only include Sales Rep slide if they have sales reps** — otherwise it's a hallucination from other templates
- **Max 3 section headers per deck** — pulse rings lose impact if overused
- **Default palette is healthcare teal** — swap in the `:root` CSS variables for different industries (recipes in the customization guide)
- **Run the linter before sharing** — catches placeholders, missing speakers, external assets, and PDF-readiness gaps
- **Use Fast Follow after the call** — review notes, propose deck updates, approve the addendum, then export a merchant-safe PDF
- **Share PDF with merchants** — keep HTML and quick sites as working, presenter, and internal collaboration artifacts

## Credits

Visual style inspired by the transferflow quick site built by Jordan Yeats, Terry Kealey, and Matt Ward. Scaffolding extracted and generalized after iterating with Claude Code on the PDI demo deck (April 2026).

## Feedback

DM `@dustin.floer` on Slack or ping `#global-b2b-sales-team` with questions, requests, or examples of decks you've built with it.
