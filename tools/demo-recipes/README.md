---
name: "B2B Demo Recipes"
description: "Pre-built demo store configs for 9 B2B verticals. Copy a prompt, paste into Claude Code, get a demo-ready store with products, companies, orders, and B2B pricing in minutes."
url: "https://dustinfloer.github.io/SE-Field-Guide/demos/"
category: "Workflows"
built_with: "Vanilla JS + GitHub Pages"
audience: "SE-facing"
author: "Dustin Floer"
author_slack: "@dustin.floer"
date_added: "2026-04-16"
status: "active"
access_level: "internal"
source_of_truth: "repo"
reviewed_by: "@dustin.floer"
last_reviewed: "2026-05-20"
review_cycle_days: "90"
screenshot: ""
slack_channel: ""
repo_url: "https://github.com/dustinfloer/SE-Field-Guide"
b2b_specific: true
---

# B2B Demo Recipes

Pre-built demo store configurations for common B2B verticals. Each recipe generates a Claude Code prompt that orchestrates three MCPs to set up a complete demo store:

1. **Forge MCP** — creates a sandbox store
2. **Shopify MCP** — configures B2B market, catalogs with tiered pricing, payment terms
3. **Spark MCP** — populates products, companies, and orders

## Recipes

| Recipe | Industry | Companies | B2B Orders | Model |
|--------|----------|-----------|------------|-------|
| Fashion Wholesale | Apparel | 15 | 40 | Wholesale |
| Auto Parts | Automotive | 25 | 80 | Distribution |
| Specialty Food | Food & Bev | 20 | 60 | Wholesale |
| Beauty Brand | Beauty | 10 | 25 | Wholesale |
| Electronics Supplier | Electronics | 30 | 70 | Distribution |
| Furniture Manufacturer | Home | 12 | 30 | Manufacturing |
| Home & Kitchen | Home Decor | 18 | 45 | Wholesale |
| Pet Supply | Pet | 22 | 55 | Distribution |
| Medical Supply | Healthcare | 24 | 65 | Distribution |

## Prerequisites

- Forge MCP configured
- Spark MCP configured
- Shopify MCP configured ([setup guide](https://shopifyclaudemcp1.quick.shopify.io/))

> **Note:** This is an internal-only resource. Do not share externally.
