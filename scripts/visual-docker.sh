#!/usr/bin/env bash
# Runs the visual-regression suite inside the official Playwright image pinned
# to the lockfile's @playwright/test, the same image the deploy workflow uses.
# Extra arguments go to `playwright test` (e.g. --update-snapshots).
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(sed -n "s/^  '@playwright\/test@\([0-9.]*\)':$/\1/p" pnpm-lock.yaml | head -n 1)
if [[ -z "$version" ]]; then
  echo "could not read the @playwright/test version from pnpm-lock.yaml" >&2
  exit 1
fi
if ! command -v docker >/dev/null; then
  echo "docker is required; baselines only match the Linux Playwright image" >&2
  exit 1
fi

# Linux node_modules and build output live in named volumes, so the
# container never overwrites the host's native (macOS) binaries.
docker run --rm --init --ipc=host \
  -v "$PWD":/work -w /work \
  -v kuraattori-visual-node-modules:/work/node_modules \
  -v kuraattori-visual-next:/work/.next \
  -v kuraattori-visual-open-next:/work/.open-next \
  -e CI -e SKIP_ENV_VALIDATION=1 \
  "mcr.microsoft.com/playwright:v${version}-noble" \
  bash -c 'corepack enable && pnpm install --frozen-lockfile && pnpm run visual:run "$@"' \
  visual "$@"
