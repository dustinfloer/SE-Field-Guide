---
name: "Simulations"
description: "Interactive merchant-facing simulations for B2B sales scenarios and product demonstrations"
url: "https://simulations.quick.shopify.io/"
category: "Simulations"
built_with: "Quick Site + self-contained HTML/CSS/JS"
audience: "Both"
author: "Matt Ward"
author_slack: "@matt.ward"
date_added: "2026-03-24"
screenshot: ""
slack_channel: "global-b2b-sales-team"
repo_url: "https://github.com/dustinfloer/SE-Field-Guide/tree/main/tools/simulations"
status: "active"
access_level: "internal"
source_of_truth: "repo"
reviewed_by: "@dustin.floer"
last_reviewed: "2026-06-26"
review_cycle_days: "90"
b2b_specific: true
---

# Simulations

Interactive, merchant-facing simulations for B2B sales scenarios and product demonstrations. The live Quick Site is at [simulations.quick.shopify.io](https://simulations.quick.shopify.io/).

## What It Does

A collection of browser-native simulations designed for B2B sales scenarios. Use these to walk merchants through realistic product experiences, integration flows, payment workflows, API scale conversations, and agentic commerce examples.

## Repository Source

This folder now stores the deployable simulation site source so updates can be versioned, reviewed, and retrieved by the Shopify field team.

| Path | Purpose |
| --- | --- |
| [`site/index.html`](./site/index.html) | Simulation library landing page and card catalog |
| [`site/*.html`](./site/) | One self-contained HTML simulation per page |
| [`site/se-guide-content.js`](./site/se-guide-content.js) | SE Guide content registry, keyed by simulation filename |
| [`site/se-guide.js`](./site/se-guide.js) | Shared SE Guide renderer |
| [`site/source-viewer.js`](./site/source-viewer.js) | Shared Source panel / Copy HTML helper |
| [`site/SIMULATION_CONTEXT.md`](./site/SIMULATION_CONTEXT.md) | Build workflow, patterns, and QA checklist |
| [`site/SE_SIMULATION_BUILD_BRIEF.md`](./site/SE_SIMULATION_BUILD_BRIEF.md) | Standards for building trusted Shopify simulations |
| [`site/LOCAL_SIMULATION_FILES.md`](./site/LOCAL_SIMULATION_FILES.md) | Inventory of current and adjacent local simulation assets |

## When to Use It

- During live demos to show merchants realistic scenarios
- For prospect enablement and self-guided exploration
- For team training and onboarding on B2B selling motions
- When a deck needs a reusable architecture, payment, API, integration, or agentic-commerce simulation

## How to Get Started

1. Go to [Simulations](https://simulations.quick.shopify.io/)
2. Select the simulation that matches your scenario
3. Use the SE Guide at the top of each simulation for premise, talking points, and positioning
4. If embedding in a merchant deck, click **`</> Source`** and copy the standalone HTML into the deck instead of iframing the IAP-gated Quick Site

## Updating a Simulation

```bash
cd ~/Documents/b2b-ai-catalog
git fetch origin
git switch -c your-simulation-branch origin/main

# Edit files under tools/simulations/site/
open tools/simulations/site/index.html
```

For each production simulation update:

1. Edit or add the simulation HTML in [`site/`](./site/).
2. Add or update the matching SE Guide entry in [`site/se-guide-content.js`](./site/se-guide-content.js).
3. Add or update the card in [`site/index.html`](./site/index.html).
4. Update [`site/SIMULATION_CONTEXT.md`](./site/SIMULATION_CONTEXT.md) or [`site/LOCAL_SIMULATION_FILES.md`](./site/LOCAL_SIMULATION_FILES.md) if the catalog or source inventory changes.
5. Open the page locally in a browser and verify replay/reset/speed/step controls.
6. Commit the change and open a PR.

## Deploying to Quick Site

After review/merge, deploy the repo source from a normal terminal with Quick CLI access:

```bash
cd ~/Documents/b2b-ai-catalog
quick deploy "$PWD/tools/simulations/site" simulations --force
```

The historical local source path was `/Users/mattward/Desktop/Claude/simulations`. Treat this repo folder as the durable source of truth going forward; only sync back to that local folder if you need to keep a legacy working copy aligned.

## Current Catalog

The live catalog currently includes simulations for:

- Agentic commerce: Gemini Shopping, UCP Agentic Commerce
- ERP / integration: NetSuite, SAP, Oracle, generic ERP lifecycle, inventory, payout reconciliation
- API scale: Rate Limit Calculator
- Payments: B2B Payment Flow
- Custom: Ventrata Ticketing PDP

See [`site/index.html`](./site/index.html) for the source-of-truth card list.
