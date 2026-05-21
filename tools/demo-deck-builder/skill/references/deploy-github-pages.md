# Legacy: Deploy Deck to Password-Protected GitHub Pages

> **Deprecated default:** Do not use this as the standard merchant share path.
> Demo Deck Studio now defaults to exporting a merchant-safe PDF. Use this
> GitHub Pages protocol only when the user explicitly asks for it and confirms
> the account has approved hosted HTML/source distribution.

A merchant-safe share path: encrypted HTML behind a password, hosted on GitHub Pages, reachable via a public URL.

**Why this pattern:**
- Quick sites at `*.quick.shopify.io` are IAP-gated — Shopify employees only. Merchants can't open them.
- Emailing a raw HTML file feels amateur and some email filters strip it.
- Public GitHub exposes merchant-specific content in search results.
- Encrypted GitHub Pages solves all three technically, but it still creates governance questions because the browser eventually receives the deck HTML after unlock.

**How it works:**
1. `staticrypt` encrypts the deck's HTML with AES-256 using a user-chosen password.
2. Encrypted HTML is pushed to a public GitHub repo.
3. GitHub Pages serves it at `https://[user].github.io/[repo]/`.
4. Merchant loads the URL → sees password prompt → enters password → content decrypts in the browser.

The content is cryptographically unreadable in source until the password is entered. After unlock, the browser receives the HTML. Treat this as an approved exception path, not the default.

---

## Prerequisites (check before starting)

```bash
gh auth status                              # must be logged in with `repo` scope
gh api user --jq '.login'                   # returns user's GitHub handle (save this)
which pnpx || which npx                     # pnpx preferred; npx falls back
```

If `gh` isn't authenticated: tell the user to run `gh auth login` before proceeding.

If neither `pnpx` nor `npx` is available: tell the user to install `pnpm` or `npm` first.

---

## Execution Protocol

### Step 1 — Collect inputs

Ask the user (via AskUserQuestion when possible):

1. **Password** — suggest 2-3 options based on context (e.g., `acme2026`, `shopify-demo`, `{partner-name}-demo`). Keep short and memorable — the merchant will type this on mobile.
2. **Repo name** — suggest `[merchant-slug]-demo-deck`. Confirm they're happy with the repo name appearing in the URL.

### Step 2 — Set up `.deploy/` working directory

Create `merchants/[merchant]/.deploy/`. This directory:
- Is a git repo of its own (separate from the SE-Assistant repo)
- Holds the encrypted `index.html` (what GitHub Pages serves)
- Contains the `redeploy.sh` helper for future updates
- Tracks a `.last-source-hash` file for idempotent redeploys

### Step 3 — Copy + encrypt the deck

```bash
cd merchants/[merchant]/.deploy
cp ../index.html index.html
pnpx staticrypt index.html -p "[password]" --short -d . \
  --template-title "[merchant] × Shopify Plus" \
  --template-instructions "Enter the password shared with you to view this deck." \
  --template-color-primary "#14a098" \
  --template-color-secondary "#0a1420" \
  --template-button "Unlock"
```

The encrypted output overwrites `.deploy/index.html`. A `.staticrypt.json` is also written (contains salt, not the password).

### Step 4 — Initialize git + create README

```bash
git init -b main
cat > README.md <<'EOF'
# [Merchant] × Shopify Plus — Demo Deck

Password-protected presentation. Contact the presenter for access.
EOF
git config user.email "[user's shopify email]"
git config user.name "[user's full name]"
git add index.html README.md
git commit -m "Initial deck"
```

### Step 5 — Create the GitHub repo + push

```bash
gh repo create [repo-name] \
  --public \
  --description "Shopify Plus demo deck for [Merchant] (password-protected)" \
  --source=. --push
```

**Public is required for GitHub Pages on free tier.** That's fine — the content is encrypted.

### Step 6 — Enable GitHub Pages

```bash
gh api -X POST repos/[user]/[repo-name]/pages \
  -f "source[branch]=main" \
  -f "source[path]=/"
```

### Step 7 — Wait for the first build (30-90 seconds)

```bash
# Poll until status = "built"
for i in 1 2 3 4 5 6 7 8; do
  sleep 15
  deploy_state=$(gh api repos/[user]/[repo-name]/pages --jq '.status')
  echo "Poll $i: $deploy_state"
  [ "$deploy_state" = "built" ] && break
done
curl -sI https://[user].github.io/[repo-name]/ | head -1     # should return 200
```

### Step 8 — Install the redeploy helper

Copy `references/redeploy.sh.template` to `.deploy/redeploy.sh`, substituting the placeholders:
- `{{SOURCE_HTML}}` → `../index.html`
- `{{PASSWORD}}` → user's chosen password
- `{{DECK_TITLE}}` → `[Merchant] × Shopify Plus`
- `{{LIVE_URL}}` → `https://[user].github.io/[repo-name]/`

```bash
chmod +x .deploy/redeploy.sh
```

### Step 9 — Commit the redeploy helper to the deploy repo

```bash
cd .deploy
git add redeploy.sh
git commit -m "Add redeploy helper"
git push
```

### Step 10 — Return success summary to the user

Give them:
- **The URL** — `https://[user].github.io/[repo-name]/`
- **The password** — chosen in Step 1
- **A draft email** they can send to the merchant (short, professional, uses their AE/SE name)
- **How to redeploy** — `cd merchants/[merchant]/.deploy && ./redeploy.sh`

Format the email as a copy-paste block. Reference specific slides the merchant should revisit (pricing, integration, timeline — whatever the deck emphasized).

---

## Failure modes and handling

| Symptom | Cause | Fix |
|---|---|---|
| `gh repo create` fails with 403 | Token missing `repo` scope | User runs `gh auth refresh -s repo` |
| `gh api ... /pages` returns 404 | Repo not fully propagated yet | Sleep 5 sec, retry once |
| Pages build status stuck at `null` or `building` for >5 min | GitHub service issue or `index.html` at wrong path | Check `gh api repos/[user]/[repo]/pages/builds` for error |
| Curl returns 404 after deploy | Wrong source path (should be `/`, not `/docs`) | Re-POST pages config with correct source |
| `pnpx staticrypt` fails | `pnpm` not installed or npx context error | Fall back to `npx staticrypt` |

---

## Redeploy behavior (what `./redeploy.sh` does on subsequent runs)

1. Hashes the source `../index.html`
2. Compares against `.last-source-hash`
3. If unchanged → exits with "Nothing to do"
4. If changed → re-encrypts, commits with timestamped message, pushes, saves new hash
5. `--force` flag bypasses the hash check (useful for rotating the salt/password)

This prevents noisy no-op commits when the user runs the script without having edited the deck.

---

## When NOT to use this path

- **If the merchant's buyer is @shopify.com** (e.g., internal demo) → use a quick site, not GitHub Pages
- **If the content has any `[INTERNAL-ONLY]` markers** → do not publish, even encrypted. Internal content stays internal.
- **If the merchant has explicit data-handling requirements** prohibiting external hosting → email the HTML file or use the merchant's approved share mechanism

Always check merchant-specific compliance constraints in `merchants/[merchant]/briefing-document.md` before publishing.
