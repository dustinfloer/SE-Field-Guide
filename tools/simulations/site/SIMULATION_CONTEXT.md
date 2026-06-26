# Simulation Site Context

Purpose: context pack for creating the next simulation for
`https://simulations.quick.shopify.io/`.

Last gathered: 2026-06-26.

## Canonical Source

- Repo source root: `tools/simulations/site` in the SE Field Guide repo.
- Live site: `https://simulations.quick.shopify.io/`
- Historical local source root: `/Users/mattward/Desktop/Claude/simulations`
- The site is a flat static site. Each simulation is a standalone HTML file with embedded CSS and JS.
- Shared helper scripts live beside the HTML files:
  - `source-viewer.js`
  - `se-guide.js`
  - `se-guide-content.js`

## Adjacent Context Sources

- Field Guide catalog entry:
  `tools/simulations/README.md`
- Demo Deck Builder reference:
  `tools/demo-deck-builder/skill/references/simulation-library.md`
- Embed-ready agentic commerce reference:
  `tools/demo-deck-builder/skill/references/agentic-commerce-sim.html`
- Career impact note:
  `/Users/mattward/Desktop/Claude/career/achievements/impact-log.md`
- Adjacent API flow simulator not currently in the simulations folder:
  `/Users/mattward/Desktop/Claude/matt-ward-portal/api-flow-simulator.html`
- Expanded local-source index:
  `tools/simulations/site/LOCAL_SIMULATION_FILES.md`

## Current Catalog

The canonical catalog is in `index.html` inside the `categories` array.

| Category | File | Simulation |
| --- | --- | --- |
| Agentic Commerce | `gemini-shopping-sim.html` | Google Gemini Shopping Experience |
| Agentic Commerce | `ucp-agentic-commerce.html` | UCP Agentic Commerce Protocol |
| NetSuite | `netsuite-shopify-flow.html` | iPaaS Integration Flow |
| NetSuite | `shopify-netsuite-order-sync.html` | Semi-Technical Order Sync |
| NetSuite | `shopify-netsuite-payment-sync.html` | Order and Payment Sync (API Detail) |
| NetSuite | `inventory-sync-multi-store.html` | Multi-Store Inventory Distribution |
| SAP | `shopify-sap-integration.html` | S/4 HANA Integration Architecture |
| Oracle | `shopify-oracle-order-capture.html` | Delayed Capture and Order Editing |
| ERP (Generic) | `erp-integration-sync.html` | Full Integration Sync - Order Lifecycle |
| ERP (Generic) | `routine-payouts-erp.html` | Routine Payouts to ERP GL Posting |
| API | `api-rate-limit-calculator.html` | Rate Limit Calculator |
| Payments | `b2b-payment-flow.html` | B2B Payment Flow Simulation |
| Custom | `ventrata-ticketing-pdp.html` | Ventrata Ticketing PDP |

`html-test-0417.html` exists in the site root but is not part of the current `index.html`
catalog. Treat it as an older/test asset unless there is a specific reason to
reuse it.

Older references mentioned `api-flow-simulator.html`, but that file is not in the
current deployable simulations site root. A likely related version is in
`Desktop/Claude/matt-ward-portal/api-flow-simulator.html`.

## Shared Helpers

### `source-viewer.js`

Drop-in source panel. Include before `</body>`:

```html
<script src="source-viewer.js"></script>
```

Behavior:

- Captures full document source before injecting UI.
- Strips its own `<script src="source-viewer.js"></script>` tag from copied
  output so copied simulations are clean standalone HTML.
- Adds a floating `</> Source` button, or an inline button if `.seg-bar` exists.
- Opens a slide-out panel with highlighted source, line numbers, stats, and a
  Copy HTML button.

### `se-guide.js` and `se-guide-content.js`

Drop-in SE brief. Include before `</body>`:

```html
<script src="se-guide-content.js"></script>
<script src="se-guide.js"></script>
```

Behavior:

- Looks up `window.SE_GUIDE_CONTENT[filename]`.
- Renders a collapsible top-of-page guide with:
  - Premise
  - What this simulation shows
  - Talking points
- Adds a Home link to `index.html`.
- Persists collapsed state per page in `localStorage`.
- Silently no-ops if the filename has no guide entry.

For a new production simulation, add a matching entry to `se-guide-content.js`.

## Page Architecture

The working pattern is:

1. One static `.html` file per simulation.
2. Full document scaffold: `<!DOCTYPE html>`, responsive viewport, title,
   embedded `<style>`, body markup, embedded simulation `<script>`, then shared
   helpers.
3. No build step and no runtime JS dependencies. Google Fonts are sometimes used
   via CSS imports, but most pages rely on system fonts.
4. Simulation logic is data-driven when possible:
   - arrays of `steps`, `paths`, `SCENARIOS`, `PRESETS`, or `flows`
   - small renderer functions such as `renderTimeline`, `renderStep`,
     `renderProducts`, `updateMetrics`, `drawTimeline`
   - one state block such as `currentStep`, `currentScenario`, `currentPath`,
     `speedMultiplier`, `running`
5. Interactions are intentionally demo-friendly:
   - replay/start/reset controls
   - speed controls when animation timing matters
   - direct step selection for non-linear talk tracks
   - visible API/event/financial/system state changes
6. Merchant-facing pages should show business context and system handoffs, not
   just animation.

## Proven Simulation Patterns

### Stepper / Talk-Track Template

Best source: `b2b-payment-flow.html`.

Use when the SE needs to walk through a sequence and pause on each state.

Pattern:

- Define `paths` or `steps` as structured data.
- Render a sidebar timeline with clickable steps.
- Render the selected step into main panels.
- Include `nextStep`, `prevStep`, `goToStep`, `renderTimeline`, `renderStep`,
  and `updateNav`.

Good for:

- payment paths
- order state changes
- policy or operational workflows
- before/after comparisons

### Three-System Integration Flow

Best source: `netsuite-shopify-flow.html`.

Use when visualizing ERP/middleware/Shopify movement.

Pattern:

- Three columns for system-of-record, middleware, and Shopify.
- `steps` array controls active modules, logs, record updates, and API dots.
- Auto-play with pause/replay.
- Progress bar plus event log.

Good for:

- ERP integrations
- iPaaS choreography
- order, inventory, pricing, and customer sync

### Console / Operations Simulator

Best sources: `erp-integration-sync.html`, `inventory-sync-multi-store.html`,
`shopify-netsuite-order-sync.html`, `routine-payouts-erp.html`.

Use when the audience cares about operational telemetry.

Pattern:

- System panels with live counters, status pills, or record cards.
- Console entries tagged by event type, API type, system, or response code.
- `async startDemo()` sequence with delay helper and pause/speed support.
- Metrics update as the flow progresses.

Good for:

- fulfillment lifecycle
- inventory allocation
- payout reconciliation
- retry/idempotency stories

### Chat / Agentic Commerce Flow

Best sources: `gemini-shopping-sim.html`, `ucp-agentic-commerce.html`, and the
embed reference `agentic-commerce-sim.html`.

Use when showing AI-mediated buying or UCP.

Pattern:

- Chat pane plus right-side product/cart/checkout/protocol pane.
- Scenario data contains user prompt, AI response, products, selected product,
  checkout metadata, and confirmation.
- Runner uses `delay`, `addMessage`, `showTyping`, `renderProducts`,
  `buyForMe`, and checkout completion.
- Include replay and speed controls.

Good for:

- discovery to checkout
- UCP capability negotiation
- product recommendation and purchase flows

### Calculator / Canvas Simulator

Best source: `api-rate-limit-calculator.html`.

Adjacent source: `matt-ward-portal/api-flow-simulator.html`.

Use when the user manipulates inputs and sees capacity/risk update live.

Pattern:

- Form controls on one side, computed output on the other.
- Named plan/rate-limit constants.
- Rendered gauges and canvas timeline.
- Optional live simulation driven by `setInterval` or `requestAnimationFrame`.

Good for:

- API rate limits
- throughput and batch sizing
- request/response visualization

## Index Architecture

`index.html` is the catalog and should be updated for every production sim.

Important blocks:

- `categories`: source of truth for visible cards.
- `filters`: visible filter chips.
- `allSims`: flattened derived list.
- `renderFilters`: builds filter buttons.
- `simMatches`: search and filter logic.
- `renderLibrary`: groups filtered cards by category.
- `renderCard`: individual card markup.

To add a simulation:

1. Add the new HTML file in the site root.
2. Add a `se-guide-content.js` entry keyed by exact lowercase filename.
3. Add a `categories[*].sims[]` object in `index.html`.
4. Add a new category only if no existing category fits.
5. Add a filter only if it will be reused across multiple simulations.
6. Update the Field Guide / demo-deck-builder simulation-library reference if the sim should be
   discoverable from demo-deck-builder.

## New Simulation Build Workflow

1. Define the use case.
   - Merchant scenario
   - Audience: executive, technical, finance, operations, B2B, developer
   - Systems involved
   - Exact objection or validation moment
2. Pick a source template.
   - Stepper: `b2b-payment-flow.html`
   - Three-system integration: `netsuite-shopify-flow.html`
   - Console/ops: `erp-integration-sync.html`
   - Agentic/chat: `gemini-shopping-sim.html` or `ucp-agentic-commerce.html`
   - Calculator/canvas: `api-rate-limit-calculator.html`
3. Create a new standalone HTML file.
4. Keep all CSS and page JS embedded.
5. Include shared helper scripts at the end:

```html
<script src="se-guide-content.js"></script>
<script src="se-guide.js"></script>
<script src="source-viewer.js"></script>
```

6. Add SE Guide content:

```js
'new-simulation.html': {
  title: 'Short display title',
  premise: 'Merchant/business scenario in 1-2 sentences.',
  shows: 'What the animation demonstrates on screen.',
  talkingPoints: [
    'Capability or decision point to land',
    'Common objection this resolves',
    'Implementation detail worth calling out'
  ]
}
```

7. Register the page in `index.html`.
8. Open locally and verify the experience at desktop and narrow widths.
9. Check the Source button copies clean HTML.
10. If sharing live, deploy the static folder through the current Quick process.

## UX Standards From Existing Sims

- Start directly in the useful simulation, not a landing page.
- Keep the interface dense and demo-ready.
- Show state changes in the UI, not only in text.
- Use compact controls: replay, speed, tabs, stepper, scenario buttons, and
  filter chips.
- Maintain Shopify green as a system identity accent, but do not make every sim
  a one-color green theme.
- Use realistic system labels and event names.
- Show both human-facing and system-facing state where relevant.
- Avoid hiding the important technical detail behind decorative animation.
- If facts are product/API-specific, verify them before treating the simulation
  as merchant-facing.

## QA Checklist

- New file opens directly from the filesystem.
- Layout works at desktop and tablet/narrow widths.
- No required network dependency except optional fonts.
- Controls are reachable and do not require a precise presentation click.
- Replay/reset returns the simulation to a clean initial state.
- Speed/skip controls do not break state.
- `se-guide-content.js` contains an entry for the new filename.
- Source button appears and copied HTML excludes `source-viewer.js`.
- `index.html` card links to the new file and search/filter can find it.
- External references are updated if deck builders or catalogs should discover
  it.

## Deployment Notes

Local gcloud logs show this site deploys as a static directory sync to:

`gs://skai-train-quick/sites/simulations`

Deploy the repo source with Quick CLI access:

```bash
cd ~/Documents/b2b-ai-catalog
quick deploy "$PWD/tools/simulations/site" simulations --force
```

The historical local deploy command used `/Users/mattward/Desktop/Claude/simulations`.
Treat `tools/simulations/site` as the durable source of truth going forward.
