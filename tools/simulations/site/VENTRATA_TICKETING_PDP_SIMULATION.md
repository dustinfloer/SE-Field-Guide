# Ventrata Ticketing PDP Simulation

Status: built locally, cataloged under `Custom`, not yet deployed due local DNS/GCS reachability failure.

HTML file:

`/Users/mattward/Desktop/Claude/simulations/ventrata-ticketing-pdp.html`

Catalog entry:

`/Users/mattward/Desktop/Claude/simulations/index.html`

SE Guide entry:

`/Users/mattward/Desktop/Claude/simulations/se-guide-content.js`

Intended live URL after deploy:

`https://simulations.quick.shopify.io/ventrata-ticketing-pdp.html`

## Purpose

This simulation shows a Shopify PDP ticketing experience for an attractions merchant using Ventrata as the ticketing source of truth.

The shopper sees a Shopify product page with:

- date selection
- timeslot selection
- adult and child ticket quantities
- a pre-checkout reservation state
- a handoff into Shopify Checkout

Beside the PDP, the simulation shows a Chrome DevTools-style network inspector with the API exchanges between:

- browser/PDP
- Shopify storefront and Storefront Cart API
- middleware
- Ventrata OCTO APIs

The point is to make the integration architecture concrete without implying that Shopify natively owns Ventrata ticket capacity.

## Architecture Position

Recommended ownership model:

| Layer | Owner |
| --- | --- |
| PDP, cart, checkout, payment, customer, commercial order | Shopify |
| Ticket products, options, units, availability, booking hold, ticket/voucher fulfillment | Ventrata |
| Mapping, availability cache, live validation, booking hold, checkout handoff, post-payment reconciliation | Middleware |

The PDP does not call Ventrata directly. Middleware protects credentials, normalizes Ventrata operational data into storefront-friendly state, and creates the Ventrata hold before Shopify Checkout.

## Source Packet

| Claim area | Source | What it verifies |
| --- | --- | --- |
| Use case and recommended architecture | Google Doc: `Empire State Building - Ventrata x Shopify ideation` | Ventrata remains ticketing source of truth; Shopify owns commerce; middleware is required. |
| Availability model | Same Google Doc, PDP availability/cached availability sections | Cached availability accelerates browsing but live validation and hold are required before checkout. |
| Ventrata products | Ventrata docs | Product, option, and unit mapping should come from Ventrata, not from invented Shopify variant structures. |
| Ventrata availability | Ventrata docs | Calendar and detailed availability calls are represented as `POST /availability/calendar` and `POST /availability`. |
| Ventrata bookings | Ventrata docs | Pre-checkout reservation is represented as `POST /bookings` returning an `ON_HOLD` booking. |
| Shopify checkout handoff | Shopify Storefront API docs | `cartCreate` can return a cart and `checkoutUrl`; ticket references are modeled as cart line attributes. |

## Claim Ledger

| Claim shown in simulation | Confidence | Source / note |
| --- | --- | --- |
| Ventrata is the source of truth for ticket availability and booking state | Verified for this recommended architecture | Google Doc architecture recommendation. |
| Shopify owns PDP, cart, checkout, payment, customer, and commercial order | Verified for this recommended architecture | Google Doc architecture recommendation. |
| Middleware should sit between Shopify PDP and Ventrata | Verified for this recommended architecture | Google Doc architecture recommendation. |
| Cached availability is not final inventory truth | Verified for this recommended architecture | Google Doc cached availability guidance. |
| Exact date/time/unit selection should be validated live before checkout | Verified for this recommended architecture | Google Doc PDP availability guidance. |
| A Ventrata hold should be created before Shopify Checkout | Verified for this recommended architecture | Google Doc risk and flow guidance. |
| `GET /products`, `POST /availability/calendar`, `POST /availability`, and `POST /bookings` are Ventrata API labels used in the inspector | Docs-backed labels | Ventrata docs. Payload details remain illustrative and should be verified for a production build. |
| `cartCreate` returns a Shopify cart and checkout URL | Docs-backed label | Shopify Storefront API docs. Attribute names are implementation choices. |
| Hold expiration is shown as `10:15 AM` | Illustrative | Must be verified with Ventrata and implementation partner. |
| Prices shown on PDP are `$48` adult and `$42` child | Illustrative | Final pricing ownership is unresolved and must be verified before production implementation. |

## Simulation Flow

### 1. PDP Renders

Systems active:

- Browser
- Shopify

Inspectable calls:

- `GET /products/empire-state-building-tickets`
- `GET /apps/ventrata/products/esb-general-admission/summary`

Purpose:

Shopify renders a stable PDP product shell. The PDP asks middleware for cached availability summary data. This makes the page fast without treating cached state as final inventory truth.

### 2. Mapping Check

Systems active:

- Middleware
- Ventrata

Inspectable call:

- `GET /products`

Purpose:

Middleware maps the Shopify product shell to Ventrata product, option, and unit IDs. This avoids forcing every date, time, and unit combination into Shopify variants.

### 3. Date Refresh

Systems active:

- Browser
- Middleware
- Ventrata

Inspectable calls:

- `POST /availability/calendar`
- `GET /apps/ventrata/availability?date=2026-07-12`

Purpose:

When the shopper selects a date, middleware refreshes Ventrata availability and returns storefront-friendly timeslot states.

### 4. Slot Validation

Systems active:

- Browser
- Middleware
- Ventrata

Inspectable calls:

- `POST /availability`
- `POST /apps/ventrata/validate-selection`

Purpose:

The selected date, time, and ticket mix are validated live with Ventrata before a hold is created.

### 5. Booking Hold

Systems active:

- Browser
- Middleware
- Ventrata

Inspectable calls:

- `POST /bookings`
- `POST /apps/ventrata/holds`

Purpose:

Middleware creates an `ON_HOLD` Ventrata booking before checkout. This is the key guardrail against a paid Shopify order with no reserved ticket.

### 6. Checkout Handoff

Systems active:

- Browser
- Shopify
- Middleware

Inspectable calls:

- `Storefront API cartCreate`
- `POST /apps/ventrata/cart-link`

Purpose:

Shopify creates a cart and returns a `checkoutUrl`. Cart line attributes carry the Ventrata booking and availability references so middleware can confirm the booking after payment and reconcile back to the Shopify order.

## Explicit Non-Assumptions

The simulation intentionally does not claim:

- Shopify inventory is the source of Ventrata ticket capacity.
- The PDP calls Ventrata directly.
- Cached availability is final truth.
- Ventrata hold duration is always long enough for Shopify Checkout.
- Shopify payment automatically confirms a Ventrata booking.
- A Shopify refund automatically cancels a Ventrata ticket.
- A Ventrata cancellation automatically refunds Shopify payment.
- Ticket plus merchandise mixed carts are launch-ready without additional fulfillment and support design.
- The sample prices are final Ventrata or Shopify pricing behavior.

## Production Follow-Up Flow

This simulation stops at checkout handoff. A production implementation must also design and test:

1. Shopify order/payment webhook received after checkout.
2. Middleware confirms the Ventrata booking.
3. Ventrata returns supplier reference, voucher, ticket, or ticket delivery payload.
4. Middleware writes Ventrata references back to Shopify order metafields/tags/fulfillment records.
5. Customer receives ticket or voucher through the selected communication path.
6. Support can reconcile Shopify order number to Ventrata booking and supplier reference.
7. Expired hold, failed payment, failed confirmation, refund, and cancellation paths are handled explicitly.

## Catalog Metadata

```js
{
  title: "Ventrata Ticketing PDP",
  desc: "Shopify PDP ticket selector with network-inspector style calls between Shopify, middleware, and Ventrata before checkout.",
  useWhen: "attractions, museums, ticketed experiences, or custom PDP conversations need to show Ventrata-backed availability, booking holds, and checkout handoff.",
  file: "ventrata-ticketing-pdp.html",
  systems: ["Shopify Storefront", "Shopify Cart API", "Middleware", "Ventrata OCTO"],
  audience: ["Technical", "Solution architect", "Custom"],
  tags: ["Demo", "Technical validation", "Custom", "Ticketing", "PDP", "API scale"]
}
```

## SE Guide Content

Title:

`Ventrata Ticketing PDP - Availability, Hold, Checkout`

Premise:

An attractions merchant wants Shopify to own the PDP, cart, checkout, payment, customer record, and commercial order while Ventrata remains the source of truth for ticket products, options, units, availability, holds, and ticket fulfillment.

What it shows:

A sample Shopify PDP where a shopper selects date, time, and ticket quantities, alongside a Chrome DevTools-style network inspector. Each step shows the browser, Shopify, middleware, and Ventrata calls that turn cached browsing availability into live validation, an `ON_HOLD` Ventrata booking, and a Shopify cart `checkoutUrl`.

Talking points:

- The PDP does not call Ventrata directly; middleware protects credentials, handles mapping, caches availability, validates slots, and creates booking holds.
- Cached availability is only a browsing accelerator; the exact date, time, and unit mix is validated live against Ventrata before checkout.
- The critical pre-checkout guardrail is the Ventrata hold, which reduces the risk of a paid Shopify order with no reserved ticket.
- Shopify cart attributes carry Ventrata references into checkout so middleware can confirm the booking after payment and reconcile back to the Shopify order.
- Do not model every date, time, and ticket type as Shopify variants unless Shopify is intentionally becoming the ticketing inventory owner.

## Validation

Completed locally:

- HTML inline script parse passed.
- `index.html` inline script parse passed.
- `se-guide-content.js` syntax check passed.
- Structured data check found 6 steps and 11 inspectable calls.
- Catalog registration confirmed under `Custom`.
- Shared helper scripts included:
  - `se-guide-content.js`
  - `se-guide.js`
  - `source-viewer.js`

Not completed in this environment:

- Full browser screenshot QA, because local browser launch was blocked by sandbox restrictions.
- Quick deploy, because the sandbox could not resolve `storage.googleapis.com`.

## Deploy Command

Run from a normal terminal with working DNS/network access:

```bash
cd ~/Documents/b2b-ai-catalog
quick deploy "$PWD/tools/simulations/site" simulations --force
```

Historical local deploy path:

```bash
quick deploy /Users/mattward/Desktop/Claude/simulations simulations --force
```

## Files Changed

- `tools/simulations/site/ventrata-ticketing-pdp.html`
- `tools/simulations/site/index.html`
- `tools/simulations/site/se-guide-content.js`
- `tools/simulations/site/VENTRATA_TICKETING_PDP_SIMULATION.md`
