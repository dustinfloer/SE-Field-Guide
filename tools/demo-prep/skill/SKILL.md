---
name: demo-prep
description: Generate demo preparation data for the Demo Prep quick site. Reads merchant context from Salesforce, merchant folders, and discovery notes, then outputs JSON that auto-populates the tool. Triggered by "demo prep for [merchant]", "prep demo for [merchant]", "generate demo prep", "fill demo prep".
---

# Demo Prep Skill

**Purpose:** Generate a JSON payload that auto-populates the Demo Prep quick site at `https://se-demo-prep.quick.shopify.io/` (or local `tools/index.html`).

The skill writes the JSON to `merchants/[name]/demo-prep.json` AND outputs it for paste-into-tool. This creates a round-trip: future runs detect the existing prep and offer to refresh, merge, or start fresh.

---

## Workflow

### Step 1: Identify Merchant

Resolve the merchant name. Check for:
- Existing merchant folder at `merchants/[name]/`
- Salesforce opportunity via `revenue-mcp`
- If ambiguous, ask user to clarify

### Step 1.5: Check for Existing Prep

If `merchants/[name]/demo-prep.json` exists, read it and ask the user:

> Found existing demo prep for [Merchant] (last updated [date]). What would you like to do?
> 1. **Refresh** — regenerate from current discovery notes (overwrites existing)
> 2. **Merge** — keep your edits, add new context from any new notes
> 3. **Start fresh** — discard existing and rebuild
> 4. **Use existing** — just output the existing JSON

If no existing prep, proceed to Step 2.

### Step 2: Gather Context (parallel)

Run these in parallel:

**From Merchant Folder** (if exists):
- `merchants/[name]/briefing-document.md` → company overview, stakeholders, goals, tech stack
- `merchants/[name]/technical-assessment.md` → detailed requirements, discovery gaps, architecture
- `merchants/[name]/raw-files/meeting-notes/` → recent discovery/call notes
- `merchants/[name]/discovery-assessment.md` → Challenger framework notes

**From Salesforce** (via `revenue-mcp`):
```soql
SELECT Account.Name, Account.Industry, Account.Website, Total_Revenue__c,
       StageName, CloseDate, SE_Next_Steps__c
FROM Opportunity
WHERE Account.Name LIKE '%[merchant]%'
AND RecordType.Name = 'Sales'
AND IsClosed = false
```

**From SE-NTRAL** (via `se-ntral` MCP):
- Search for similar merchant profiles and how other SEs structured their demos
- Check for precedent demo scripts or DER docs

### Step 3: Build Limbic Opening

From the gathered context, identify:
- **Emotional pain**: The merchant's biggest frustration (from discovery notes, pain points)
- **Aspiration**: Their stated vision/goals (from briefing document, discovery)
- **Cost of inaction**: What happens if they stay on current platform (infer from tech stack challenges)

### Step 4: Build Tell-Show-Tell Sections

Based on the merchant's requirements, select and customize relevant sections from this template list:

| Template Key | When to Include |
|-------------|-----------------|
| `unauthenticated` | Always (unless pure B2B gated site) |
| `pdp` | Always |
| `account-request` | B2B merchants |
| `authenticated` | B2B merchants |
| `customer-account` | B2B merchants |
| `checkout` | Always |
| `admin` | Always |
| `companies` | B2B merchants |
| `catalogs` | Merchants with custom pricing / price lists |
| `products` | When PIM/product data migration is a concern |
| `sidekick` | Always (strong differentiator) |
| `theme-builder` | When merchant wants to own their storefront |
| `flow` | When automation is a key requirement |
| `analytics` | When data/reporting is important |

For each section:
- **Tell 1**: Customize the value statement using the merchant's specific language and goals
- **Show actions**: Tailor to what's most relevant for their use case
- **Tell 2**: Tie back to a specific business goal or pain point they mentioned
- **Question**: Pull unanswered discovery questions that fit this section

### Step 5: Populate Discovery Gaps

Cross-reference discovery questions from the technical assessment / discovery assessment:
- Mark questions as `answered: true` if answers exist in the merchant folder
- Flag unanswered questions with `weaveIntoDemo: true` if they're relevant to demo sections
- Add any merchant-specific custom questions

### Step 6: Build Conclusion Anchors

Create 3 anchors/guiding lights based on the merchant's top 3 priorities. Common patterns:
- **Modern Buying Experiences** (UX, search, product discovery, AI)
- **Personalization at Scale** (B2B pricing, catalogs, customer-specific content)
- **Employee Empowerment** (admin ease, no-code, reduce dev dependency)
- **Operational Efficiency** (automation, reduced manual work, streamlined processes)
- **Future-Ready Tech Stack** (consolidate systems, eliminate tech debt, AI-powered)

Select the 3 most relevant to this merchant.

### Step 7: Output JSON

Generate the complete JSON payload matching the Demo Prep schema (see `references/schema.json`).

**Step 7a: Persist to merchant folder.** Write the JSON to `merchants/[name]/demo-prep.json`. This enables future round-trips — re-running the skill will detect the existing file and offer refresh/merge/use options. If the merchant folder doesn't exist, create it first or ask the user where to save.

**Step 7b: Output for tool import.** Use this format:

```
Here's your demo prep JSON for [Merchant]. Saved to `merchants/[name]/demo-prep.json`.

To load into the tool:
1. Open https://se-demo-prep.quick.shopify.io/
2. Click ✦ AI Import in the header
3. Paste the JSON below and click Import

\`\`\`json
{ ... complete JSON payload ... }
\`\`\`

**What I included:**
- [X merchant context fields populated]
- [X Tell-Show-Tell sections]
- [X/Y discovery questions marked as answered]
- [X questions flagged to weave into demo]
- 3 anchors: [Anchor 1], [Anchor 2], [Anchor 3]

**Review these before your demo:**
- [ ] Limbic opening — does it match what they told you in discovery?
- [ ] TST sections — right order for your narrative?
- [ ] Discovery gaps flagged for demo — comfortable asking these live?
- [ ] Shortcuts — update to match your demo environment
```

---

## Error Handling

- No merchant folder → proceed with Salesforce + web research only
- No Salesforce match → ask user for merchant details, build from provided context
- Partial data → populate what's available, flag gaps in output
- If user provides a DER doc or meeting notes directly → parse and use those as primary source

---

## Quick Site Location

- **Deployed:** `https://se-demo-prep.quick.shopify.io/`
- **Local:** `tools/index.html` in the SE-Assistant repo
- **Schema:** `.claude/skills/demo-prep/references/schema.json`
- **Per-merchant prep:** `merchants/[name]/demo-prep.json` (round-trip cache)

---

## Team Setup

For teammates to use the AI auto-population:

1. **SE-Assistant repo** must be cloned (for the skill to be available)
2. **Quick site** is shared via URL — no installation needed for the tool itself
3. Say `/demo-prep [merchant name]` or "demo prep for [merchant]"
4. Copy the JSON output → paste into "AI Import" on the quick site
