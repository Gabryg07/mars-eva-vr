#!/bin/bash
# Build the app and publish dist/ to the gh-pages branch (served by GitHub Pages).
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"; cd "$ROOT/app"; npx vite build >/dev/null
P=/tmp/marswalk-pages; rm -rf "$P"; mkdir -p "$P"; cp -r dist/. "$P/"; touch "$P/.nojekyll"
# keep the preview of the team's branch (folder eva/ on gh-pages) across deploys
K=/tmp/marswalk-keep; rm -rf "$K"; if git clone -q --depth 1 -b gh-pages "$(git -C "$ROOT" remote get-url origin)" "$K" 2>/dev/null && [ -d "$K/eva" ]; then cp -r "$K/eva" "$P/eva"; fi
cd "$P"; git init -q -b gh-pages; git add -A
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -q -m "Pubblicazione $(git -C "$ROOT" rev-parse --short HEAD)"
git push -q -f "$(git -C "$ROOT" remote get-url origin)" gh-pages
echo "published $(git -C "$ROOT" rev-parse --short HEAD)"
