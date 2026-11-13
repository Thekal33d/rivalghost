#!/usr/bin/env bash
# Build a secret-free, self-contained API + static web release. Node 24 on target.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${1:?Usage: tools/build-release.sh /absolute/empty-release-directory}"
case "$1" in /*) ;; *) echo 'Use an absolute output directory' >&2; exit 1;; esac
if [ -e "$1" ]; then echo 'Output directory must not exist' >&2; exit 1; fi
pnpm build
mkdir -p "$1"
pnpm --filter @rivalghost/relayer deploy --legacy --prod --frozen-lockfile --ignore-scripts "$1/api"
cp -R apps/web/dist "$1/web"
cp -R deploy "$1/deploy"
# Fail before upload if private data or native platform-specific addons leaked in.
python3 - "$1" <<'CHECK'
import pathlib,sys
root=pathlib.Path(sys.argv[1]).resolve()
for p in root.rglob('*'):
 if p.is_symlink():
  if not p.resolve().is_relative_to(root): raise SystemExit('External symlink in release: '+str(p.relative_to(root)))
 if p.name=='.env' or p.name.startswith('.env.') or p.name=='.local' or p.suffix in ('.sqlite','.node') or '.private.' in p.name:
  raise SystemExit('Private data/native addon in release: '+str(p.relative_to(root)))
CHECK
git rev-parse HEAD > "$1/REVISION"
echo "Release ready: $1"
