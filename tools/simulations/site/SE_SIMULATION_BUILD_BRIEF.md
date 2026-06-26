# SE Simulation Builder Brief

Audience: Shopify Solutions Engineers, SE enablement builders, and LLM agents
building browser-based HTML simulations for merchant conversations.

Purpose: create trusted, reusable, self-contained simulations that explain
Shopify workflows through realistic system states, UI states, API actions, and
merchant outcomes.

Status: first rigorous brief for peer sharing and future skill packaging.

Last updated: 2026-06-24.

## Executive Standard

A simulation is not a decorative diagram. It is a guided proof of how a merchant
workflow behaves on Shopify.

Every simulation must:

- Start from a real merchant question, objection, workflow, or decision point.
- Use verified Shopify capability from source-of-truth docs.
- Show the buyer/business surface and the system/API surface when relevant.
- Make state changes visible: order state, payment state, inventory state,
  fulfillment state, API call, webhook, retry, queue, or ledger entry.
- Be self-contained HTML that opens in a browser without a build step.
- Include a clear talk track for SEs.
- Avoid unsupported Shopify claims, invented API names, or imagined product
  behavior.

If the simulation cannot be verified against trusted Shopify sources, do not
build it as a confident demo. Build it as a clearly labeled conceptual mockup or
pause until verification is complete.

## Source Of Truth Rules

Use this source hierarchy for every Shopify capability claim:

1. Public Shopify developer docs: `shopify.dev`
2. Shopify Help Center: `help.shopify.com`
3. Current private/internal Shopify docs owned by the relevant product, API, or
   field team
4. Existing working Shopify code, sample apps, or verified dev-store tests
5. Existing simulations in this local library, only as UI/architecture
   references, never as product truth by themselves
6. Secondary materials such as slide decks, Slack summaries, AI memories, or
   old notes, only as leads to verify

Never use training-data recollection as source of truth for:

- API names
- mutation arguments
- webhook topic names
- access scopes
- plan gating
- rate limits
- payment behavior
- B2B terms behavior
- capture windows
- feature availability
- checkout, payments, or financial claims

For private Shopify docs, the brief or prompt must name the source explicitly.
Examples:

- "Verified against B2B Field Learnings and Solutions Guide, section X, read on
  YYYY-MM-DD."
- "Verified against Vault page [title], owner [team], read on YYYY-MM-DD."
- "Verified by dev-store test in [store], API version [version], on YYYY-MM-DD."

If private and public docs conflict, do not silently choose. Surface the
conflict, identify the owner to resolve it, and keep the simulation conservative
until resolved.

## Required Source Packet

Every new simulation request should include or create a source packet before
HTML is written. This is the minimum packet an SE or LLM agent needs to build
with confidence:

```md
## Source Packet

Simulation name:
Merchant or archetype:
Prepared by:
Prepared on:

## Public Sources
| Claim area | Source URL | API version/date | What it verifies |
| --- | --- | --- | --- |
|  |  |  |  |

## Private Sources
| Claim area | Internal source title | Owner/team | Read date | What it verifies |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## Dev-Store Or Code Verification
| Claim area | Store/app/repo | API version | Test date | Evidence |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |
```

The source packet should support a claim ledger. Use one row per meaningful
Shopify behavior shown in the UI, API block, talk track, or catalog copy.

```md
## Claim Ledger

| Claim shown in simulation | Source | Confidence | If unverified, how it is labeled |
| --- | --- | --- | --- |
| Shopify sends an order webhook to the middleware | Webhooks docs + app config | Verified | N/A |
| UCP checkout handoff uses [specific route] | Missing current internal UCP source | Unverified | Conceptual placeholder |
```

Rules:

- A beautiful simulation with an empty claim ledger is not production-ready.
- Existing local simulations can provide layout and interaction patterns, but
  they do not satisfy the claim ledger by themselves.
- Private-source summaries must include the source title, owner/team, and read
  date even if the full private URL cannot be shared broadly.
- Any claim marked unverified must either be removed, labeled conceptual in the
  UI, or blocked until the right source is provided.
- Re-run this packet whenever API versions, payment behavior, beta status, plan
  gating, or checkout behavior could have changed.

## Public Docs Baseline

These public docs are the minimum baseline for common simulation patterns. They
do not replace private docs when a capability is private, Plus-gated, beta, or
field-learnings-driven.

Public-doc facts in this section were checked against the official public pages
listed here on 2026-06-24. Re-check them for every new production simulation,
especially when using `latest`, payment behavior, API limits, beta/private
features, or version-sensitive mutations.

### Admin API and versioning

- GraphQL Admin API reference:
  `https://shopify.dev/docs/api/admin-graphql/latest`
- REST Admin API reference:
  `https://shopify.dev/docs/api/admin-rest`

Build guidance:

- Prefer GraphQL Admin API for new app/integration simulations.
- Treat REST Admin API as legacy unless the scenario is explicitly about a
  legacy integration or migration.
- Use the latest stable API version in examples unless the merchant scenario
  requires a specific version.
- Verify every mutation, query, enum, input object, and access scope against the
  selected API version.

Current public-doc facts to preserve:

- Public docs show GraphQL Admin API `2026-04` as latest as of this brief.
- Public docs show REST Admin API `2026-01` as latest as of this brief.
- REST Admin API is a legacy API as of 2024-10-01, and new public apps must use
  GraphQL Admin API as of 2025-04-01.

### API limits and bulk operations

- Shopify API limits:
  `https://shopify.dev/docs/api/usage/limits#rate-limits`
- Bulk operations:
  `https://shopify.dev/docs/api/usage/bulk-operations/queries`

Build guidance:

- Show GraphQL throughput as calculated query cost, not simple request count.
- Show REST as legacy/leaky-bucket behavior only where appropriate.
- For large reads/writes, include Bulk Operations as the preferred pattern when
  public docs support the use case.
- In capacity simulations, show throttling as a state the client handles with
  queueing, backoff, caching, and lower-cost queries.

Current public-doc facts to preserve:

- GraphQL Admin API uses calculated query cost with plan-based restore rates.
- GraphQL mutation default cost is 10 unless Shopify assigns manual costs.
- A single GraphQL query has a maximum requested cost of 1,000 points.
- Input arrays max at 250 items.
- Bulk operations reduce manual pagination and client-side throttle management
  for large-volume GraphQL Admin API work.
- API versions `2026-01` and higher support up to five bulk query operations at
  a time per shop; earlier versions support one.

### Webhooks and event-driven integration

- Webhooks overview:
  `https://shopify.dev/docs/apps/build/webhooks`

Build guidance:

- Use webhooks to show event-driven sync.
- Use API calls to show querying/mutating state.
- Do not use polling as the default story unless the merchant actually has a
  polling architecture; frame webhooks as the better default where docs support
  it.
- Include retry/queue/dead-letter concepts as integration architecture, but do
  not invent Shopify retry timing unless verified.

Current public-doc facts to preserve:

- Webhooks notify apps about near-real-time shop events.
- Webhooks are useful for keeping apps in sync or triggering actions after an
  event.
- Webhooks are a performant alternative to continuously polling for shop data.

### Inventory

- `inventorySetQuantities`:
  `https://shopify.dev/docs/api/admin-graphql/latest/mutations/inventorySetQuantities`
- `inventoryAdjustQuantities`:
  `https://shopify.dev/docs/api/admin-graphql/latest/mutations/inventoryAdjustQuantities`

Build guidance:

- Use `inventorySetQuantities` when the upstream system acts as source of truth
  and is setting absolute quantities.
- Use `inventoryAdjustQuantities` when applying deltas.
- Show `referenceDocumentUri`, reason, and audit trail concepts when relevant.
- Include idempotency if using API version `2026-04` or later for these
  inventory mutations.

Current public-doc facts to preserve:

- `inventorySetQuantities` sets named quantities with absolute values and
  supports compare-and-set behavior.
- Shopify docs warn to use `inventorySetQuantities` only for a system acting as
  source of truth; otherwise consider `inventoryAdjustQuantities`.
- `inventoryAdjustQuantities` applies incremental delta changes at specific
  locations.
- As of API version `2026-04`, these inventory mutations require an idempotency
  key using the `@idempotent` directive.

### Fulfillment

- `fulfillmentCreate`:
  `https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentCreate`

Build guidance:

- Use `fulfillmentCreate`, not older mutation names, unless a version-specific
  doc or private source requires otherwise.
- Model fulfillment from Fulfillment Order objects.
- Show tracking info, notification preference, and fulfillment order line items
  only if the source docs support the fields you display.

Current public-doc facts to preserve:

- `fulfillmentCreate` creates fulfillment for one or more Fulfillment Order
  objects associated with the same order and assigned to the same location.
- The mutation can mark items fulfilled and can include tracking/customer
  notification details.

### Order editing

- `orderEditBegin`:
  `https://shopify.dev/docs/api/admin-graphql/latest/mutations/orderEditBegin`
- `orderEditAddShippingLine`:
  `https://shopify.dev/docs/api/admin-graphql/latest/mutations/orderEditAddShippingLine`
- Always verify any other order edit mutation before use.

Build guidance:

- Represent order editing as a session workflow.
- Use `orderEditBegin`, stage changes, then `orderEditCommit`.
- Do not imply an edit is saved until the commit step is shown.

Current public-doc facts to preserve:

- `orderEditBegin` starts an order editing session and returns an Order Edit
  Session and Calculated Order.
- Public docs describe order editing as a three-step workflow: begin the edit,
  apply changes with order edit mutations, then save with `orderEditCommit`.

### B2B payment terms and authorization

- B2B payment terms:
  `https://help.shopify.com/en/manual/b2b/checkout-and-orders/payment-terms`
- Payment authorization and capture:
  `https://help.shopify.com/en/manual/payments/payment-authorization`

Build guidance:

- For B2B payment simulations, verify each payment path against public help docs
  and any private field-learning docs.
- Treat saved-card vaulting, mandate payment, and processor-specific behavior as
  high-risk claims requiring private-source or dev-store verification.
- Keep bank-view panels clearly illustrative unless backed by exact product
  behavior.

Current public-doc facts to preserve:

- B2B payment term types include no payment terms, net terms, due on
  fulfillment, and fixed date for individual draft orders.
- B2B customers can pay during the term period through customer accounts by
  clicking Pay now.
- Payments are not automatically captured when B2B payment terms expire.
- Shopify Payments standard authorization period is 7 days.
- Extended authorization periods are available only to Shopify Plus stores using
  Shopify Payments.
- Public docs list up-to-30-day authorization periods for Visa, Mastercard, and
  American Express in the extended authorization table, and an extra charge
  after the standard 7-day period.

### Agentic commerce / UCP

The current local simulations include UCP and Gemini-shopping concepts. Public
Shopify developer docs available during this brief did not provide enough
authoritative implementation detail to treat UCP operation names, protocol
routes, checkout behavior, or merchant-of-record claims as developer-doc-verified
for new simulations.

Build guidance:

- Use current internal Shopify UCP/product docs as the source of truth.
- Label agentic-commerce scenes as conceptual unless verified against the
  current UCP source.
- Do not invent `/.well-known`, tool names, payment handler behavior, loyalty
  behavior, discount behavior, merchant-of-record claims, or checkout handoff
  mechanics without direct source support.
- If using the existing local UCP simulations as visual references, re-verify
  the product details before reuse.

## Local Simulation Library Context

Canonical repo source root:

`tools/simulations/site`

Historical local root:

`/Users/mattward/Desktop/Claude/simulations`

Supporting local context:

- `SIMULATION_CONTEXT.md`: framework summary and build workflow.
- `LOCAL_SIMULATION_FILES.md`: exhaustive local file inventory.
- `source-viewer.js`: reusable Source panel.
- `se-guide.js`: reusable SE Guide renderer.
- `se-guide-content.js`: reusable guide content registry.

Current production catalog has 13 visible simulations in `index.html`:

- `gemini-shopping-sim.html`
- `ucp-agentic-commerce.html`
- `netsuite-shopify-flow.html`
- `shopify-netsuite-order-sync.html`
- `shopify-netsuite-payment-sync.html`
- `inventory-sync-multi-store.html`
- `shopify-sap-integration.html`
- `shopify-oracle-order-capture.html`
- `erp-integration-sync.html`
- `routine-payouts-erp.html`
- `api-rate-limit-calculator.html`
- `b2b-payment-flow.html`
- `ventrata-ticketing-pdp.html`

Local non-cataloged or historical assets:

- `html-test-0417.html`: older/test NetSuite sync asset in production root.
- `matt-ward-portal/api-flow-simulator.html`: likely missing historical API Flow
  sim and useful canvas architecture reference.
- `matt-ward-portal/inmar-integration*.html`: Inmar architecture references.
- `matt-ward-portal/inventory-sync-*.html`: earlier inventory animation,
  technical, and real-time simulator variants.
- `Desktop/Accounts/merchants/Grace-Management-Group/payment-simulation.html`:
  merchant-specific fork of the B2B payment flow.

## Which Existing Simulation To Copy

Choose the closest pattern. Do not start from an empty page unless no pattern
fits.

### Stepper / talk-track simulation

Best source:

- `b2b-payment-flow.html`

Use for:

- payment paths
- policy paths
- order edit flows
- approval workflows
- finance/AR workflows
- scenarios where the SE needs to pause step-by-step

Architecture:

- `const paths` or `const steps`
- `currentPath`, `currentStep`
- clickable timeline
- `renderTimeline`
- `renderStep`
- `nextStep`, `prevStep`, `goToStep`
- status chips and API blocks

Design notes:

- Keep timeline left, explanation and system state right.
- Show API call as monospace block.
- Show business state and system state together.
- Use path tabs for alternate flows.

### Three-system integration simulation

Best source:

- `netsuite-shopify-flow.html`

Use for:

- ERP / middleware / Shopify architecture
- iPaaS patterns
- master-data sync
- order lifecycle diagrams
- customer/company/price-list/inventory sync

Architecture:

- three main columns
- `steps` array controls active modules and records
- event log
- animated API dots between systems
- replay/pause controls
- progress bar

Design notes:

- Put system-of-record on the left, orchestration in the center, Shopify on the
  right unless the merchant story demands another layout.
- Make object mappings visible.
- Highlight the system currently acting.
- Avoid making the diagram static; every step should change something.

### Operations console simulation

Best sources:

- `erp-integration-sync.html`
- `inventory-sync-multi-store.html`
- `shopify-netsuite-order-sync.html`
- `routine-payouts-erp.html`

Use for:

- technical validation
- retry/idempotency narratives
- event logs
- inventory counters
- payout reconciliation
- fulfillment/invoice/payment sequencing

Architecture:

- `async startDemo()`
- `delay` helper
- speed/pause support
- console entry renderer
- record/counter update functions
- metrics panel

Design notes:

- Logs should use stable tags: WEBHOOK, GRAPHQL, REST, ERP, SYSTEM, PAYMENT,
  FULFILLMENT, ERROR.
- Keep payload snippets small and relevant.
- Show error/retry only if it teaches a decision point.
- Do not bury the business outcome under console noise.

### Chat / agentic commerce simulation

Best sources:

- `gemini-shopping-sim.html`
- `ucp-agentic-commerce.html`
- `Documents/b2b-ai-catalog/.../agentic-commerce-sim.html`

Use for:

- AI-assisted discovery
- agent-mediated checkout
- cart handoff
- search-to-order narratives
- executive future-commerce demos

Architecture:

- scenario data array
- timed chat reveal
- product/card panel
- protocol or checkout state panel
- replay and speed controls
- optional checkout overlay

Design notes:

- Keep the buyer interaction concrete.
- Show agent/system calls only if verified.
- Avoid AI hype copy. The value is the change in commerce workflow.
- All UCP details need current internal source verification.

### Calculator / capacity simulator

Best sources:

- `api-rate-limit-calculator.html`
- `matt-ward-portal/api-flow-simulator.html`

Use for:

- API limits
- batch sizing
- throughput
- concurrency
- queueing
- operational risk

Architecture:

- constants for plans, limits, scenario presets
- form controls
- calculated result panel
- canvas or chart
- live simulation loop

Design notes:

- Separate rate/capacity from bucket fill.
- Show headroom, not just pass/fail.
- Include "what to change" guidance: reduce query cost, batch, use Bulk
  Operations, queue, cache, or smooth burst traffic.
- Verify all rate limit numbers against the current docs before publishing.

## Required HTML Structure

Use one self-contained HTML file per simulation.

Minimum structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simulation Title</title>
  <style>
    /* All simulation CSS here */
  </style>
</head>
<body>
  <!-- Simulation UI here -->

  <script>
    // All page-specific simulation JS here
  </script>
  <script src="se-guide-content.js"></script>
  <script src="se-guide.js"></script>
  <script src="source-viewer.js"></script>
</body>
</html>
```

Rules:

- No build step.
- No framework dependency.
- No external runtime JS dependency.
- Google Fonts are acceptable but not required.
- Keep all page-specific CSS and JS embedded.
- Shared helpers are loaded from files in the same static site root.
- The page must work from filesystem open and from Quick static hosting.

## Required SE Guide Entry

Every production simulation needs a matching entry in `se-guide-content.js`.

Format:

```js
'new-simulation.html': {
  title: 'Short display title',
  premise: 'The merchant story or business scenario being modeled.',
  shows: 'What the simulation shows on screen, including the panels and flow.',
  talkingPoints: [
    'Capability or architecture point to land',
    'Common objection this resolves',
    'Implementation or risk detail worth naming'
  ]
}
```

Writing rules:

- Premise: 1-2 sentences.
- Shows: 2-3 sentences.
- Talking points: 3-5 bullets.
- No unsupported product claims.
- If a talking point depends on private docs, mark it internally until verified.

## Required Catalog Entry

Every production simulation needs an `index.html` card.

Add it to the appropriate `categories[*].sims[]` array:

```js
{
  title: "Readable card title",
  desc: "One-sentence description of what the simulation does.",
  useWhen: "The merchant situation where an SE should open it.",
  file: "new-simulation.html",
  systems: ["Shopify", "ERP", "Middleware"],
  audience: ["Technical", "Operations"],
  tags: ["Demo", "ERP", "Inventory"]
}
```

Rules:

- Use an existing category unless a new reusable category is needed.
- Tags should help search and filtering.
- `useWhen` should be practical and scenario-based.
- Systems should name the actual systems in the visual.
- Audience should help SEs choose during prep.

## Visual Design System

The current library uses dark, dense, utilitarian UI. Preserve that feel.

Shared visual principles:

- Start on the simulation, not a marketing page.
- Keep the viewport useful immediately.
- Use compact headers and controls.
- Use cards only for repeated objects, tools, panels, or modals.
- Avoid nested cards.
- Use restrained gradients only for identity and state; do not let the page
  become a decorative gradient composition.
- Use Shopify green as a system identity accent, not as the entire palette.
- Use color to encode system, direction, status, or event type.
- Keep text readable at desktop and narrow widths.
- Use stable dimensions for controls, counters, boards, and panels to avoid
  layout shifting during animation.

Common color roles from existing sims:

- Shopify / success: `#95bf47`, `#96bf48`, `#34d399`
- NetSuite / blue: `#60a5fa`
- Middleware / integration: `#a78bfa`, `#ec4899`
- ERP / finance: orange/amber ranges
- Error / danger: `#f87171`
- Muted text: slate/gray ranges
- Backgrounds: deep neutral/navy/black surfaces

Accessibility and presentation rules:

- Buttons must be real `<button>` elements.
- Links must be real `<a>` elements.
- Do not rely only on color; include labels or status text.
- Keep hit areas large enough for live demo use.
- Avoid hover-only controls for essential actions.
- Include reduced-motion fallback if animation is intense.
- Keep keyboard shortcuts optional, not required.

## Interaction Requirements

Every simulation should have the controls its pattern needs.

Recommended controls:

- Replay or Reset
- Start/Pause for auto-running flows
- Speed control for timed demos
- Step buttons or timeline for non-linear presentation
- Scenario/path selector for alternate workflows
- Source button via `source-viewer.js`
- SE Guide via `se-guide.js`

Behavior rules:

- Reset must return to a clean initial state.
- Replay must not duplicate timers or leave old state.
- Speed/skip must not break state.
- Scenario switching must cancel or reset prior timers.
- In-flight animations must not keep running after reset.
- A final/completed state should be legible without needing narration.

## API Referencing Standards

When showing an API action:

- Use the exact public or private verified API name.
- Include the selected API version in the brief or code comments if the API
  behavior is version-sensitive.
- Include required access scopes only when verified.
- Use GraphQL naming for GraphQL operations and REST path naming for REST
  operations.
- Show `userErrors` or error handling for GraphQL mutation examples.
- Include idempotency keys where docs require or recommend them.
- Do not display full sensitive payloads, tokens, or merchant private data.
- Use realistic IDs only as fake `gid://shopify/...` examples.

Good API block:

```text
GraphQL Admin API 2026-04
inventoryAdjustQuantities @idempotent(key: "uuid")

Reason: sale
Reference: netsuite://sales-order/SO-1042
Delta: -4 available at Location 7281903
Result: inventoryAdjustmentGroup created, userErrors empty
```

Bad API block:

```text
Shopify syncs inventory automatically with ERP.
```

That is too vague and may imply native behavior that actually requires an app,
middleware, connector, or custom integration.

## API Action Mapping Patterns

Use these mappings as starting points, then verify against docs for the exact
scenario.

### Order lifecycle

Typical visual states:

- Buyer places order
- Shopify order exists
- Webhook notifies middleware
- Middleware maps payload
- ERP creates sales order
- Fulfillment status returns
- Buyer sees tracking/status

Potential references:

- `orders/create` webhook topic, if verified for the app configuration
- GraphQL Admin API order query/mutation as needed
- `fulfillmentCreate` for fulfillment creation

Do not imply:

- ERP sync is native without an app/connector/middleware.
- Fulfillment happens without Fulfillment Orders if the API requires them.

### Inventory sync

Typical visual states:

- ERP/WMS is source of truth for on-hand quantity.
- Shopify tracks available/committed inventory for sell-through.
- Order decrements or commits stock in Shopify.
- ERP/WMS pushes absolute or delta update.
- Shopify inventory state changes and storefront availability updates.

Potential references:

- `inventorySetQuantities` for source-of-truth absolute sets.
- `inventoryAdjustQuantities` for deltas.
- inventory-level webhook topics only after verifying the exact topic.

Do not imply:

- Absolute set and delta adjustment are interchangeable.
- Compare-and-set can be omitted casually.
- Inventory updates are safe under concurrency without idempotency/compare logic.

### Payment terms and capture

Typical visual states:

- Buyer checks out under a company location.
- Payment state differs by terms/capture path.
- Invoice or payment collection event occurs.
- Bank/AR/ERP view updates.

Potential references:

- B2B payment terms help docs.
- Payment authorization and capture help docs.
- Private field docs for saved-card, mandate, vaulted payment, and B2B-specific
  collection behaviors.

Do not imply:

- Terms expiration auto-captures payment.
- All payment providers support the same capture behavior.
- Vaulted card behavior or mandate payment is available without verifying plan,
  payment provider, scopes, and product constraints.

### Payout reconciliation

Typical visual states:

- Shopify Payments payout created.
- Transactions are itemized.
- Refunds, fees, adjustments, and sales are categorized.
- ERP journal entry posts to GL.

Potential references:

- Shopify Payments API docs and private finance docs as needed.
- ERP connector docs if naming specific connectors.

Do not imply:

- Every ERP has a native Shopify GL connector.
- Accounting entries are universal across merchants.

### Agentic commerce

Typical visual states:

- Buyer asks an AI assistant.
- Product options are surfaced.
- Cart or checkout state is created.
- Buyer reviews/authorizes.
- Order confirmation returns.

Potential references:

- Current internal UCP / agentic commerce docs.
- Public docs only if they provide the exact behavior.

Do not imply:

- Any protocol endpoint, checkout handoff, loyalty, discount, or payment behavior
  unless verified.

## Content Model Before Building

Before writing HTML, fill this out:

```md
## Simulation Proposal

Name:
Merchant / archetype:
Primary audience:
Business question:
Objection addressed:
Systems:
Source of truth docs:
Private sources:
API version:
Plan / feature gates:

## Flow
1.
2.
3.
4.
5.

## State Changes
- Order:
- Payment:
- Inventory:
- Fulfillment:
- ERP:
- Buyer-facing:

## API / Event References
| Step | Operation/event | Source doc | Verified? | Notes |
| --- | --- | --- | --- | --- |

## Talk Track
Premise:
What this shows:
Talking points:

## Risks / Unknowns
-
```

Do not code until this is complete.

## LLM Build Instructions

Use this instruction block when asking an LLM to build a simulation:

```text
You are building a Shopify SE browser simulation as a self-contained HTML file.

Hard rules:
- Use only verified Shopify capability from the source docs provided in this prompt.
- Do not invent Shopify API names, webhook topics, limits, scopes, feature gates,
  payment behavior, or protocol behavior.
- If a capability is not verified, label it conceptual or ask for the missing source.
- Build one standalone HTML file with embedded CSS and JS.
- No build step. No external JS dependencies.
- Follow the current simulations.quick.shopify.io patterns:
  - dense dark UI
  - compact controls
  - visible business + system state
  - timeline/stepper or animated system panels
  - replay/reset
  - SE Guide and Source Viewer integration if this is for the shared site
- Prefer GraphQL Admin API for new integration examples unless the verified
  source requires REST.
- Include exact API operation names only when verified.
- Include state transitions and error/retry handling where useful.

Before coding:
1. Summarize the merchant scenario.
2. Build a source packet from public Shopify docs, private Shopify docs, and any
   dev-store or code verification supplied.
3. Produce a claim ledger mapping each Shopify capability shown in the UI or
   talk track to a source.
4. Identify the closest existing local template.
5. Produce a step/state/API map.
6. Call out unknowns and label unverified concepts before implementation.

Then implement:
1. Create the HTML file.
2. Add SE Guide content.
3. Add the index catalog card.
4. Verify locally in browser.
5. Check reset/replay/speed/step behavior.
6. Check Source copies clean HTML.
```

## QA Checklist

Functional:

- Opens directly in browser.
- Works from filesystem and static hosting.
- No console errors.
- Controls work: replay/reset/start/pause/speed/steps/scenario selector.
- Timers are cleaned up on reset.
- Scenario switching does not leave stale UI.
- Final state is visually clear.

Responsive:

- Desktop layout works.
- Narrow/tablet layout works.
- Text does not overlap controls.
- Buttons remain usable.
- Panels scroll where needed.

Trust:

- Every API/event name has a source.
- Every plan gate has a source.
- Every payment or financial claim has a source.
- Private-source claims are labeled internally and traceable.
- No old local sim is copied without re-verifying product details.

SE usability:

- SE Guide exists.
- Premise is clear.
- What-this-shows text matches the actual UI.
- Talking points are usable in a customer call.
- The first screen communicates what the sim is about.
- The sim can be paused or stepped through during a live call.

Catalog:

- `index.html` has a card.
- Search terms find it.
- Category and tags are right.
- File name is stable and lowercase.
- Deck-builder references are updated if it should be reusable by others.

Deployment:

- Repo source folder is clean enough to deploy.
- Run the deploy command only after visual verification:

```bash
cd ~/Documents/b2b-ai-catalog
quick deploy "$PWD/tools/simulations/site" simulations --force
```

- Spot-check the live page and at least two existing pages after deploy.

## How This Becomes A Skill

This brief is intentionally structured so it can become a Codex/Claude skill.

Future skill package should include:

- `SKILL.md` with trigger phrases:
  - "build a Shopify simulation"
  - "create a simulations.quick.shopify.io page"
  - "make an ERP/payment/API/inventory simulation"
  - "add a sim to the SE simulation library"
- `references/source-hierarchy.md`
- `references/api-verification-checklist.md`
- `references/design-patterns.md`
- `references/local-simulation-library.md`
- `templates/stepper-sim.html`
- `templates/integration-flow-sim.html`
- `templates/ops-console-sim.html`
- `templates/chat-agentic-sim.html`
- `templates/calculator-sim.html`
- `scripts/validate-sim.js` for checking required script tags, guide entry, and
  catalog card

Skill behavior should require:

1. Source verification before implementation.
2. Existing-template selection.
3. Generated HTML.
4. SE Guide entry.
5. Catalog entry.
6. Browser verification.
7. Deployment instructions, not automatic deploy unless requested.

## Peer Handoff Summary

When sending this brief to a peer, include these files:

- `SE_SIMULATION_BUILD_BRIEF.md`
- `SIMULATION_CONTEXT.md`
- `LOCAL_SIMULATION_FILES.md`

Tell them:

1. Start with the brief.
2. Use `SIMULATION_CONTEXT.md` for the build workflow.
3. Use `LOCAL_SIMULATION_FILES.md` to find source examples and historical assets.
4. Verify every Shopify product/API claim from Shopify docs before building.
5. Build as a self-contained HTML sim.
6. Add SE Guide and catalog entries before sharing.
