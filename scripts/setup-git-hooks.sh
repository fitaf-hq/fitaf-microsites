#!/usr/bin/env bash
# Point git at this repository's hooks (rejects tool-attribution trailers in commit messages).
set -euo pipefail
git -C "$(dirname "$0")/.." config core.hooksPath scripts/git-hooks
echo "core.hooksPath = scripts/git-hooks"
