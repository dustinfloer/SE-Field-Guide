# Simulation Library

A grab-and-go catalog of animated simulations at **[simulations.quick.shopify.io](https://simulations.quick.shopify.io/)**. The deployable source now lives in this repo at [`tools/simulations/site`](../../../simulations/site/), so deck builders can retrieve, update, and review simulations without relying only on a local Quick Site folder.

When a merchant deck needs an architecture, payment, integration, API-scale, ticketing, or agentic-commerce slide, pull from this library instead of generating from scratch.

> ⚠️ **Important:** The simulations Quick Site is Shopify-only and may be gated by Google SSO/IAP. Do **not** iframe live sim URLs into merchant-facing decks. For merchant handoff, embed the simulation HTML inline so the deck runs standalone.

---

## How to grab a simulation as a slide

### Option A — copy from the live Quick Site

1. Sign in with your Shopify Google account.
2. Open the sim at `https://simulations.quick.shopify.io/<sim-name>.html`.
3. Click the **`</> Source`** button.
4. Click **Copy HTML** — you get a clean, self-contained HTML block with the `<script src="source-viewer.js">` tag stripped.
5. Paste the `<style>` + slide/container markup + `<script>` blocks directly into your deck.

### Option B — copy from GitHub/source checkout

1. Open the source file under [`tools/simulations/site`](../../../simulations/site/).
2. Copy the page’s embedded `<style>`, main simulation container, and page-specific `<script>` into your deck.
3. Do **not** copy the shared helper script tags (`se-guide-content.js`, `se-guide.js`, `source-viewer.js`) into a merchant deck unless you intentionally want those controls included.

Once pasted inline, the sim runs self-contained in the deck with no network dependency beyond any optional font imports already in the page.

---

## Available simulations

Source of truth: [`tools/simulations/site/index.html`](../../../simulations/site/index.html).

### Agentic Commerce

| Sim | URL | Source | Use when |
|---|---|---|---|
| **Google Gemini Shopping Experience** | `/gemini-shopping-sim.html` | [`gemini-shopping-sim.html`](../../../simulations/site/gemini-shopping-sim.html) | Buyer-side AI-assisted discovery, recommendations, cart, and checkout. See also the drop-in variant at [`agentic-commerce-sim.html`](./agentic-commerce-sim.html). |
| **UCP Agentic Commerce Protocol** | `/ucp-agentic-commerce.html` | [`ucp-agentic-commerce.html`](../../../simulations/site/ucp-agentic-commerce.html) | Technical buyers ask what UCP does between an AI agent, Shopify, payment handlers, and checkout. |
| **ChatGPT × Claude Store Management** | local reference only | [`chatgpt-claude-management-sim.html`](./chatgpt-claude-management-sim.html) | Merchant-side store management from ChatGPT and Claude in parallel. This is a deck-builder reference, not a live simulations Quick Site page. |

### NetSuite

| Sim | URL | Source | Use when |
|---|---|---|---|
| iPaaS Integration Flow | `/netsuite-shopify-flow.html` | [`netsuite-shopify-flow.html`](../../../simulations/site/netsuite-shopify-flow.html) | Mid-market B2B replatforming with NetSuite and Celigo/Boomi-style middleware. |
| Semi-Technical Order Sync | `/shopify-netsuite-order-sync.html` | [`shopify-netsuite-order-sync.html`](../../../simulations/site/shopify-netsuite-order-sync.html) | Walking a CTO or ops lead through order lifecycle. |
| Order & Payment Sync (API Detail) | `/shopify-netsuite-payment-sync.html` | [`shopify-netsuite-payment-sync.html`](../../../simulations/site/shopify-netsuite-payment-sync.html) | Technical audience wants webhook/API-level order and payment sync detail. |
| Multi-Store Inventory Distribution | `/inventory-sync-multi-store.html` | [`inventory-sync-multi-store.html`](../../../simulations/site/inventory-sync-multi-store.html) | Merchant has multiple storefronts fed by a single NetSuite inventory pool. |

### SAP

| Sim | URL | Source | Use when |
|---|---|---|---|
| S/4 HANA Integration Architecture | `/shopify-sap-integration.html` | [`shopify-sap-integration.html`](../../../simulations/site/shopify-sap-integration.html) | Enterprise merchant with SAP S/4 HANA and middleware. |

### Oracle

| Sim | URL | Source | Use when |
|---|---|---|---|
| Delayed Capture & Order Editing | `/shopify-oracle-order-capture.html` | [`shopify-oracle-order-capture.html`](../../../simulations/site/shopify-oracle-order-capture.html) | Oracle-backed merchant needs order validation, edits, or capture after checkout. |

### ERP (Generic)

| Sim | URL | Source | Use when |
|---|---|---|---|
| Full Integration Sync — Order Lifecycle | `/erp-integration-sync.html` | [`erp-integration-sync.html`](../../../simulations/site/erp-integration-sync.html) | Generic ERP, end-to-end order flow with visible API calls. |
| Routine Payouts to ERP GL Posting | `/routine-payouts-erp.html` | [`routine-payouts-erp.html`](../../../simulations/site/routine-payouts-erp.html) | Finance audience needs payout reconciliation to GL journal entries. |

### API

| Sim | URL | Source | Use when |
|---|---|---|---|
| Rate Limit Calculator | `/api-rate-limit-calculator.html` | [`api-rate-limit-calculator.html`](../../../simulations/site/api-rate-limit-calculator.html) | Technical discovery around request cost, concurrency, plan limits, and headroom. |

> Historical note: older references mentioned `/api-flow-simulator.html`, but that file is not currently in the deployable simulations site source.

### Payments

| Sim | URL | Source | Use when |
|---|---|---|---|
| B2B Payment Flow | `/b2b-payment-flow.html` | [`b2b-payment-flow.html`](../../../simulations/site/b2b-payment-flow.html) | Compare Due on Fulfillment, Auth at Checkout, Net Terms, invoicing, and AR. |

### Custom

| Sim | URL | Source | Use when |
|---|---|---|---|
| Ventrata Ticketing PDP | `/ventrata-ticketing-pdp.html` | [`ventrata-ticketing-pdp.html`](../../../simulations/site/ventrata-ticketing-pdp.html) | Attractions, museums, ticketed experiences, or custom PDP conversations need to show Ventrata-backed availability, holds, and Shopify checkout handoff. |

---

## Integration patterns

### Inline embed — recommended, works for merchant handoff

Copy the sim into a deck slide. You will usually need to:

1. Merge the sim’s `<style>` into the deck’s `<head>`.
2. Paste the sim’s main container into a `<section class="slide">`.
3. Append the sim’s page-specific `<script>` before `</body>`.
4. Remove or skip shared site-only helpers unless needed in the deck.

The [`agentic-commerce-sim.html`](./agentic-commerce-sim.html) file in this folder is an example of a pre-extracted embed-ready version.

### Pre-extracted sims in this folder

When a sim is used often enough, extract it once and commit the embed-ready HTML here. The skill can then reference it by filename instead of asking SEs to re-extract from the Quick Site every time.

Current pre-extracted sims:

- [`agentic-commerce-sim.html`](./agentic-commerce-sim.html) — Google Gemini + UCP agentic commerce end-to-end
- [`chatgpt-claude-management-sim.html`](./chatgpt-claude-management-sim.html) — ChatGPT + Claude merchant operations pattern

Contribute more by following the same pattern: copy the sim source, drop the `<style>` + `<section class="slide">` + `<script>` blocks into a new `.html` file in this folder, and add a header comment explaining what it is and how to use it.

### Linking from a deck

Linking to `https://simulations.quick.shopify.io/<sim-name>.html` is acceptable for Shopify-internal presentation moments where the presenter is signed in. Do not use live links as the only merchant-facing handoff path.

---

## Contributing a new simulation

1. Add the new standalone HTML file under [`tools/simulations/site`](../../../simulations/site/).
2. Add its SE Guide entry in [`se-guide-content.js`](../../../simulations/site/se-guide-content.js).
3. Register it in [`index.html`](../../../simulations/site/index.html).
4. Update this table if deck builders should discover it.
5. If the sim will be reused often in merchant decks, add an embed-ready extraction to this `references/` folder.
