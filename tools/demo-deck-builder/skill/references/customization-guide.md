# Customization Guide

How to adapt the template for a specific merchant. Work through these in order.

## 1. Copy the Template

```bash
cp .claude/skills/demo-deck-builder/references/template.html merchants/[merchant-slug]/index.html
```

Use kebab-case for the merchant slug (e.g., `pdi`, `transferflow`, `arlington-industries`).

## 2. Update Title and Watermark

**In `<head>`**:
```html
<title>Shopify × [Merchant] — [Deal Type] Demo</title>
```

**In the watermark** (top-left corner):
```html
<span class="merchant-text">[MERCHANT]</span>
```

Legacy decks may still use `pdi-text`; new decks should use the merchant-neutral `merchant-text`.

## 3. Embed the Merchant Logo

If `merchants/[slug]/[name]_logo.png` exists:

```python
# One-liner to base64 encode
import base64
with open("merchants/[slug]/[name]_logo.png", "rb") as f:
    b64 = base64.b64encode(f.read()).decode()
print(f'data:image/png;base64,{b64}')
```

Then in the cover slide, replace the `.pdi-logo` text div with an `<img>` tag:

```html
<img class="pdi-logo-img" src="data:image/png;base64,...long string..." alt="Merchant">
```

If **no logo is available**, use a text treatment:

```html
<div class="merchant-logo" style="background: linear-gradient(135deg, #COLOR1 0%, #COLOR2 100%);">MERCHANT</div>
```

Pick two brand colors from the merchant's website for the gradient.

Also add the logo to the watermark for a subtle brand presence there:

```html
<img class="merchant-watermark-img" src="data:image/png;base64,...same base64..." alt="Merchant">
```

## 4. Set the Color Palette

Default is healthcare teal. To swap, edit the `:root` CSS variables at the top of the `<style>` block:

```css
:root {
  --bg: #0a1420;              /* Dark background - usually keep */
  --bg-elevated: #0f1a28;
  --surface: #14202e;
  --surface-hover: #1a2938;
  --border: #233345;
  --text: #e6edf3;
  --accent: #14a098;           /* Primary brand color */
  --accent-bright: #1cc7bd;    /* Gradient partner */
  --accent-dim: rgba(20, 160, 152, 0.12);
  --accent-glow: rgba(20, 160, 152, 0.4);
  --accent-border: rgba(20, 160, 152, 0.35);
  --navy: #1e3a5f;             /* Secondary accent */
}
```

### Palette Recipes

**Healthcare** (default): teal `#14a098` + navy `#1e3a5f`
**Technology**: electric blue `#3b82f6` + purple `#8b5cf6`
**Industrial**: amber `#f59e0b` + deep red `#991b1b`
**Food/Beverage**: warm orange `#ea580c` + olive `#65a30d`
**Fashion**: rose `#e11d48` + plum `#701a75`
**Finance**: emerald `#059669` + slate `#475569`

Always keep the dark background (`--bg: #0a1420` or similar) — the light effects depend on it.

## 5. Set Speaker Names

For every slide, add `data-speaker="FirstName"`:

```html
<section class="slide" data-speaker="Zach">
```

- **AE** presents opening slides (Cover, Recap, About Shopify, Customer Proof, Pricing, Closing)
- **SE** presents technical/demo slides (everything in between)

Read `personal-config.md` for the SE name if it's the user. Ask for the AE name if not in context.

## 6. Tailor Content to the Merchant

### Opening (AE-led)

- **Cover**: `[Deal Type] Commerce` eyebrow, headline hook tailored to the merchant's transformation story
- **Recap**: Pull from their `briefing-document.md` or most recent meeting notes. Split into "Confirmed" and "In motion" columns
- **About Shopify**: Keep generic stats (5M+ merchants, $292B GMV, etc.) — this slide is boilerplate
- **B2B Evolution timeline**: Only include if the deal is B2B or hybrid
- **Customer Proof**: Pick 6 brands in the merchant's industry who run on Shopify. Avoid competitors they're already aware of.

### Modern Commerce Platform (SE-led)

- **Agentic Commerce (Gemini)**: Write a realistic D2C buyer scenario using the merchant's actual product line
- **Sidekick**: Operational questions the merchant's team would actually ask (inventory, marketing, analytics)

### Buyer Journeys (SE-led)

Feature slides should reflect the merchant's **actual use cases** from discovery:
- Does the merchant sell DTC? → include DTC journey slides
- Does the merchant have a B2B portal? → include B2B journey + contract pricing slides
- Does the merchant have sales reps? → include Sales Rep slide. **Otherwise skip it.**
- Does the merchant sell variants (size, pack, color)? → include variants slide
- Does the merchant need multi-warehouse? → include allocation slide
- Does the merchant drop-ship? → include drop-ship slide

**Rule**: if it wasn't in discovery, don't include it. Better to have 5 relevant slides than 12 generic ones.

### Operations & Integration (SE-led)

Tailor based on the merchant's actual stack:
- ERP they use (D365, NetSuite, SAP, Sage, Oracle, etc.) — name it on the integration slide
- 3PL needs (or acknowledge they self-fulfill)
- EDI partners (for B2B distributors)
- Marketing stack they have or want

### Close (AE-led)

- **Three Anchors**: Pick the 3 most compelling outcomes for *this* merchant. Write descriptions that reference their specific business context.
- **Pricing**: Shopify Plus pricing — `$2,300/mo` 3-year / `$2,500/mo` 1-year. VPF `0.35%` DTC / `0.18%` B2B / `0.25%` retail. Include any merchant-specific math (e.g., ACH savings).
- **Closing**: 3 concrete next steps — usually "review partner intros", "scope integration requirements", "confirm rollout plan"

## 7. Chat Scenarios

### Gemini D2C Scenario

Pick the merchant's hero consumer product. Write a scenario where someone Googles/asks AI for their specific need. Format:

> *"[Role/situation]. [Specific need or constraint]. [Preference]?"*

Example: *"I'm a nurse on 12-hour shifts. My hands are cracked from constant sanitizing. What's a good moisturizing antimicrobial hand wipe I can throw in my bag?"*

### Sidekick Operations Scenario

Pick something the merchant's small team would actually ask. Format:

> *"[Operational question about the store]"*

Example: *"Which products are running low on inventory this week?"* (followed by the action buttons)

## 8. Final Checks

Before handing off:

- [ ] Open in Chrome, walk through every slide with arrow keys
- [ ] Gemini chat animates on its slide (no earlier)
- [ ] Sidekick chat animates on its slide
- [ ] Nav dots respond to clicks
- [ ] Speaker tag toggles between AE and SE names
- [ ] No content is cut off at smaller screen sizes
- [ ] Merchant logo renders (both cover and watermark)
- [ ] All inline strong/bold text renders correctly
- [ ] File size is reasonable for local editing and PDF export
- [ ] Studio linter has no errors:
  ```bash
  node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs lint merchants/[merchant-slug]/index.html
  ```

## 9. Export Merchant-Safe PDF

HTML is the working/presentation artifact. PDF is the default merchant-safe share artifact.

```bash
node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs export-pdf merchants/[merchant-slug]/index.html merchants/[merchant-slug]/exports/[merchant-slug]-demo-deck.pdf
```

Open the PDF and verify one 16:9 slide per page. Use the HTML locally for live presentation when animations matter.

Quick sites are internal Shopify review only. Do not use hosted HTML as the default merchant share path.
