/**
 * SE Guide content registry.
 * Keyed by HTML filename (lowercase). Each entry:
 *   title:          Short display title (15-50 chars)
 *   premise:        The merchant story / business scenario (1-2 sentences)
 *   shows:          What plays out on screen during the simulation (2-3 sentences)
 *   talkingPoints:  Array of 3-5 bullets — capabilities to highlight, common merchant
 *                   questions, callouts. These are what the SE wants to land.
 *
 * Initial mockup content — iterate freely.
 */
window.SE_GUIDE_CONTENT = {

  'gemini-shopping-sim.html': {
    title: 'Google Gemini Shopping — Agentic Commerce via UCP',
    premise: 'A consumer is shopping inside Google Gemini chat — not visiting a storefront. Discovery, recommendations, and checkout all happen inside the AI assistant. The merchant wants to know: how does Shopify show up when the buyer never lands on our site?',
    shows: 'An animated chat interface where a shopper asks for product recommendations, an AI agent surfaces Shopify-merchant products inline, the shopper adds to cart and checks out — all without leaving Gemini. The right panel reveals what is happening behind the scenes via UCP (Universal Commerce Protocol).',
    talkingPoints: [
      'Shopify is the merchant of record even when checkout happens in an AI surface — same payment, fraud, and tax stack',
      'UCP exposes products, cart, and checkout to agents through a standard protocol — no per-agent custom integration',
      'Merchant retains the customer relationship: order confirmation, post-purchase, returns all flow back through Shopify',
      'Storefront SEO and brand presence still matter — agents pull from the same catalog merchants already maintain',
      'This is a publicly announced commerce foundation — use it to anchor agentic commerce conversations in concrete flows instead of abstract AI hype'
    ]
  },

  'ucp-agentic-commerce.html': {
    title: 'UCP Agentic Commerce — Search, Cart, Checkout',
    premise: 'A technical buyer understands the Gemini or AI-chat demo, but wants to know what UCP actually does underneath: how an agent discovers products, negotiates capabilities, builds a cart, checks out, hands off when needed, and tracks the order.',
    shows: 'A simplified buyer-facing flow from intent through product search, cart building, checkout session creation, review, delivery selection, payment authorization, order placement, and UCP-shaped order updates. Toggle between direct checkout and human-handoff scenarios to show how UCP routes the same cart through either agent completion or embedded checkout.',
    talkingPoints: [
      'UCP is Universal Commerce Protocol: an open standard co-developed by Shopify and Google for agentic commerce from discovery to checkout and beyond',
      'Profiles at /.well-known/ucp let agents and merchants negotiate shared capabilities, versions, endpoints, extensions, and payment handlers',
      'Shopify supports the full buyer journey: catalog search, cart building, checkout creation, handoff, and order status through UCP-shaped tools and events',
      'Extensions are key: fulfillment options, discounts, loyalty, subscriptions, terms, and embedded checkout can be modeled without forcing every merchant into one rigid flow',
      'If the agent cannot complete a requirement, UCP returns a handoff path such as continue_url / embedded checkout rather than abandoning the transaction'
    ]
  },

  'netsuite-shopify-flow.html': {
    title: 'NetSuite ↔ iPaaS ↔ Shopify B2B — Dedicated Store Flow',
    premise: 'A B2B merchant runs NetSuite as their ERP system of record and is standing up a dedicated B2B Shopify store. They need inventory, pricing, and customer/company data to sync cleanly between the two without manual exports.',
    shows: 'A directional flow diagram with three system nodes — NetSuite, iPaaS middleware, Shopify B2B — and animated arrows showing inventory, price list, and customer/company records moving between them. A stage indicator banner highlights which sync is running at each moment.',
    talkingPoints: [
      'NetSuite stays the system of record for inventory and customers — Shopify is the buyer-facing channel',
      'iPaaS (Celigo, Boomi, Workato) does the field mapping and scheduling — not custom code',
      'B2B Companies and Locations in Shopify map to NetSuite Customers and Subsidiaries cleanly',
      'Price lists sync per company/location — supports per-customer pricing without custom apps',
      'Two-way sync where needed (e.g. orders back to NetSuite) — most data flows ERP → Shopify'
    ]
  },

  'shopify-netsuite-order-sync.html': {
    title: 'Shopify → Celigo → NetSuite — Order Lifecycle',
    premise: 'A merchant on Shopify with NetSuite as their ERP needs the full order lifecycle to flow from buyer purchase through fulfillment, invoicing, and payment reconciliation — without a human re-keying anything.',
    shows: 'A 3-panel left-to-right flow: Shopify emits a webhook on order create, Celigo middleware transforms and routes it, NetSuite receives a Sales Order, then events flow back as the order moves to fulfilled, invoiced, and paid. Speed control lets you slow or accelerate the animation.',
    talkingPoints: [
      'Webhooks are the trigger — no polling, no batch windows, latency measured in seconds',
      'Celigo (or any iPaaS) handles the schema translation — Shopify line item → NetSuite Sales Order line',
      'Bidirectional: fulfillment status from NetSuite flows back to Shopify so the buyer sees accurate tracking',
      'Payments reconcile to the right Sales Order via order ID — no manual matching',
      'Resilient to NetSuite downtime — middleware queues and retries; orders never lost'
    ]
  },

  'shopify-netsuite-payment-sync.html': {
    title: 'Shopify ↔ NetSuite — Order & Payment Sync (API Detail)',
    premise: 'A technical buyer wants to see exactly what API calls fire when an order flows from Shopify to NetSuite — not a marketing diagram. Common in technical validation sessions and discovery with developers or solution architects.',
    shows: 'A 3-panel sync view showing webhook payloads on the left (Shopify side), API call detail in the middle (REST vs GraphQL, endpoints, methods), and NetSuite record state on the right. Each step shows the actual operation and what data moves.',
    talkingPoints: [
      'GraphQL Admin API is the recommended path for new integrations — fewer round-trips than REST',
      'Order webhooks (orders/create, orders/paid, orders/fulfilled) cover the lifecycle without polling',
      'Authentication is OAuth2 for apps, API tokens for custom integrations — both scoped per resource',
      'Rate limits are calculated cost-based (GraphQL) or leaky-bucket (REST) — see the Rate Limit Calculator sim',
      'Error handling: webhook retries with backoff, dead-letter queues in middleware — standard pattern'
    ]
  },

  'inventory-sync-multi-store.html': {
    title: 'Multi-Store Inventory Distribution from NetSuite',
    premise: 'A merchant sells across multiple Shopify stores — a B2C consumer store and a B2B wholesale store — with a shared inventory pool in NetSuite. They need allocation rules so the right stock reaches the right channel without overselling.',
    shows: 'A 3-panel view: NetSuite hub on the left showing the inventory pool, middleware in the middle running allocation logic, B2C and B2B Shopify stores on the right receiving their slices. Inventory cells update with delta tracking and a console below logs each sync event.',
    talkingPoints: [
      'NetSuite is the single source of truth — Shopify stores receive allocated slices, not the full pool',
      'Allocation rules can be channel-based (X% to B2C, Y% to B2B) or location-based',
      'Buffer inventory prevents overselling during sync windows — surfaces in available-to-sell, not committed',
      'Shopify Locations map to NetSuite Locations — each store can pull from one or many',
      'Multi-store with shared inventory is a common Plus pattern — orchestration tier matters more than the storefront'
    ]
  },

  'shopify-sap-integration.html': {
    title: 'Shopify ↔ SAP S/4 HANA — Enterprise Architecture',
    premise: 'A large enterprise merchant runs SAP S/4 HANA and is evaluating Shopify as their commerce front end. The conversation is architectural: how do order, payment, and inventory flows look when SAP is the system of record?',
    shows: 'A high-level architecture diagram showing Shopify as the buyer-facing layer, SAP S/4 HANA at the core, and middleware (typically MuleSoft, SAP CPI, or Boomi) brokering between them. Animated flows highlight order capture, payment processing, and inventory sync at the architectural level.',
    talkingPoints: [
      'Shopify owns the buyer experience (checkout, storefront, payments) — SAP owns fulfillment, finance, and master data',
      'Middleware tier is non-negotiable at this scale — direct point-to-point integrations do not survive change',
      'Order flows: Shopify → middleware → SAP Sales Order → ATP check → fulfillment → invoice posting',
      'Payments: Shopify Payments captures, settlement reports reconcile to SAP GL via the Routine Payouts pattern',
      'Inventory: SAP is master, mirrors down to Shopify per location with availability deltas, not full snapshots'
    ]
  },

  'shopify-oracle-order-capture.html': {
    title: 'Shopify ↔ Oracle — Delayed Capture & Order Editing',
    premise: 'A merchant uses Oracle as their order management and ERP system. They need to authorize payment at Shopify checkout but defer capture until Oracle validates the order — and they need to support order edits (line changes, address updates) before capture.',
    shows: 'A 2-column layout driven by scenario buttons. Pick a scenario (clean capture, edit-before-capture, partial capture) and the simulation animates the auth at Shopify checkout, the validation/edit step in Oracle, and the final capture event with the correct amount.',
    talkingPoints: [
      'Shopify supports manual / delayed capture out of the box — no custom build needed',
      'Order Editing API lets Oracle (or any downstream system) modify line items before capture',
      'Auth-only flow protects against fraud while leaving room for downstream validation',
      'Partial capture supports split shipments — capture per fulfillment, not per order',
      'Auth windows: 7 days standard, up to 30 days via Shopify Payments — important for slow ERP cycles'
    ]
  },

  'erp-integration-sync.html': {
    title: 'Full Integration Sync — Shopify ↔ ERP Real-Time',
    premise: 'A merchant is replatforming to Shopify and needs to understand what "real-time integration" actually means in practice — what fires when an order is placed, paid, and fulfilled, and how does the ERP stay in lockstep?',
    shows: 'A 3-panel live view: Shopify on the left, middleware in the center, ERP on the right. As an order moves through creation → payment auth → capture → fulfillment → inventory restock, each system lights up with its operation and a console below logs every API call in real time.',
    talkingPoints: [
      'Real-time means webhook-driven, not nightly batch — measured in seconds, not hours',
      'Middleware is the seam — it handles retries, transformations, and failure modes',
      'Inventory restock on returns/cancels flows back to the ERP automatically — closes the loop',
      'Idempotency keys on every operation — safe to replay events without double-posting',
      'This is the standard pattern across NetSuite, SAP, Oracle, MS Dynamics — only the field mapping changes'
    ]
  },

  'routine-payouts-erp.html': {
    title: 'Shopify Routine Payouts → ERP GL Posting',
    premise: 'A merchant\'s finance team needs Shopify Payments payouts to reconcile cleanly into their ERP general ledger — broken down by sales, refunds, fees, and adjustments, posted as proper journal entries, not lump-sum deposits.',
    shows: 'A 3-panel reconciliation flow: Shopify admin (Polaris UI) on the left showing the payout summary, the transaction breakdown in the middle (sales, refunds, fees, adjustments), and the ERP GL journal entry being posted on the right. A progress bar walks through each step.',
    talkingPoints: [
      'Shopify Payments exposes payout and transaction APIs — every line item is queryable',
      'GL posting follows standard accounting: debit cash, credit revenue, debit fees, etc.',
      'Reconciliation is exact — every cent in a payout maps to a transaction with an order or refund ID',
      'Most ERPs do not need a custom build — Celigo, Workato, and Boomi have prebuilt connectors for this exact flow',
      'Solves the #1 finance objection on Shopify Plus deals: "we can\'t reconcile to our GL"'
    ]
  },

  'api-rate-limit-calculator.html': {
    title: 'Shopify API Rate Limit Calculator',
    premise: 'A technical buyer or solutions architect needs to know if Shopify\'s API limits will support their integration volume — and if not, what plan tier or query pattern will get them there. Common in technical validation and replatform sizing.',
    shows: 'An interactive form/calculator on the left and live-updating results on the right. Enter request volume, query complexity, and plan tier; the calculator shows whether you fit inside the leaky bucket or query cost budget, and visualizes the rate limit headroom.',
    talkingPoints: [
      'REST uses a leaky-bucket model (2 req/s standard, higher on Plus); GraphQL uses calculated query cost',
      'GraphQL is almost always cheaper per business operation — one query replaces multiple REST calls',
      'Plus tier doubles rate limits — meaningful for high-volume merchants',
      'Bulk Operations API bypasses rate limits for large reads/writes — use it for catalog and order exports',
      'Hitting limits is usually a query design issue, not a tier issue — show the calculator to prove it before upselling'
    ]
  },

  'b2b-payment-flow.html': {
    title: 'Acme Wholesale — B2B Payment Flow (3 Paths)',
    premise: 'A B2B merchant has three payment realities: some buyers pay on order, some are authorized at checkout, some are on Net 30/60 terms. They need to see how each path flows end-to-end and how the bank/AR view stays clean.',
    shows: 'A path selector with three B2B scenarios — Due on Fulfillment, Auth at Checkout, Net Terms. Pick one and a timeline sidebar walks through each step: order placed, payment event (or terms applied), fulfillment, invoice, and bank/AR reconciliation. Each step shows the API call and the state change.',
    talkingPoints: [
      'Shopify B2B handles all three payment paths natively — Net Terms, Auth, and Due on Fulfillment are configuration, not custom builds',
      'Net Terms invoices generate automatically with the right due date based on company terms',
      'Buyer self-serve in the company portal — view invoices, pay open balances, no AR phone calls',
      'Mixed-cart support: a single buyer can have different terms on different orders',
      'Reconciliation: every payment ties to a Shopify order ID — clean handoff to the AR system'
    ]
  },

  'ventrata-ticketing-pdp.html': {
    title: 'Ventrata Ticketing PDP — Availability, Hold, Checkout',
    premise: 'An attractions merchant wants Shopify to own the PDP, cart, checkout, payment, customer record, and commercial order while Ventrata remains the source of truth for ticket products, options, units, availability, holds, and ticket fulfillment.',
    shows: 'A sample Shopify PDP where a shopper selects date, time, and ticket quantities, alongside a Chrome DevTools-style network inspector. Each step shows the browser, Shopify, middleware, and Ventrata calls that turn cached browsing availability into live validation, an ON_HOLD Ventrata booking, and a Shopify cart checkoutUrl.',
    talkingPoints: [
      'The PDP does not call Ventrata directly; middleware protects credentials, handles mapping, caches availability, validates slots, and creates booking holds',
      'Cached availability is only a browsing accelerator; the exact date, time, and unit mix is validated live against Ventrata before checkout',
      'The critical pre-checkout guardrail is the Ventrata hold, which reduces the risk of a paid Shopify order with no reserved ticket',
      'Shopify cart attributes carry Ventrata references into checkout so middleware can confirm the booking after payment and reconcile back to the Shopify order',
      'Do not model every date, time, and ticket type as Shopify variants unless Shopify is intentionally becoming the ticketing inventory owner'
    ]
  }

};
