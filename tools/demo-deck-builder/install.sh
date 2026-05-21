#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Demo Deck Studio installer

Usage:
  curl -fsSL https://raw.githubusercontent.com/dustinfloer/SE-Field-Guide/main/tools/demo-deck-builder/install.sh | bash
  curl -fsSL https://raw.githubusercontent.com/dustinfloer/SE-Field-Guide/main/tools/demo-deck-builder/install.sh | bash -s -- --se-assistant /path/to/SE-Assistant
  bash tools/demo-deck-builder/install.sh [--se-assistant /path/to/SE-Assistant] [--skip-deps] [--from-github]

What it does:
  1. Copies tools/demo-deck-builder/skill into SE-Assistant/.claude/skills/demo-deck-builder
  2. Refreshes Codex/Cursor/Pi skill symlinks when those IDE folders exist
  3. Installs the Studio app dependencies with pnpm, falling back to npm

Options:
  --se-assistant PATH  SE Assistant workspace path. Optional when the script can auto-detect it.
  --skip-deps         Copy the skill but skip pnpm/npm install.
  --from-github       Download the latest released skill from GitHub. Use this when you do not
                      already have the Field Guide repo locally.
  -h, --help          Show this help text.

Examples:
  curl -fsSL https://raw.githubusercontent.com/dustinfloer/SE-Field-Guide/main/tools/demo-deck-builder/install.sh | bash
  curl -fsSL https://raw.githubusercontent.com/dustinfloer/SE-Field-Guide/main/tools/demo-deck-builder/install.sh | bash -s -- --se-assistant ~/Documents/SE-Assistant
  bash tools/demo-deck-builder/install.sh
  bash tools/demo-deck-builder/install.sh --se-assistant ~/Documents/SE-Assistant
  bash tools/demo-deck-builder/install.sh --skip-deps
EOF
}

script_ref="${BASH_SOURCE[0]:-$0}"
if [[ -n "$script_ref" && -f "$script_ref" ]]; then
  script_dir="$(cd "$(dirname "$script_ref")" && pwd)"
else
  script_dir="$PWD"
fi

skill_source="$script_dir/skill"
se_assistant_dir="${SE_ASSISTANT_HOME:-}"
install_deps=1
download_from_github=0
temp_dir=""
repo_tarball_url="${DEMO_DECK_BUILDER_TARBALL_URL:-https://github.com/dustinfloer/SE-Field-Guide/archive/refs/heads/main.tar.gz}"
repo_skill_path="${DEMO_DECK_BUILDER_SKILL_PATH:-tools/demo-deck-builder/skill}"

cleanup() {
  if [[ -n "$temp_dir" && -d "$temp_dir" ]]; then
    rm -rf "$temp_dir"
  fi
}
trap cleanup EXIT

while [[ $# -gt 0 ]]; do
  case "$1" in
    --se-assistant)
      if [[ $# -lt 2 ]]; then
        echo "Missing path after --se-assistant" >&2
        exit 1
      fi
      se_assistant_dir="$2"
      shift 2
      ;;
    --skip-deps)
      install_deps=0
      shift
      ;;
    --from-github)
      download_from_github=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

download_skill_from_github() {
  if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required for --from-github installs." >&2
    exit 1
  fi

  if ! command -v tar >/dev/null 2>&1; then
    echo "tar is required for --from-github installs." >&2
    exit 1
  fi

  local tmp_parent
  tmp_parent="${TMPDIR:-/tmp}"
  tmp_parent="${tmp_parent%/}"
  temp_dir="$(mktemp -d "$tmp_parent/demo-deck-builder-install.XXXXXX")"
  local archive="$temp_dir/field-guide.tar.gz"

  echo "Downloading latest Demo Deck Studio skill from GitHub..."
  curl -fsSL "$repo_tarball_url" -o "$archive"
  tar -xzf "$archive" -C "$temp_dir"

  local skill_md
  skill_md="$(find "$temp_dir" -path "*/$repo_skill_path/SKILL.md" -print -quit)"
  if [[ -z "$skill_md" ]]; then
    echo "Downloaded archive did not contain $repo_skill_path/SKILL.md." >&2
    exit 1
  fi

  skill_source="$(dirname "$skill_md")"
}

if [[ "$download_from_github" -eq 1 ]]; then
  download_skill_from_github
elif [[ ! -f "$skill_source/SKILL.md" ]]; then
  echo "Could not find local skill source at: $skill_source"
  echo "Trying the latest GitHub release instead..."
  download_skill_from_github
fi

expand_path() {
  local input="$1"
  if [[ "$input" == "~" ]]; then
    printf '%s\n' "$HOME"
  elif [[ "$input" == ~/* ]]; then
    printf '%s/%s\n' "$HOME" "${input#~/}"
  else
    printf '%s\n' "$input"
  fi
}

looks_like_se_assistant() {
  local candidate="$1"
  [[ -d "$candidate/.claude/skills" || -f "$candidate/AGENTS.md" || -f "$candidate/CLAUDE.md" ]]
}

find_se_assistant_upwards() {
  local current="$1"
  while [[ "$current" != "/" ]]; do
    if looks_like_se_assistant "$current"; then
      printf '%s\n' "$current"
      return 0
    fi
    current="$(dirname "$current")"
  done
  return 1
}

find_common_se_assistant() {
  local candidate
  for candidate in \
    "$HOME/Documents/SE-Assistant" \
    "$HOME/SE-Assistant" \
    "$HOME/Developer/SE-Assistant" \
    "$HOME/Code/SE-Assistant" \
    "$HOME/Projects/SE-Assistant"; do
    if looks_like_se_assistant "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

if [[ -z "$se_assistant_dir" ]]; then
  if looks_like_se_assistant "$PWD"; then
    se_assistant_dir="$PWD"
  elif se_assistant_dir="$(find_se_assistant_upwards "$script_dir")"; then
    :
  elif se_assistant_dir="$(find_common_se_assistant)"; then
    :
  else
    cat >&2 <<'EOF'
Could not auto-detect your SE Assistant workspace.

Run again with:
  curl -fsSL https://raw.githubusercontent.com/dustinfloer/SE-Field-Guide/main/tools/demo-deck-builder/install.sh | bash -s -- --se-assistant /path/to/SE-Assistant

Or set:
  export SE_ASSISTANT_HOME=/path/to/SE-Assistant
EOF
    exit 1
  fi
fi

se_assistant_dir="$(expand_path "$se_assistant_dir")"
se_assistant_dir="$(cd "$se_assistant_dir" && pwd)"

if ! looks_like_se_assistant "$se_assistant_dir"; then
  echo "This does not look like an SE Assistant workspace: $se_assistant_dir" >&2
  echo "Expected .claude/skills, AGENTS.md, or CLAUDE.md." >&2
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required to install/update the skill safely." >&2
  exit 1
fi

target_root="$se_assistant_dir/.claude/skills"
target_skill="$target_root/demo-deck-builder"
mkdir -p "$target_root"

echo "Installing Demo Deck Studio skill..."
echo "  From: $skill_source"
echo "  To:   $target_skill"

rsync -a --delete \
  --exclude node_modules \
  --exclude .DS_Store \
  "$skill_source/" "$target_skill/"

for ide_dir in .codex .cursor .pi; do
  ide_skills="$se_assistant_dir/$ide_dir/skills"
  ide_target="$ide_skills/demo-deck-builder"
  if [[ ! -d "$ide_skills" ]]; then
    continue
  fi

  if [[ -L "$ide_target" || ! -e "$ide_target" ]]; then
    ln -sfn "../../.claude/skills/demo-deck-builder" "$ide_target"
    echo "Linked $ide_dir skill path."
  else
    echo "Skipped $ide_dir skill path because it already exists and is not a symlink."
  fi
done

if [[ "$install_deps" -eq 1 ]]; then
  app_dir="$target_skill/studio/app"
  if [[ -f "$app_dir/package.json" ]]; then
    if command -v pnpm >/dev/null 2>&1; then
      echo "Installing Studio app dependencies with pnpm..."
      pnpm --dir "$app_dir" install
    elif command -v npm >/dev/null 2>&1; then
      echo "pnpm not found; installing Studio app dependencies with npm..."
      npm install --prefix "$app_dir"
    else
      echo "Warning: neither pnpm nor npm was found. Install dependencies manually before running Studio." >&2
    fi
  fi
else
  echo "Skipped dependency install."
fi

cat <<EOF

Demo Deck Studio is installed.

Run it from your SE Assistant workspace:
  cd "$se_assistant_dir"
  node .claude/skills/demo-deck-builder/studio/demo-deck-studio.mjs studio-v2 merchants/[merchant]/index.html --port 7332 --api-port 7333

Studio v2 opens automatically in your default browser:
  http://127.0.0.1:7332/
EOF
