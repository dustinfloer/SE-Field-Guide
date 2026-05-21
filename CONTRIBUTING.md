# Contributing a Tool to the Catalog

Adding your tool takes about 5 minutes. You can do everything from the GitHub web UI — no command line needed.

---

## Option 1: GitHub Web UI (Recommended)

### Step 1: Copy the Template

Open [templates/new-tool.md](templates/new-tool.md) and click the **copy** icon to grab the contents.

### Step 2: Create Your Tool Folder

1. Navigate to the [tools/](tools/) directory in this repo
2. Click **Add file** > **Create new file**
3. In the filename field, type: `your-tool-name/README.md`
   - This creates both the folder and the file
   - Use lowercase with hyphens (e.g., `demo-prep-tool/README.md`)

### Step 3: Fill Out the Template

Paste the template contents and fill in each field:

```yaml
---
name: "Your Tool Name"
description: "One-line description of what it does"
url: "https://your-tool.quick.shopify.io"
category: "Tools"           # Tools, Simulations, or References
built_with: "Quick Site"    # Quick Site, MCP Server, Script, Google Sheet, etc.
audience: "SE-facing"       # SE-facing, Merchant-facing, or Both
author: "Your Name"
author_slack: "@your-handle"
date_added: "2026-03-24"
status: "active"            # draft, active, needs_review, stale, deprecated
access_level: "internal"    # internal, external, or mixed
source_of_truth: "repo"     # repo, quick_site, google_doc, google_sheet, etc.
reviewed_by: "@reviewer"
last_reviewed: "2026-03-24"
review_cycle_days: "90"
---
```

Below the frontmatter, write a brief description covering:
- What the tool does
- When to use it
- How to get started

### Step 4: Open a Pull Request

1. At the bottom of the page, select **Create a new branch for this commit and start a pull request**
2. Click **Propose new file**
3. Fill in the PR description (a template will auto-populate)
4. Click **Create pull request**

Once merged, the catalog site updates automatically within a few minutes.

---

## Option 2: Git CLI

```bash
# Clone the repo
git clone https://github.com/dustinfloer/SE-Field-Guide.git
cd SE-Field-Guide

# Create a branch
git checkout -b add-your-tool-name

# Create your tool folder and README
mkdir tools/your-tool-name
cp templates/new-tool.md tools/your-tool-name/README.md

# Edit the README with your tool's details
# ... fill in the frontmatter and description ...

# Optional: add a screenshot
cp ~/path/to/screenshot.png tools/your-tool-name/screenshot.png

# Commit and push
git add tools/your-tool-name/
git commit -m "Add your-tool-name to catalog"
git push -u origin add-your-tool-name

# Open a PR on GitHub
gh pr create --title "Add Your Tool Name" --body "Adding my tool to the catalog"
```

---

## Template Fields Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Display name of your tool |
| `description` | Yes | One-line summary (shown on catalog cards) |
| `url` | Yes | Link to the live tool |
| `category` | Yes | `Tools`, `Simulations`, `References`, `Workflows`, or `Guides` |
| `built_with` | Yes | How it's built: `Quick Site`, `MCP Server`, `Script`, `Google Sheet`, `Notebook`, etc. |
| `audience` | Yes | Who uses it: `SE-facing`, `Merchant-facing`, or `Both` |
| `author` | Yes | Your name |
| `author_slack` | Yes | Your Slack handle (for questions) |
| `date_added` | Yes | Date in YYYY-MM-DD format |
| `status` | Yes | Lifecycle state: `draft`, `active`, `needs_review`, `stale`, or `deprecated` |
| `access_level` | Yes | Who can open it: `internal`, `external`, or `mixed` |
| `source_of_truth` | Yes | Canonical home for the guidance or tool metadata |
| `reviewed_by` | Yes | Slack handle of the reviewer accountable for freshness |
| `last_reviewed` | Yes | Date in YYYY-MM-DD format |
| `review_cycle_days` | Yes | Number of days before the entry needs review |
| `screenshot` | No | Filename of a screenshot in the same folder |
| `slack_channel` | No | Slack channel for discussion |
| `repo_url` | No | Link to source repo if separate |

---

## Updating an Existing Entry

1. Navigate to the tool's `README.md` under `tools/`
2. Click the pencil icon to edit
3. Make your changes
4. Open a PR with your updates

## Screenshots

Optional but recommended. Drop a `screenshot.png` (or `.jpg`/`.gif`) in your tool's folder and reference it in the frontmatter:

```yaml
screenshot: "screenshot.png"
```

## Questions?

Open an issue or reach out in the team Slack channel.
