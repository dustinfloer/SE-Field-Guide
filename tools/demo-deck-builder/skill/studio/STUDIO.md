# Demo Deck Studio

Demo Deck Builder is the skill. Demo Deck Studio is the product direction around it: a guided workspace where SEs and AEs can shape a merchant-specific story together, keep creative control, and export a polished PDF without exposing deck source.

## Product Thesis

SEs and AEs do not need a black-box deck generator. They need a fast creative partner that handles structure, polish, and consistency while keeping humans in control of narrative, proof, and final framing.

Studio should make the strongest path the easiest path:

- Gather merchant context before drafting.
- Choose slide patterns intentionally.
- Keep claims grounded in source notes.
- Preview and edit in a deck-customizer workspace.
- Export a merchant-safe PDF as the default share artifact.

## Primary Users

- **SEs:** Own technical credibility, demo flow, architecture, integrations, and the live presentation artifact.
- **AEs:** Own commercial narrative, executive framing, pricing, next steps, and async follow-up.
- **B2B specialists:** Continue to pioneer deeper patterns, but the workflow should be mainstream for any Plus deal.

## Core Principles

- **Collaborative creative control:** Studio should recommend, assemble, and validate. The seller still chooses the story.
- **Natural-language front door:** "Build me a deck for [merchant]" remains the primary workflow. Studio opens around that workflow for planning, review, editing, linting, and export.
- **PDF-first sharing:** HTML remains the working and live-presentation format. PDF is the merchant share artifact.
- **Evidence can live in the deck:** Source mapping should travel with the deck for credibility, but raw evidence must be polished before it appears in a merchant-facing PDF.
- **Pattern reuse over blank pages:** Most decks should be composed from proven patterns, not invented slide-by-slide.
- **Mainstream by default:** The workflow must work for AEs and SEs who are not comfortable editing HTML.

## Studio Workflow

1. **Brief:** Ingest merchant folder, Salesforce context, meeting notes, Slack/SENTRAL patterns, and optional public research.
2. **Plan:** Propose a slide mix by deal type, audience, and known pain points. Let the user accept defaults or tune the mix.
3. **Compose:** Generate `index.html` from the template, selected patterns, merchant brand, speaker ownership, and source-backed content.
4. **Review:** Run lints for placeholders, missing speakers, external assets, dense slides, print readiness, and unsupported share artifacts.
5. **Brand:** Resolve, preview, and embed merchant logos so the deck stays portable and polished.
6. **Refine:** Let the user swap patterns, rewrite slides, change speaker ownership, and tune the signature AI/demo moment.
7. **Fast follow:** After the demo, ingest call notes and append polished addendum slides for questions, added context, and covered topics.
8. **Export:** Generate a PDF and verify one 16:9 slide per page with final-state snapshots for animated slides.

## User Workflow

The default invocation should not change:

```text
Build me a deck for [merchant]
```

The skill remains the conversational orchestrator. Studio is the local browser workspace it can launch once there is something useful to review, usually after the initial outline or first generated deck.

That keeps the low-friction seller experience while giving power users a place to inspect structure, evidence, warnings, and PDF readiness.

## Deck Customizer UX

Studio should borrow the Shopify theme customizer mental model without becoming
a theme editor clone:

- **Left rail:** deck structure, selected slides/modules, addable modules, and
  excluded sections.
- **Center canvas:** live preview of the manifest-rendered selected deck.
- **Right inspector:** selected slide/module metadata, controlled settings,
  brand tokens, and deck health.
- **Top actions:** Preview Deck, Publish, and eventually Export PDF.

The mapping is intentionally familiar for Shopify sellers and field teams:
deck = theme, slides = sections, slide components = blocks, brand tokens =
theme settings, and publish = static deck render.

## V2 Architecture

Demo Deck Studio v2 should be a manifest-driven local app, not a DOM inference
layer wrapped around a finished HTML deck.

The target architecture has five boundaries:

- **Skill orchestrator:** The conversational skill gathers context, makes
  recommendations, and opens Studio when a deck needs review or editing.
- **Local backend:** `demo-deck-studio.mjs` remains the process launched by the
  skill. It owns filesystem access, manifest writes, deck rendering, linting,
  PDF export, and any sensitive prompts or source context.
- **React frontend:** `studio/app` is the local browser workspace for SEs and
  AEs. It reads typed API responses, edits structured data, and previews the
  selected deck. It should not parse raw merchant context or carry private
  prompt templates.
- **Manifest model:** `deck.config.json` is the compatibility manifest today.
  The stable v2 shape can graduate to `deck.manifest.json` once the renderer is
  manifest-first. Until then, v2 adapters should normalize config + HTML into a
  typed deck model without making rendered HTML the source of truth.
- **Renderer/exporter:** Static HTML and PDF remain first-class outputs. The
  renderer should build a portable merchant-safe `index.html` from the manifest,
  selected patterns, brand tokens, and slide content, then use local Chrome for
  PDF export.

### Source of Truth

The v2 source of truth should be structured deck data:

- Deck metadata: merchant, audience, goal, source paths, export paths.
- Brand tokens: accent colors, logo asset, fonts, watermark behavior.
- Speakers: names, roles, default ownership rules.
- Slides: stable `id`, `pattern`, `section`, `speaker`, `included`, `position`,
  editable fields, evidence IDs, and export behavior.
- Pattern registry: allowed pattern IDs, categories, capabilities, required
  fields, supported renderers, and PDF snapshot mode.
- Evidence: internal source IDs, labels, confidence, and merchant-safe display
  notes where approved.

Rendered HTML should become a projection of the manifest. During migration, the
backend can continue reading legacy HTML for outline and preview, but every new
editing feature should write manifest fields first.

### API Shape

The backend should expose a small local-only API:

- `GET /api/deck` returns a normalized deck model for Studio.
- `POST /api/slide-picker` updates include/exclude state.
- `POST /api/pattern-library/add` appends a structured pattern scaffold.
- Future: `PATCH /api/slides/:id` edits slide fields.
- Future: `POST /api/slides/reorder` updates positions.
- Future: `POST /api/brand` updates brand tokens and asset references.
- Future: `POST /api/render` builds static HTML from the manifest.
- Future: `POST /api/export/pdf` runs local PDF export and returns artifact
  status.

The frontend should treat API responses as authoritative. Any HTML inspection
needed for legacy decks belongs in backend adapters.

### Fast Follow

Fast Follow should not be part of every base deck. It belongs to a post-demo
workflow:

```text
Just finished the demo with LT Apparel, review the notes and update the deck to send accordingly.
```

That flow should ingest call notes on the backend, propose addendum updates, let
the seller approve edits in Studio, then export an updated merchant-safe PDF.

## Current Studio Shell

The local Studio app now includes a guided slide picker. It reads the deck
strategy, pattern registry, existing deck HTML, and `deck.config.json`, then
groups modules as:

- **Required:** strategic coverage the deck should not miss, such as discovery,
  B2B workflows, Agentic Commerce, Sidekick, Plus pricing, and next steps when
  the strategy calls for them.
- **Recommended:** useful structure or evidence modules that improve quality but
  may be omitted intentionally.
- **Optional:** pattern-library modules that can be added for a richer story.

Picker choices are stored under `studio.slide_picker.modules` in
`deck.config.json`. The first version does not rewrite deck HTML directly; it
creates the human-approved plan that generation, linting, and future structured
rendering can honor.

Pattern-library assembly is live for every registered pattern. Studio can add a
real slide to `index.html`, update `deck.config.json`, rerun checks, and refresh
the preview for all modules in `pattern-registry.json`.

Complex interactive modules now have MVP renderers:

- Agentic Commerce
- Sidekick
- ChatGPT x Claude Management
- Interactive Storefront

These are addable, previewable slide modules. They are not yet full
manifest-driven editing surfaces, and the reference simulations should still be
used when a deal needs a highly bespoke animated moment.

The current shell should be treated as a bridge, not the foundation for rich
editing. Keep it working for linting, selection, and preview while v2 comes up.
Avoid adding major new UI behavior to the generated HTML string unless it is
needed to preserve the current workflow.

## Migration Plan

### Phase 0: Preserve the Stable Surface

- Keep `lint`, `outline`, `plan`, `embed-logo`, `fast-follow`, `studio`,
  `export-pdf`, and `init-config` working.
- Leave the static HTML deck and PDF export path intact.
- Add v2 commands and app files additively.

### Phase 1: React App Scaffold

- Add `studio/app` with React, Vite, and TypeScript.
- Reuse the existing local backend endpoints first.
- Add `studio-api` for a backend-only process and `studio-v2` as the eventual
  one-command launcher.
- Render the same current surfaces: strategy, brand, slide picker, checks,
  outline, and embedded preview.

### Phase 2: Manifest Adapter

- Add a backend normalization layer that turns `deck.config.json` plus legacy
  HTML into a typed `StudioDeck`.
- Stop letting the frontend infer slide state from iframe DOM or rendered HTML.
- Add stable slide IDs and pattern IDs to old decks as a safe migration command.

### Phase 3: Manifest-First Renderer

- Implement pattern renderers that take structured slide fields and produce
  static HTML sections.
- Render selected decks from manifest state rather than hiding source HTML
  sections after the fact.
- Keep legacy HTML parsing only for imported or pre-v2 decks.

### Phase 4: Creative Controls

- Add reorder, include/exclude, speaker assignment, field editing, brand token
  editing, logo management, and layout controls as manifest writes.
- Keep private prompts, source transcripts, and context summarization on the
  backend.

### Phase 5: Export and Review

- Add frontend export actions backed by local Chrome.
- Add snapshot controls for animated slides.
- Add internal review vs merchant-safe export modes.
- Make Fast Follow a post-demo workflow that proposes updates before writing
  final deck content.

## MVP Scope

The true MVP should let an SE or AE build, tune, preview, share internally, and
export a merchant-safe deck without editing HTML.

### In MVP

- Slide library: every registered pattern can be added, included, excluded, and
  previewed.
- Structured edits: text fields, speaker ownership, and slide metadata edit the
  manifest, not raw HTML.
- Design controls: colors, fonts, and animation presets come from approved
  libraries. Users should pick from named options rather than free-form CSS.
- Brand controls: logo, watermark, accent colors, and font preset should be
  visible in Studio.
- Preview: open the selected deck locally for presenting and rehearsal.
- Quick site publishing: push a shareable internal/demo preview for SE/AE
  collaboration and live demo use.
- PDF export: generate the merchant-safe share artifact locally, including
  Fast Follow after a demo.
- Fast Follow: post-demo notes update the deck through an approval workflow
  before export.
- Install docs: one clear local setup path for the org, with prerequisites,
  commands, troubleshooting, and quick-site update instructions.

### Out of MVP

- Full free-form design editing.
- Browser-based editing of arbitrary deck HTML.
- Cloud-hosted merchant-facing HTML as the default sharing path.
- Automatic publication of raw discovery notes, transcripts, Slack content, or
  unreviewed Salesforce details.

## Local Install and Run Model

Yes: Studio can be installed and run locally.

The local model is:

1. SE Assistant repo contains the skill, backend, renderer, and React app.
2. `pnpm` installs the local Studio app dependencies.
3. `demo-deck-studio.mjs studio-v2 <deck.html>` starts a local backend and Vite
   app.
4. The backend reads/writes the merchant folder on disk.
5. The browser UI talks only to the local backend.
6. Static HTML remains the live presentation artifact.
7. Local Chrome handles PDF export.
8. Quick-site publishing is the only step that intentionally pushes an artifact
   somewhere shareable.

Required local dependencies:

- Node.js
- pnpm
- Chrome or Chromium for PDF export
- Access to the SE Assistant repo and merchant folders

Recommended default commands:

```bash
pnpm --dir .claude/skills/demo-deck-builder/studio/app install
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs studio-v2 merchants/lt-apparel/index.html --port 7332 --api-port 7333
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs export-pdf merchants/lt-apparel/index.html merchants/lt-apparel/exports/lt-apparel-demo-deck.pdf
```

Install docs for broader rollout should prefer `pnpm` over `npm` because some
Shopify environments block global npm usage.

## Share Precedence

Use these paths in order:

1. **Local Studio / Open Deck:** working review, rehearsal, and live demo.
2. **Quick site:** internal SE/AE collaboration and controlled demo sharing.
3. **PDF export:** merchant-safe external artifact, especially after Fast
   Follow.

Do not make quick-site HTML the default merchant share artifact. PDF remains the
safe default.

## Evidence Model

Evidence should be deck-native, but tiered:

- **Internal source map:** `deck.config.json` and slide metadata track source IDs, confidence, owner, and last-reviewed date.
- **Polished merchant proof:** Select slides can display concise source notes when they increase credibility, such as "Discovery workshop, May 2026" or "Salesforce opportunity notes."
- **Appendix mode:** A source appendix can be exported for internal review or highly technical audiences, but it should not be automatic.

Raw transcript excerpts, Slack snippets, unreviewed Salesforce notes, and speculative confidence labels should never appear in the merchant PDF.

## Pattern Governance

Pattern contribution should be open to the team with lint gates:

- Any SE or AE can contribute a pattern.
- Every pattern needs registry metadata, preview/example HTML, export behavior, and source requirements.
- CI or a local lint command should reject placeholders, external merchant assets, missing speaker ownership, missing print support, and invalid pattern metadata.
- Curators should review high-traffic patterns for narrative quality, not act as a bottleneck for all contributions.

## Near-Term Roadmap

- Add `lint --fix` for safe mechanical fixes such as generic speaker labels, missing print classes, and legacy merchant logo class aliases.
- Expand pattern-library assembly to cover interactive sims, then add remove/reorder actions against structured slide data.
- Expand `plan` and `outline` into a content review surface with section grouping, pattern detection, required-slide gates, and confidence status.
- Add basic edit actions to the local Studio app: speaker assignment, title rewrite, slide hide/show, and export PDF.
- Add guided brand asset controls: discovered logo candidates, local upload, crop/background choice, and text-logo fallback.
- Expand fast follow from heuristic extraction into an AI-assisted review that answers open questions with source-backed copy.
- Add `snapshot` support for animated slides so PDF exports can intentionally choose first, active, or final state.
- Add config validation for required evidence on pricing, discovery recap, integration claims, and case-study metrics.
- Add starter deck presets for B2B, DTC, hybrid, executive readout, and technical deep dive.

## Open Decisions

- Should AEs edit structured slide content in a form-based UI, Markdown, or the existing HTML?
- Should the first editing model modify HTML directly, or should it require a structured deck model first?
- Should PDF export include speaker notes as an internal appendix, or should notes stay separate from merchant artifacts?
- Should the source/evidence layer map claims to Salesforce/notes automatically, or begin as manually curated source IDs?
