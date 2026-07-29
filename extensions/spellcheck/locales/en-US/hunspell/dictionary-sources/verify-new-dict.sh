#! /usr/bin/env sh

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Sanity checks for the regenerated en_US-mozilla dictionary, run after
# make-new-dict.sh and before install-new-dict.sh. Written for POSIX sh
# so it runs unchanged on macOS (BSD userland) and Linux.

set -e

WKDIR="`pwd`"
DICT="$WKDIR/en_US-mozilla.dic"
AFF="$WKDIR/en_US-mozilla.aff"
BASELINE_DIC="$WKDIR/utf8/en-US-utf8.dic"
BASELINE_AFF="$WKDIR/utf8/en-US-utf8.aff"
MOZ_SPECIFIC="$WKDIR/mozilla-specific.txt"
SCOWL_DIR="$WKDIR/scowl"
MUNCH_LIST="$SCOWL_DIR/speller/munch-list"
MOZ_REMOVED="$WKDIR/5-mozilla-removed.txt"
WORDLIST_DIFF_URL_BASE="https://raw.githubusercontent.com/en-wl/wordlist-diff"

if [ ! -f "$DICT" ] || [ ! -f "$AFF" ]; then
  echo "ERROR: $DICT or $AFF not found. Run make-new-dict.sh first."
  exit 1
fi
if [ ! -f "$BASELINE_DIC" ] || [ ! -f "$BASELINE_AFF" ]; then
  echo "ERROR: baseline files missing under $WKDIR/utf8/."
  exit 1
fi

errors=0
warnings=0

fail() {
  printf 'FAIL: %s\n' "$1"
  errors=$((errors + 1))
}

warn() {
  printf 'WARN: %s\n' "$1"
  warnings=$((warnings + 1))
}

ok() {
  printf 'OK:   %s\n' "$1"
}

printf '\n=== 1. ISO-8859-1 round-trip ===\n'
if iconv -f utf-8 -t iso-8859-1 < "$DICT" > /dev/null 2>/dev/null; then
  ok "Dictionary fits in ISO-8859-1"
else
  fail "Dictionary contains characters outside ISO-8859-1 (install-new-dict.sh would mangle them)"
fi

printf '\n=== 2. Mozilla-specific words preserved ===\n'
while IFS= read -r line; do
  case "$line" in
    ''|'#'*) continue ;;
  esac
  word=${line%%/*}
  if grep -qE "^${word}(\$|/)" "$DICT"; then
    ok "$word"
  else
    fail "Missing Mozilla-specific word: $word"
  fi
done < "$MOZ_SPECIFIC"

printf '\n=== 3. Suggestion exclusions preserved ===\n'
TMPD="${TMPDIR:-/tmp}"
old_nosug="$TMPD/old-nosug-$$"
new_nosug="$TMPD/new-nosug-$$"
trap 'rm -f "$old_nosug" "$new_nosug"' EXIT
grep '!$' "$BASELINE_DIC" | LC_ALL=C sort > "$old_nosug"
grep '!$' "$DICT"         | LC_ALL=C sort > "$new_nosug"
missing=`comm -23 "$old_nosug" "$new_nosug"`
added=`comm -13 "$old_nosug" "$new_nosug"`
if [ -z "$missing" ]; then
  ok "All previous suggestion exclusions preserved"
else
  fail "Missing suggestion exclusions:"
  printf '%s\n' "$missing" | sed 's/^/  /'
fi
if [ -n "$added" ]; then
  printf 'INFO: New suggestion exclusions:\n'
  printf '%s\n' "$added" | sed 's/^/  /'
fi

printf '\n=== 4. Diff stats ===\n'
old_lines=`wc -l < "$BASELINE_DIC" | tr -d ' '`
new_lines=`wc -l < "$DICT" | tr -d ' '`
delta=$((new_lines - old_lines))
abs=${delta#-}
case $delta in
  -*) delta_str=$delta ;;
  *)  delta_str="+$delta" ;;
esac
if [ "$old_lines" -gt 0 ]; then
  pct=$((abs * 100 / old_lines))
else
  pct=0
fi
printf 'Baseline lines: %s\n' "$old_lines"
printf 'New lines:      %s (delta %s, %s%%)\n' "$new_lines" "$delta_str" "$pct"
if [ "$pct" -gt 25 ]; then
  warn "Line count changed by more than 25% of the baseline; double-check the output"
fi

printf '\n=== 5. Upstream en_US.txt subset check ===\n'
# The Mozilla dictionary should equal upstream en_US.txt minus Mozilla
# removals, plus Mozilla additions, variants and accented words. So every
# word in upstream en_US.txt that isn't in 5-mozilla-removed.txt should be
# present in the regenerated wordlist obtained by expanding en_US-mozilla.dic
# through its affix file.
#
# The reference en_US.txt lives in the wordlist-diff mirror, which carries
# the same release tags as SCOWL itself. We only need that one file, so
# fetch it directly from raw.githubusercontent.com instead of requiring a
# clone of the repo.
scowl_version=`git -C "$SCOWL_DIR" describe --tags --exact-match 2>/dev/null || true`
if [ -z "$scowl_version" ]; then
  warn "$SCOWL_DIR is not on a tagged release; skipping upstream subset check."
elif ! command -v curl >/dev/null 2>&1; then
  warn "curl not available; skipping upstream subset check."
elif [ ! -x "$MUNCH_LIST" ]; then
  warn "$MUNCH_LIST not available; skipping upstream subset check."
elif [ ! -f "$MOZ_REMOVED" ]; then
  warn "$MOZ_REMOVED not found; run make-new-dict.sh first."
else
  upstream_raw="$TMPD/wordlist-diff-en_US-$$.txt"
  upstream_sorted="$TMPD/upstream-$$"
  final_wordlist="$TMPD/final-wordlist-$$"
  removed_sorted="$TMPD/removed-$$"
  expected_subset="$TMPD/expected-$$"
  unexpected_missing="$TMPD/unexpected-$$"
  trap 'rm -f "$old_nosug" "$new_nosug" "$upstream_raw" "$upstream_sorted" "$final_wordlist" "$removed_sorted" "$expected_subset" "$unexpected_missing"' EXIT

  url="$WORDLIST_DIFF_URL_BASE/$scowl_version/en_US.txt"
  printf 'Fetching %s ...\n' "$url"
  if ! curl -fsSL "$url" -o "$upstream_raw"; then
    warn "Could not download $url; skipping upstream subset check."
  else
    # Expand the regenerated dictionary through its affix file to get the
    # full wordlist. The .dic is UTF-8 at this point; munch-list operates
    # on ISO-8859-1, so pipe it through iconv. Strip the count line at
    # the top (only digits).
    iconv -f utf-8 -t iso-8859-1 "$DICT" \
      | grep -v '^[0-9]\+$' \
      | LC_ALL=C "$MUNCH_LIST" expand "$AFF" \
      | LC_ALL=C sort -u > "$final_wordlist"

    # Normalize the upstream baseline and Mozilla removals to ISO-8859-1
    # to match the regenerated wordlist. Drop any characters that can't
    # be represented (they can't be in the shipped .dic either; check 1
    # catches that case separately).
    iconv -f utf-8 -t iso-8859-1//TRANSLIT "$upstream_raw" 2>/dev/null | LC_ALL=C sort -u > "$upstream_sorted"
    iconv -f utf-8 -t iso-8859-1//TRANSLIT "$MOZ_REMOVED" 2>/dev/null | LC_ALL=C sort -u > "$removed_sorted"

    # Drop words Mozilla intentionally removed from the upstream baseline.
    LC_ALL=C comm -23 "$upstream_sorted" "$removed_sorted" > "$expected_subset"
    # Anything still missing from the regenerated wordlist is unexpected.
    LC_ALL=C comm -23 "$expected_subset" "$final_wordlist" > "$unexpected_missing"

    if [ ! -s "$unexpected_missing" ]; then
      ok "Upstream en_US.txt at $scowl_version is a subset of the regenerated wordlist (minus Mozilla removals)"
    else
      total=`wc -l < "$unexpected_missing" | tr -d ' '`
      fail "$total upstream words from $scowl_version missing from the regenerated wordlist and not in 5-mozilla-removed.txt:"
      head -n 20 "$unexpected_missing" | sed 's/^/  /'
      if [ "$total" -gt 20 ]; then
        printf '  ... and %s more\n' $((total - 20))
      fi
    fi
  fi
fi

printf '\n=== Summary ===\n'
printf 'Errors: %d  Warnings: %d\n' "$errors" "$warnings"
if [ "$errors" -gt 0 ]; then
  exit 1
fi
exit 0
