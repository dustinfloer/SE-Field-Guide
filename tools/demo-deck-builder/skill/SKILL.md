---
name: demo-deck-builder
description: "Generate a self-contained HTML demo deck for any Shopify merchant in the transferflow/PDI style (dark UI, teal accents, animated mesh backgrounds, pulse rings on section headers, animated Gemini/Sidekick chat mockups, and merchant-safe PDF export). Single portable HTML file with all CSS/JS/logo embedded. Triggered by 'build demo deck for [merchant]', 'create demo deck for [merchant]', 'generate presentation for [merchant]', 'deck builder', '/demo-deck-builder'."
---

# Demo Deck Builder

Generate a polished, self-contained HTML demo deck for any merchant using the proven Shopify × transferflow visual language. Output is a single HTML file that can be opened locally, presented full-screen in Chrome, linted, and exported to a merchant-safe PDF.

## When to Use

- `/demo-deck-builder [merchant]`
- "Build demo deck for [merchant]"
- "Create a Shopify × [merchant] presentation"
- "Generate a deck for [merchant]"
- "Make a pitch deck for [merchant]"

**Do NOT use** for Demo2Win scripts (use `/demo2win-prep`), call prep (`/call-prep`), or pre-populating the quick-site Demo Prep tool (`/demo-prep`).

## Output

One self-contained HTML file at `merchants/[merchant]/index.html` containing:
- Navigation (progress bar, nav dots, counter, keyboard, click zones, swipe)
- All CSS/JS embedded (no external deps beyond Google Fonts)
- Merchant logo embedded as base64 (if available at `merchants/[merchant]/[name]_logo.png`)
- 15-25 slides tailored to merchant, Zach/Dustin speaker tags
- Animated chat mockups (Gemini + Sidekick) with timed message reveals
- PDF export readiness for merchant-safe sharing

## Prerequisites

Read these before starting:
- `references/template.html` — the blank scaffold (CSS, JS, nav, document structure)
- `references/slide-patterns.md` — every slide type with HTML snippets
- `references/visual-effects.md` — mesh bg, particles, pulse rings, gradient accents, nav dots
- `references/chat-animation.md` — timed message reveal pattern for Gemini/Sidekick/etc
- `references/agentic-commerce-sim.html` — full UCP agentic-commerce sim variant (multi-product mosaic, Google Pay checkout overlay, discount/loyalty/subscription, order confirmation back into chat). Use **instead of** `chat-animation.md` when you want the complete discovery → checkout → confirmation story (buyer-side)
- `references/chatgpt-claude-management-sim.html` — merchant-side AI store-management sim. Side-by-side ChatGPT (daily ops) and Claude (strategic work) panes, both writing to the same Shopify admin via the official ChatGPT Apps SDK app and Claude.ai connector. Includes live admin sync strip, OpenAI rosette + Anthropic burst SVG marks, and matches the deck's teal/JetBrains Mono visual language. Drop-in slide block with 4 CUSTOMIZE markers (merchant name, plan, domain, scenarios)
- `references/simulation-library.md` — catalog of 12+ animated simulations at simulations.quick.shopify.io (NetSuite, SAP, Oracle, ERP, payments, API, agentic commerce). For architecture / integration / payment-flow slides, grab the source from there instead of generating from scratch
- `references/interactive-storefront-mockup.html` — drop-in multi-view merchant storefront (D2C PDP, Bulk Order, CSV Upload, Resources). Tabbed nav with working add-to-cart and cart counter. Use for one "live" demo moment instead of 4–5 static feature slides. Extracted from Terry Kealey's Taylor Guitars deck
- `references/customization-guide.md` — how to adapt palette, logo, speakers per merchant
- `references/deploy-github-pages.md` — legacy exception protocol for publishing a password-protected deck to GitHub Pages. PDF is the default merchant share path
- `references/redeploy.sh.template` — parameterized helper script for idempotent redeploys. Used by Step 9 Option A
- `examples/pdi-demo-deck.html` — reference implementation for SaaS-style merchants
- `examples/taylor-guitars-demo-deck.html` — reference for premium consumer brand B2B. Showcases Challenges×Solutions summary, Case Study with hard metrics, interactive storefront mockup, and named attendees on cover. Built by Terry Kealey
- `studio/deck.config.example.json` — starter manifest for the future Studio workflow
- `studio/pattern-registry.json` — pattern metadata for validation and future UI assembly
- `studio/demo-deck-studio.mjs` — dependency-light CLI for linting and PDF export
- `studio/app/README.md` — React/Vite Demo Deck Studio v2 scaffold and local app commands

## Workflow

### Step 1: Gather Merchant Context (Thorough)

Do NOT skip this. A deck built on incomplete context is generic. Systematically check all available sources in parallel where possible:

**Local merchant folder:**
- `merchants/[merchant]/briefing-document.md`
- `merchants/[merchant]/raw-files/config.md`
- `merchants/[merchant]/discovery-notes.md`
- `merchants/[merchant]/raw-files/additional-context/*`
- Any other files in `merchants/[merchant]/`

**Salesforce (via revenue-mcp):**
- Opportunity (stage, amount, close date, merchant intent, SE next steps)
- Account (industry, GMV, plan, country)
- Team members (AE, SE — use for speaker names)
- Products on the opp

**Meeting notes & transcripts:**
- Gmail search for `from:gemini-notes@google.com` with merchant name in subject — Gemini auto-generates these as `Notes: "<meeting>" <date>`
- Google Drive search for merchant name — turn up transcripts, discovery docs, proposals
- Scout for call transcripts if the merchant has been called

**Collaborative context:**
- Slack: search for merchant-specific channels (common pattern: `#account-b2b-[merchant]`, `#account-[merchant]`) — read recent threads
- SENTRAL: query for merchant context and similar-merchant patterns

**Public research (WebFetch / WebSearch):**
- Merchant homepage — product lines, positioning, hero messaging
- About / company pages — mission, team, brand voice signals
- Recent news or press releases (last 90 days) — launches, funding, expansion, leadership changes
- If B2B: check for a wholesale or trade portal — tells you their current B2B UX
- Brand palette signals (colors on their site) for the palette decision in Step 3

This is how the deck stops feeling like a template and starts feeling like you did your homework.

**Capture:**
- Merchant name, logo path, industry
- Deal size, deal type (B2B / DTC / hybrid)
- Discovery recap (what's confirmed / in motion)
- Product/use-case specifics
- Stakeholders (attendees, decision makers)
- AE and SE names (speakers)
- Signature pain points or aspirations (pulled from notes/transcripts verbatim when possible)

### Step 2: Verify Context Before Building

Present a summary of what was found and what's missing. Example:

> Found:
> - briefing-document.md (updated 3 days ago)
> - Salesforce opp ($450K, Negotiating, close 2026-05-15)
> - 3 Gemini meeting notes (Apr 8, Apr 12, Apr 15)
> - 2 Drive docs (Discovery Deck, Technical Assessment)
>
> Missing:
> - No call transcript in Scout
> - No Slack channel found for `#account-[merchant]`
> - No SENTRAL context on similar merchants
>
> Proceed with what I have, or do you want to point me to additional context?

Wait for confirmation before moving on. This is the moment to catch missing sources — AFTER the deck is built it's painful to redo.

### Step 3: Effort-Appropriate Branching (via AskUserQuestion)

Before building, give the user **three paths at each decision point** — Lean (defaults), Collaborative (user picks), or Delegated (skill does the research). Option (a) is always zero-decision for speed. Option (c) costs the skill more effort but no user time.

Ask these as separate `AskUserQuestion` calls OR batched in one multi-question prompt:

**1. Branding & palette**

- a. Use defaults (teal `#14a098` + navy `#1e3a5f`, Inter font) — fastest
- b. I'll tell you the colors/fonts
- c. Do a brief check on [merchant]'s website and propose a palette

If (c): WebFetch the merchant's homepage + about page. Extract:
- 1–2 signature colors from hero/nav/buttons (convert to hex)
- Primary font family (heading + body if different)
- Logo URL if available
- Brand voice signal (crisp / luxe / playful / technical — 1 word)

Then propose: *"Their site uses deep green + cream, serif headlines, luxury tone. Propose: swap `--c-accent` → `#1a4d3a`, use Cormorant Garamond for headings, dark bg stays. Approve, tweak, or fall back to defaults?"*

Always keep dark background and swap only `--c-accent` / `--c-accent-bright` / `--font-heading` to preserve the scaffold's visual identity.

**2. Slide mix**

- a. Use the recommended 18–25 slide set for this deal type (see Step 5 table)
- b. I'll pick which patterns are relevant
- c. Tailor the mix based on what you found in context

If (c): cross-reference context from Step 1 against `slide-patterns.md`:
- B2B-only merchant → include B2B Evolution, skip DTC-only patterns
- ERP mentioned in config → include ERP integration slide
- No field sales mentioned → skip Sales Rep
- Peer merchant identified → Case Study slide #15
- Merchant has diverse storefront use cases → Interactive Storefront mockup

**3. Peer case study (new Case Study pattern)**

- a. Skip — no peer story in this deck
- b. I have a peer merchant in mind (user names it)
- c. Find me a relevant peer story (query SENTRAL + public case studies for a match by industry + business model)

**4. Interactive storefront mockup (optional, higher effort)**

- a. Skip — stick to static feature slides
- b. Include a generic version (Taylor scaffold as-is)
- c. Include a merchant-branded version (adds ~5 min — reskin logo, colors, sample products)

**5. Signature "wow" Gemini/Sidekick scenario**

This one's not optional — always ask. What scenario plays in the animated chat? Should be a realistic question the merchant's ICP buyer would ask. For B2B-heavy merchants, can include company context.

### Step 4: Copy Template + Customize

```bash
cp .claude/skills/demo-deck-builder/references/template.html merchants/[merchant]/index.html
```

Then edit to:
- Swap `[MERCHANT]` placeholders in `<title>` and watermark
- Embed merchant logo (use `embed-logo` if a logo file is present; use text logo only as a fallback)
- Update `:root` CSS variables if palette swap
- Add the speakers' first names to `data-speaker` attributes

Logo helper:

```bash
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs embed-logo merchants/[merchant]/index.html merchants/[merchant]/[merchant]-logo.png --config merchants/[merchant]/deck.config.json
```

### Step 5: Build the Slides

Use `slide-patterns.md` to compose slides in order. Typical 18-25 slide structure:

| Section | Slides | Speaker |
|---------|--------|---------|
| **Opening** | Cover, Discovery Recap, About Shopify, B2B Evolution (if B2B deal), Customer Proof | AE |
| **Bridge** | Aspiration, Agenda (3-col TOC) | SE |
| **Modern Commerce Platform** | Section Header, Agentic Commerce, Sidekick | SE |
| **Buyer Journeys** | Section Header, 3-8 feature slides (DTC, B2B login, variants, checkout, sales rep, companies, pricing, etc.) | SE |
| **Operations & Integration** | Section Header, ERP integration, 3PL/fulfillment, Marketing & Analytics | SE |
| **Close** | Three Anchors, Pricing, Closing Steps | AE |

**Grounding rule — write specific, not generic.**

Every content slide should pull from the merchant context gathered in Step 1, not template language. Specific > generic.

- Discovery Recap: use the merchant's actual confirmed/in-motion points from meeting notes, not made-up bullets
- Aspiration: quote or paraphrase the merchant's own vision statement where one exists in notes
- Feature slides: tie each to a real pain point or goal the merchant mentioned. If config.md says "reconciling orders between Shopify and NetSuite takes 15 hours a week," that's what the ERP slide addresses — by name
- Customer Proof: pick peer brands in the merchant's vertical or with a similar business model, not a generic hall of fame
- Pricing: reference the actual opportunity amount and structure from Salesforce

If a slide can't be grounded in merchant-specific context, either pull it (don't pad the deck) or mark it clearly as a generic Shopify capability slide, not a "this is about you" slide. Generic slides in a tailored deck are the tell that you didn't do the work.

**Mid-build checkpoints — pause at two natural points:**

Don't build the whole deck silently and reveal a 20-slide wall of text at the end. Pause at two checkpoints so the user catches direction issues early:

1. **After Opening section drafted** (Cover → Discovery Recap → About Shopify → B2B Evolution → Customer Proof)

   > Opening section is drafted — cover, discovery recap, about Shopify, customer proof. Before I move to the platform section: anything feel off here? Wrong framing, missing context, tone adjustments?

2. **After Buyer Journeys section drafted** (feature slides — the most merchant-specific section)

   > Buyer Journeys section done — [N] feature slides covering [list them]. This is the meat of the deck. Anything to cut, add, or reframe before I wrap the Operations and Close sections?

Keep the pause light — the user can say "looks good, continue" in 2 seconds. But if direction is off, catching it at 30% or 60% is 10x cheaper than at 100%.

### Step 6: Wire Animated Chats

For Gemini slide (`id="gemini-chat"`) and/or Sidekick slide (`id="sidekick-chat"`):
- Give each message a `data-chat-delay="N"` in milliseconds
- Typical sequence: `500ms → 4500ms → 8500ms → 12500ms`
- The JS handles everything once IDs + delays are in place
- See `chat-animation.md` for patterns

### Step 7: Verify

Open the file in Chrome and walk through:
- Arrow keys navigate
- Nav dots work
- Gemini + Sidekick chats animate on activation
- No content cut off
- Mesh bg + particles render on every slide
- Pulse rings only on section-header slides
- Speaker tag (top-right) toggles correctly

Then run the Studio linter:

```bash
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs lint merchants/[merchant]/index.html
```

Fix any errors. Warnings are judgment calls, but do not ignore placeholder content, missing speaker labels, external merchant assets, undefined CSS variables, or missing print rules.

For a fast content pass, generate the slide outline:

```bash
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs outline merchants/[merchant]/index.html
```

To review in the local browser Studio app:

```bash
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs studio merchants/[merchant]/index.html
```

### Step 8: Fast Follow Addendum (After the Demo)

When the user asks for a fast follow after a live demo, ingest the latest Gemini notes or transcript, then append a polished addendum slide before the close.

Use the helper to create the first-pass slide:

```bash
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs fast-follow merchants/[merchant]/index.html merchants/[merchant]/latest-gemini-notes.pdf --config merchants/[merchant]/deck.config.json
```

Then review and rewrite the generated bullets with the user-facing answer, not raw transcript language. The slide should cover:
- What we covered
- Questions to answer
- Additional context or recommended next steps

If the notes are pre-demo notes or you only need a test, write to `--output /private/tmp/[merchant]-fast-follow-preview.html` instead of changing the main deck.

### Step 9: Content Review with User

Before calling the deck done, walk the user through the slides for a content pass. Don't skip — this is the step that catches hollow or off-brand content before it lives through a merchant call.

Present a concise slide-by-slide summary, e.g.:

> I've built 22 slides. Key content per section:
>
> **Opening (Jordan)**
> - Cover: Shopify × Acme, Apr 22 meeting
> - Discovery Recap: 4 confirmed points (catalog migration, NetSuite sync, Tier-1 pricing, B2B launch Q3), 2 in-motion (agentic commerce interest, POS expansion)
>
> **Modern Commerce Platform (Dustin)**
> - Agentic Commerce: Gemini sim with "find me a replacement brake pad for my 2019 F-150" scenario — pulled from Apr 15 meeting where Jim mentioned fleet buyers researching parts on their phones
> - Sidekick: warehouse ops scenario (reorder ping based on stock thresholds)
>
> **Buyer Journeys (Dustin)**
> - 4 feature slides: B2B login, Tiered pricing catalogs, Quote-to-order flow, ERP sync with NetSuite
>
> **Close (Jordan)**
> - Pricing: $280K ARR Plus + Implementation ($45K)
> - Closing Steps: Technical Assessment by May 1, POC kickoff May 15
>
> Anything feel off, missing, or too generic? Want me to tweak any slide before we wrap?

Iterate on any flagged slides before moving on. Small fixes here save painful rework after the merchant sees the deck.

### Step 10: Export / Share

The working artifact is HTML. The default merchant-safe share artifact is PDF.

Ask the user how they want to use it:

**Option A — Export PDF for merchant share (recommended)**
Use this for merchant follow-up, legal/compliance-sensitive decks, and async stakeholder sharing. Run:

```bash
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs export-pdf merchants/[merchant]/index.html merchants/[merchant]/exports/[merchant]-demo-deck.pdf
```

Then open the PDF locally and verify one 16:9 slide per page, no cut-off content, and useful final-state snapshots for chat/simulation slides.

**Option B — Present locally from Chrome**
Open `merchants/[merchant]/index.html` locally and present full-screen with `F`. Best for live calls where the presenter wants animation and keyboard navigation.

**Option C — Internal quick site**
Upload `merchants/[merchant]/index.html` at https://quick.shopify.io for Shopify-only review. Quick sites are IAP-gated and are not merchant-share artifacts.

**Option D — HTML handoff**
Zip `index.html` only for internal handoff or when a technical stakeholder explicitly asks for the source. Do not use raw HTML as the default merchant share path.

**Deprecated path — GitHub Pages**
Password-protected GitHub Pages is no longer the recommended merchant share path. Even when encrypted, the HTML/source model creates avoidable exposure and governance questions. Use PDF for merchant sharing unless the user explicitly asks for the legacy GitHub Pages protocol and confirms it is approved for that account.

**Decision guide:**
- Merchant-facing follow-up after a demo → **Option A** (PDF)
- Live in-call presentation → **Option B** (local HTML)
- Internal Shopify review → **Option C** (quick site)
- Approved technical handoff → **Option D** (zipped HTML)

## Key Principles

- **Always preserve the visual identity**: dark bg, teal accents, Inter font, bolded inline highlights, gradient text on `.accent` spans
- **Keep speakers named**: use `data-speaker="FirstName"` — shows in top-right badge per slide
- **Merchant content lives in slides, never in CSS/JS**: the template is merchant-agnostic
- **One file, no external assets**: everything embedded (logo base64, fonts via Google Fonts CDN)
- **D2C default for Gemini**: consumer buyer asking AI, not enterprise B2B unless merchant explicitly sells B2B
- **Don't hallucinate context**: if merchant has no field sales team, don't include a Sales Rep slide
