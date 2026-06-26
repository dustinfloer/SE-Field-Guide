# Local Simulation File Index

Purpose: exhaustive local-source pull for files related to
`simulations.quick.shopify.io` and adjacent simulation assets.

Last gathered: 2026-06-26.

## Scan Scope

Primary durable locations checked:

- `/Users/mattward/Documents/b2b-ai-catalog/tools/simulations/site`
- `/Users/mattward/Desktop/Claude/simulations`
- `/Users/mattward/Desktop/Claude/matt-ward-portal`
- `/Users/mattward/Desktop/Claude`
- `/Users/mattward/Desktop/Accounts/merchants`
- `/Users/mattward/Documents/b2b-ai-catalog`
- `/Users/mattward/.claude/file-history`
- `/Users/mattward/.config/gcloud/logs`

Noisy generated/session areas were not treated as source of truth except where
they contained durable rollout or deployment evidence. Examples: `.codex`
session logs, broad `.claude` history copies, `.git` internal logs, and repeated
gcloud checksum lines.

## Production Site Root

Canonical repo root:

`/Users/mattward/Documents/b2b-ai-catalog/tools/simulations/site`

Historical local root:

`/Users/mattward/Desktop/Claude/simulations`

This folder is the deployable source for `simulations.quick.shopify.io`. It is a flat static site stored in the SE Field Guide repo so updates can be versioned and reviewed.

| File | Role | Notes |
| --- | --- | --- |
| `index.html` | Production catalog | Current card/search/filter source of truth via `categories` array. Catalog has 13 visible simulations. |
| `source-viewer.js` | Shared source-copy helper | Captures full page HTML before injecting UI, strips its own script tag from copied output, renders Source panel. |
| `se-guide.js` | Shared SE Guide renderer | Injects collapsible SE Guide at body top, reads content by filename, persists collapsed state per page. |
| `se-guide-content.js` | Shared SE Guide content registry | Contains guide entries for current production sims. No current entries for `api-flow-simulator.html` or `html-test-0417.html`. |
| `SIMULATION_CONTEXT.md` | Framework context | Context pack created from source for building new simulations. |
| `SE_SIMULATION_BUILD_BRIEF.md` | Build standard | Trusted-simulation standards, source packet expectations, and QA checklist. |
| `LOCAL_SIMULATION_FILES.md` | Local file index | This file. |

## Current Production Simulation Files

These are present in the simulations root and cataloged in `index.html`.

| File | Title | Lines | Shared helpers |
| --- | --- | ---: | --- |
| `api-rate-limit-calculator.html` | Shopify API Rate Limit Calculator | 1518 | SE Guide, Source Viewer |
| `b2b-payment-flow.html` | Acme Wholesale - Payment Flow Simulation | 769 | SE Guide, Source Viewer |
| `erp-integration-sync.html` | Full Integration Sync - Shopify / ERP | 1259 | SE Guide, Source Viewer |
| `gemini-shopping-sim.html` | Google Gemini Shopping - Agentic Commerce Simulation | 809 | SE Guide, Source Viewer |
| `inventory-sync-multi-store.html` | Multi-Store Inventory Distribution - NetSuite to 2 Shopify Stores | 938 | SE Guide, Source Viewer |
| `netsuite-shopify-flow.html` | NetSuite / iPaaS / Shopify B2B Integration Flow | 1243 | SE Guide, Source Viewer |
| `routine-payouts-erp.html` | Shopify Routine Payouts to ERP GL Posting | 1494 | SE Guide, Source Viewer |
| `shopify-netsuite-order-sync.html` | Semi-Technical Netsuite Integration | 973 | SE Guide, Source Viewer |
| `shopify-netsuite-payment-sync.html` | Shopify to/from NetSuite Order Sync | 1011 | SE Guide, Source Viewer |
| `shopify-oracle-order-capture.html` | Shopify / Oracle - Delayed Capture and Order Editing | 1392 | SE Guide, Source Viewer |
| `shopify-sap-integration.html` | Shopify / SAP S/4 HANA Integration Architecture | 888 | SE Guide, Source Viewer |
| `ucp-agentic-commerce.html` | UCP Agentic Commerce - Search to Checkout | 1303 | SE Guide, Source Viewer |
| `ventrata-ticketing-pdp.html` | Ventrata Ticketing PDP | 1701 | SE Guide, Source Viewer |

## Local Production-Root Extra

| File | Status | Notes |
| --- | --- | --- |
| `html-test-0417.html` | Local test/older asset | Title: Shopify / NetSuite Order Sync. Not cataloged in `index.html`. Only loads `source-viewer.js`; no SE Guide entry. |

Historical local Claude file-history says the site previously had 13 interactive
HTML demos and included `api-flow-simulator.html`. The current 13 cataloged simulations instead include `ventrata-ticketing-pdp.html`; `api-flow-simulator.html` is not currently in the production simulations root.

## Framework Patterns In Current Source

| Pattern | Best source files | Extracted architecture |
| --- | --- | --- |
| Catalog/search/filter | `index.html` | `categories`, `filters`, `renderFilters`, `simMatches`, `renderLibrary`, `renderCard`. |
| Shared SE context | `se-guide.js`, `se-guide-content.js` | Registry keyed by lowercase filename; collapsible top bar injected at body start. |
| Shared source copy | `source-viewer.js` | Self-contained copy workflow for deck reuse; inline mode when `.seg-bar` exists. |
| Stepper/talk track | `b2b-payment-flow.html`, `shopify-oracle-order-capture.html`, `ucp-agentic-commerce.html` | Data arrays plus `renderTimeline`, `renderStep`, `nextStep`, `prevStep`, step buttons. |
| Three-system integration | `netsuite-shopify-flow.html` | Three system columns, `steps` array, active modules, records, logs, API dots, autoplay. |
| Ops console simulator | `erp-integration-sync.html`, `inventory-sync-multi-store.html`, `shopify-netsuite-order-sync.html`, `routine-payouts-erp.html` | `async startDemo()`, delay/speed helpers, console logs, metrics, record state. |
| Agentic commerce/chat | `gemini-shopping-sim.html`, `ucp-agentic-commerce.html` | Scenario arrays, timed chat reveal, product/cart/checkout/protocol panels, replay/speed. |
| Calculator/canvas | `api-rate-limit-calculator.html` | Plan constants, presets, live calculation, canvas timeline, simulated capacity utilization. |

## Portal-Only And Adjacent Local Simulation Assets

Root:

`/Users/mattward/Desktop/Claude/matt-ward-portal`

The portal embeds a wider shelf of simulation pages as iframes. Some file names
overlap with the production simulations folder, but matching names are not
byte-identical.

| File | Title | Lines | Status |
| --- | --- | ---: | --- |
| `api-flow-simulator.html` | Shopify API Flow Simulator | 1280 | Portal-only candidate; likely the missing historical API Flow sim. |
| `api-rate-limit-calculator.html` | Shopify API Rate Limit Calculator | 1516 | Portal copy; differs from production site file. |
| `inmar-integration-v2.html` | Inmar Integration Architecture - Corrected | 407 | Portal-only architecture diagram. |
| `inmar-integration.html` | Inmar Integration Architecture | 381 | Portal-only older Inmar architecture diagram. |
| `inventory-component-example.html` | Inventory Component Preview | 318 | Portal-only product-page component preview. |
| `inventory-sync-animation.html` | Inventory Sync - Shopify / NetSuite | 574 | Portal-only batch inventory animation. |
| `inventory-sync-multi-store.html` | Multi-Store Inventory Distribution - NetSuite to 2 Shopify Stores | 936 | Portal copy; differs from production site file. |
| `inventory-sync-realtime.html` | Real-Time Inventory Sync - Technical Deep Dive (SE Internal) | 1281 | Portal-only real-time inventory/payment/fulfillment simulator. |
| `inventory-sync-technical.html` | Inventory Sync - Technical Deep Dive (SE Internal) | 1195 | Portal-only technical batch inventory simulator. |
| `netsuite-shopify-flow.html` | NetSuite / iPaaS / Shopify B2B Dedicated Store Flow | 1000 | Portal copy; differs from production site file. |
| `shopify-netsuite-payment-sync.html` | Shopify to/from NetSuite Order Sync | 1009 | Portal copy; differs from production site file. |
| `shopify-sap-integration.html` | Shopify / SAP S/4 HANA Integration Architecture | 886 | Portal copy; differs from production site file. |

The portal `index.html` mounts these simulation pages at `page-sim-*` iframe
targets:

- `page-sim-ns-payment-sync` -> `shopify-netsuite-payment-sync.html`
- `page-sim-netsuite` -> `netsuite-shopify-flow.html`
- `page-sim-inmar-v2` -> `inmar-integration-v2.html`
- `page-sim-inmar` -> `inmar-integration.html`
- `page-sim-sap` -> `shopify-sap-integration.html`
- `page-sim-inv-sync` -> `inventory-sync-animation.html`
- `page-sim-inv-multi` -> `inventory-sync-multi-store.html`
- `page-sim-inv-technical` -> `inventory-sync-technical.html`
- `page-sim-inv-realtime` -> `inventory-sync-realtime.html`
- `page-sim-inv-component` -> `inventory-component-example.html`
- `page-sim-rate-limit` -> `api-rate-limit-calculator.html`
- `page-sim-api-flow` -> `api-flow-simulator.html`

## API Flow Simulator Details

Path:

`/Users/mattward/Desktop/Claude/matt-ward-portal/api-flow-simulator.html`

This is the likely source to promote if the missing API Flow sim should be
restored to the production simulations site.

Core structures:

- `PLANS`: Standard, Advanced, Plus, Enterprise.
- `SYSTEMS`: Shopify, Storefront, OMS, ERP, WMS, 3PL, PIM, Loyalty, Customer.
- `FLOW_TYPES`: REST API call, REST response, GraphQL query, GraphQL response,
  Webhook, Bulk Operation.
- `SCENARIOS`:
  - Order Processing Flow
  - Inventory Sync
  - Product Catalog Update
  - B2B Wholesale Flow
  - Flash Sale Surge
  - Multi-System Integration

Core functions:

- canvas setup: `resize`, `computeNodePositions`
- flow animation: `spawnParticle`, `tickFlows`, `drawNode`,
  `drawConnection`, `drawParticle`, `draw`, `update`, `frame`
- controls: `switchScenario`, `resetSim`, `buildLegend`
- capacity helper: `calcBatch`

It currently has no `se-guide-content.js`, `se-guide.js`, or `source-viewer.js`
script tags.

## Other Desktop/Claude Root Copies

| File | Title | Lines | Notes |
| --- | --- | ---: | --- |
| `/Users/mattward/Desktop/Claude/api-rate-limit-calculator.html` | Shopify API Rate Limit Calculator | 1544 | Standalone/root copy with a Visuals tab iframe to `api-flow-simulator.html`. |
| `/Users/mattward/Desktop/Claude/netsuite-shopify-flow.html` | NetSuite / iPaaS / Shopify B2B Dedicated Store Flow | 1000 | Root copy matching portal-era pattern, not production helper-integrated version. |

## Merchant-Specific Simulation Variant

Path:

`/Users/mattward/Desktop/Accounts/merchants/Grace-Management-Group/payment-simulation.html`

Title:

`Grace Management - Payment Flow Simulation`

This is a merchant-specific fork of the B2B payment stepper pattern. It is
useful as an example of taking a generic production sim and adapting it for a
single merchant conversation.

Specific business context pulled from the file:

- Merchant brand: Grace Management Group.
- Central recommendation: all three paths require Shopify Payments.
- Current workflow mapping: Grace's Authorize.net Card on File workflow maps to
  Shopify Payments card vaulting, including $0 card verification at vaulting,
  charge-at-fulfillment, and single-transaction model.
- ERP/system language is customized to Oracle.
- Paths:
  - Path 1: Due on Fulfillment (Vault + Charge at Ship), recommended.
  - Path 2: Auth at Checkout (No Terms + Manual Capture).
  - Path 3: Net Terms (Net 30/45/60/90).

It uses the same `const paths` / `selectPath` / timeline architecture as
`b2b-payment-flow.html`, but is not part of the simulations quick site.

## SE Field Guide And Demo Deck Builder Context

### Tool catalog

Path:

`/Users/mattward/Documents/b2b-ai-catalog/tools/simulations/README.md`

Metadata:

- Name: Simulations
- URL: `https://simulations.quick.shopify.io/`
- Category: Simulations
- Built with: Quick Site
- Audience: Both
- Author: Matt Ward
- Date added: 2026-03-24

Use case:

- live demos
- prospect enablement and self-guided exploration
- team training and onboarding on B2B selling motions

### Catalog JSON

Path:

`/Users/mattward/Documents/b2b-ai-catalog/docs/catalog.json`

Contains the same public catalog record for `slug: "simulations"`.

### Demo Deck Builder skill

Path:

`/Users/mattward/Documents/b2b-ai-catalog/tools/demo-deck-builder/skill/SKILL.md`

Important lines:

- `references/agentic-commerce-sim.html` is the full UCP agentic-commerce slide
  variant.
- `references/simulation-library.md` is the grab-and-go catalog for animated
  simulations at `simulations.quick.shopify.io`.
- The skill instructs deck builders to pull architecture, integration,
  payment-flow, API, and agentic-commerce slides from the simulations library
  rather than rebuilding them from scratch.

### Simulation library reference

Path:

`/Users/mattward/Documents/b2b-ai-catalog/tools/demo-deck-builder/skill/references/simulation-library.md`

Key points:

- Open `https://simulations.quick.shopify.io/<sim-name>.html`.
- Click Source, then Copy HTML.
- Copied output is clean standalone HTML because `source-viewer.js` strips
  itself from the output.
- Use as standalone HTML or an embedded slide; do not iframe the IAP-gated Quick Site for merchant handoff.
- The reference links to repo source under `tools/simulations/site` and notes that `/api-flow-simulator.html` is historical, not current production source.

### Agentic commerce embed reference

Path:

`/Users/mattward/Documents/b2b-ai-catalog/tools/demo-deck-builder/skill/references/agentic-commerce-sim.html`

Key points:

- Drop-in slide, class-prefixed to avoid deck collisions.
- Auto-plays on slide entry.
- Keeps replay and speed controls.
- Includes `Buy for me` -> checkout overlay -> order confirmation back into
  chat.
- Header credits the pattern as originated in Terry Kealey's Hatley deck and
  codified by Matt Ward's simulations site.

### SE Field Guide git context

Repo:

`/Users/mattward/Documents/b2b-ai-catalog`

Current working branch for this source import:

`matt-simulations`

Context:

- The repository is now branded SE Field Guide, though the older `b2b-ai-catalog` clone URL redirects.
- `tools/simulations/site` stores the deployable Quick Site source.
- `tools/simulations/README.md` is the catalog entry and update workflow.

## Historical SE Guide Rollout Context

Path:

`/Users/mattward/.claude/file-history/3425ac05-1d43-4495-a88a-e49600d2bfee/1cbe817f1af61165@v2`

This file is a useful design note for the SE Guide feature.

Extracted intent:

- The simulations site was described as hosting 13 interactive HTML demos used
  by SEs in merchant conversations.
- Feedback: SEs needed more premise/context/talking points before using sims.
- Goal: add a consistent collapsible guide at the top of every simulation page.
- Approach: shared `se-guide.js` modeled after `source-viewer.js` plus
  `se-guide-content.js` keyed by filename.
- Default: expanded first visit, collapsible, persisted in `localStorage`.
- Three content sections:
  - Premise
  - What this simulation shows
  - Talking points
- Landing `index.html` intentionally does not need a guide.
- Historical deploy instruction:

```bash
quick deploy /Users/mattward/Desktop/Claude/simulations simulations --force
```

The repo-source equivalent is:

```bash
quick deploy "$PWD/tools/simulations/site" simulations --force
```

The same historical file listed `api-flow-simulator.html` among the 13 pages. That does not match the current production root, where the file is absent.

Historical `se-guide-content.js` file-history also contains an
`api-flow-simulator.html` guide entry. Current production `se-guide-content.js`
does not.

## Deployment Evidence From Local Gcloud Logs

Local logs show the current Quick deploy backend for the simulations site is a
GCS-backed static directory:

Destination:

`gs://skai-train-quick/sites/simulations`

Historical source:

`/Users/mattward/Desktop/Claude/simulations`

Repo source:

`tools/simulations/site`

Repeated local gcloud logs show deploys using `gcloud.storage.rsync` with:

- `--checksums-only`
- `--custom-metadata {'modified-by': 'matt.ward'}`
- `--delete-unmatched-destination-objects`
- recursive sync
- exclude pattern for dotfiles, `node_modules`, package files, lockfiles, and
  `LICENSE`

Observed deploy dates in local logs:

- 2026-06-08 multiple deploys
- 2026-06-09 deploy
- 2026-06-16 deploys

Example log paths:

- `/Users/mattward/.config/gcloud/logs/2026.06.08/16.38.59.269351.log`
- `/Users/mattward/.config/gcloud/logs/2026.06.09/11.26.00.599764.log`
- `/Users/mattward/.config/gcloud/logs/2026.06.16/11.39.07.140943.log`

This is stronger deployment evidence than the generic Quick notes in adjacent
docs. Use `quick deploy "$PWD/tools/simulations/site" simulations --force` as the ergonomic front door if Quick CLI is available; expect it to rsync the folder to the GCS destination above.

## Career / Impact Context

Path:

`/Users/mattward/Desktop/Claude/career/achievements/impact-log.md`

Evidence entry `ev_015` describes the simulations Quick site as:

- an interactive Quick Site for detailed Shopify integration workflow diagrams
- used for merchant demos and internal enablement
- AI-assisted development creating visual, interactive simulations of Shopify
  integrations with ERP, OMS, PIM, and similar merchant systems
- replacing static slides with dynamic workflow diagrams
- reusable team asset being rolled out to SE-NTRAL
- linked to `simulations.quick.shopify.io`

## Source-Of-Truth Ranking

Use this order when building or modifying a new production simulation:

1. `tools/simulations/site` current repo source.
2. `se-guide.js`, `se-guide-content.js`, and `source-viewer.js` behavior.
3. Historical local root `/Users/mattward/Desktop/Claude/simulations` only as a legacy mirror.
4. Historical SE Guide rollout note for intent.
5. Portal-only simulations for reusable ideas or missing assets.
6. Merchant-specific variants for customization examples.
7. Field Guide and demo-deck-builder docs for deck reuse and external discovery.
8. Gcloud logs for deploy mechanics.

## Important Gaps / Mismatches

- Current production root has 13 cataloged simulations, but the historical 13th sim `api-flow-simulator.html` is still absent.
- The likely `api-flow-simulator.html` source is portal-only and lacks shared
  helpers.
- Several portal sims are useful but not production-cataloged:
  - Inmar integration architecture v1/v2
  - inventory sync animation
  - inventory sync technical
  - inventory sync real-time
  - inventory component preview
- Production and portal files with the same filenames are not identical.
- `html-test-0417.html` is in the production root but not cataloged and has no
  current SE Guide entry.

## Recommended Reuse Path

For a new simulation:

1. Start from the current production root, not the portal copy.
2. Pick the closest production template by pattern.
3. If the new concept is API-flow or inventory/Inmar-specific, mine the portal
   file for domain flow/data, then port it into the production conventions:
   - add SE Guide content
   - add Source Viewer
   - add catalog card in `index.html`
   - verify layout standalone
4. If merchant-specific, follow the Grace Management approach: clone the closest
   generic sim and change the labels, scenario text, ERP/system names, and
   recommendations while preserving the proven stepper framework.
