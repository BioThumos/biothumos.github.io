#!/usr/bin/env bash
# Use AFTER the Quartz build, BEFORE the Pages upload.
# Installs only a verified PUBLIC-mode site at public/hx.
set -euo pipefail
src="${1:?Usage: install_quartz_hx.sh PUBLIC_SITE_DIR QUARTZ_PUBLIC_DIR}"
quartz_public="${2:?Usage: install_quartz_hx.sh PUBLIC_SITE_DIR QUARTZ_PUBLIC_DIR}"
if [[ ! -f "$src/PUBLIC_BUILD_MANIFEST.json" || ! -f "$src/index.html" ]]; then
  echo 'Refusing deployment: expected a public, audited site. Never copy a private site.' >&2
  exit 1
fi
# The marker must describe the actual alias-based public edition.
python3 - "$src/PUBLIC_BUILD_MANIFEST.json" <<'CHECK_PUBLIC_MARKER'
import json,sys
try:
    d=json.load(open(sys.argv[1],encoding='utf-8'))
    assert d.get('publication_mode')=='public-aliased-preview'
    assert d.get('privacy_policy_version')==2
    assert d.get('source_database_included') is False
except (OSError,ValueError,AssertionError):
    raise SystemExit('Refusing deployment: incompatible or invalid public-build manifest')
CHECK_PUBLIC_MARKER
if [[ ! -d "$quartz_public" ]]; then
  echo 'Quartz output directory does not exist; run the Quartz build first.' >&2
  exit 1
fi
# Refuse private or raw databases, project archives or source code.
if find "$src" -type f \( -iname '*.sqlite' -o -iname '*.sqlite3' -o -iname '*.db' -o -iname '*.zip' -o -iname '*.py' -o -iname '*.xml' \) | grep -q .; then
  echo 'Refusing deployment: site contains a database, archive, source code or raw XML.' >&2
  exit 1
fi
out="$quartz_public/hx"
if [[ -e "$out" && ! -f "$out/PUBLIC_BUILD_MANIFEST.json" ]]; then
  echo 'Refusing deployment: Quartz already produced /hx content; choose another slug.' >&2
  exit 1
fi
if [[ -L "$src" || -L "$out" ]]; then
  echo 'Refusing symlink input or destination.' >&2
  exit 1
fi
rm -rf -- "$out"
mkdir -p -- "$out"
cp -a -- "$src"/. "$out"/
# Quartz is the sole owner of the root; this script owns only public/hx.
echo "Installed public clinical site in $out"
