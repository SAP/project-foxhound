#! /usr/bin/env sh

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# This script creates a new dictionary by expanding the original,
# Mozilla's, and the upstream dictionary to remove affix flags and
# then doing the wordlist equivalent of diff3 to create a new
# dictionary.
#
# The files 2-mozilla-add and 2-mozilla-rem contain words added and
# removed, respectively in the Mozilla dictionary. The final
# dictionary will be in hunspell-en_US-mozilla.zip.

set -e
set -o pipefail

export LANG=C
export LC_ALL=C
export LC_CTYPE=C
export LC_COLLATE=C

WKDIR="`pwd`"
ORIG="$WKDIR/orig"
SUPPORT_DIR="$WKDIR/support_files"
SCOWL_DIR="$WKDIR/scowl"
SPELLER="$SCOWL_DIR/speller"

# Required by SCOWL scripts.
export SCOWL="$SCOWL_DIR"
export SCOWL_DB="$SCOWL_DIR/scowl.db"

# If the SCOWL clone is at a tagged release, surface that tag in the
# generated README via SCOWL_VERSION (read by SCOWL's HEADER.sh). Falls
# back to a short commit hash for non-tagged checkouts.
SCOWL_VERSION=`git -C "$SCOWL_DIR" describe --tags --always 2>/dev/null || true`
export SCOWL_VERSION

expand() {
  grep -v '^[0-9]\+$' | $SPELLER/munch-list expand $1 | sort -u
}

if [ ! -d "$SPELLER" ]; then
  echo "The 'scowl' folder is missing. Check the documentation at"
  echo "https://firefox-source-docs.mozilla.org/extensions/spellcheck/index.html"
  exit 1
fi

# SCOWLv2 stores its source data in a SQLite database that must be built
# before mk-list can run. Build it the first time, or whenever the user
# removed scowl.db to force a rebuild after refreshing the SCOWL checkout.
if [ ! -f "$SCOWL_DB" ]; then
  echo "Building $SCOWL_DB ..."
  (cd "$SCOWL_DIR" && make scowl.db)
fi

mkdir -p $SUPPORT_DIR
cd $SPELLER
MK_LIST="../mk-list -v1 --accents=both en_US 60"
cat <<EOF > params.txt
With Input Command: $MK_LIST
EOF
# Note: the output of make-hunspell-dict is UTF-8
$MK_LIST | ./make-hunspell-dict -one en_US-custom params.txt > ./make-hunspell-dict.log

if [ ! -s "$SPELLER/en_US-custom.dic" ]; then
  echo "ERROR: $SPELLER/en_US-custom.dic was not generated or is empty."
  echo "Inspect $SPELLER/make-hunspell-dict.log for upstream errors."
  exit 1
fi
cd $WKDIR

# Note: Input and output of "expand" is always ISO-8859-1.
#       All expanded word list files are thus in ISO-8859-1.
expand $SPELLER/en.aff < $SPELLER/en.dic.supp > $SUPPORT_DIR/0-special.txt

# Input is UTF-8, expand expects ISO-8859-1 so use iconv
iconv -f utf-8 -t iso-8859-1 $ORIG/en_US-custom.dic | expand $ORIG/en_US-custom.aff > $SUPPORT_DIR/1-base.txt

# Store suggestion exclusions (ending with !) defined in current Mozilla dictionary.
# Save both the compressed (munched) and expanded version.
grep '!$' ../en-US.dic > $SUPPORT_DIR/2-mozilla-nosug-munched.txt
expand ../en-US.aff < $SUPPORT_DIR/2-mozilla-nosug-munched.txt > $SUPPORT_DIR/2-mozilla-nosug.txt

# Remove suggestion exclusions and expand the existing Mozilla dictionary.
# The existing Mozilla dictionary is already in ISO-8859-1.
grep -v '!$' < ../en-US.dic > $SUPPORT_DIR/en-US-nosug.dic
expand ../en-US.aff < $SUPPORT_DIR/en-US-nosug.dic > $SUPPORT_DIR/2-mozilla.txt
rm $SUPPORT_DIR/en-US-nosug.dic

# Input is UTF-8, expand expects ISO-8859-1 so use iconv
iconv -f utf-8 -t iso-8859-1 $SPELLER/en_US-custom.dic | expand $SPELLER/en_US-custom.aff > $SUPPORT_DIR/3-upstream.txt

# Suppress common lines and lines only in the 2nd file, leaving words that are
# only available in the 1st file (SCOWL), i.e. were removed by Mozilla.
comm -23 $SUPPORT_DIR/1-base.txt $SUPPORT_DIR/2-mozilla.txt > $SUPPORT_DIR/2-mozilla-removed.txt

# Suppress common lines and lines only in the 1st file, leaving words that are
# only available in the 2nd file (current Mozilla dictionary), i.e. were added
# by Mozilla.
comm -13 $SUPPORT_DIR/1-base.txt $SUPPORT_DIR/2-mozilla.txt > $SUPPORT_DIR/2-mozilla-added.txt

# Suppress common lines and lines only in the 2nd file, leaving words that are
# only available in the 1st file (words from the new upstream SCOWL dictionary).
# The result is upstream, minus the words removed, plus the words added.
comm -23 $SUPPORT_DIR/3-upstream.txt $SUPPORT_DIR/2-mozilla-removed.txt | cat - $SUPPORT_DIR/2-mozilla-added.txt | sort -u > $SUPPORT_DIR/4-patched.txt

# Note: the output of make-hunspell-dict is UTF-8
cat $SUPPORT_DIR/4-patched.txt | comm -23 - $SUPPORT_DIR/0-special.txt | $SPELLER/make-hunspell-dict -one en_US-mozilla /dev/null

# Add back Mozilla suggestion exclusions and rewrite the count line.
python3 "$WKDIR/assemble-dic.py" en_US-mozilla.dic "$SUPPORT_DIR/2-mozilla-nosug-munched.txt"

# Sanity check should yield identical results
#comm -23 $SUPPORT_DIR/1-base.txt $SUPPORT_DIR/3-upstream.txt > $SUPPORT_DIR/3-upstream-remover.txt
#comm -13 $SUPPORT_DIR/1-base.txt $SUPPORT_DIR/3-upstream.txt > $SUPPORT_DIR/3-upstream-added.txt
#comm -23 $SUPPORT_DIR/2-mozilla.txt $SUPPORT_DIR/3-upstream-removed.txt | cat - $SUPPORT_DIR/3-upstream-added.txt | sort -u > $SUPPORT_DIR/4-patched-v2.txt

expand ../en-US.aff < mozilla-specific.txt > 5-mozilla-specific.txt

# Update Mozilla removed and added wordlists based on the new upstream
# dictionary, save them as UTF-8 and not ISO-8951-1.
# Ignore words excluded from suggestions for both files.
comm -12 $SUPPORT_DIR/3-upstream.txt $SUPPORT_DIR/2-mozilla-removed.txt > $SUPPORT_DIR/5-mozilla-removed-tmp.txt
comm -23 $SUPPORT_DIR/5-mozilla-removed-tmp.txt $SUPPORT_DIR/2-mozilla-nosug.txt > $SUPPORT_DIR/5-mozilla-removed.txt
rm $SUPPORT_DIR/5-mozilla-removed-tmp.txt
iconv -f iso-8859-1 -t utf-8 $SUPPORT_DIR/5-mozilla-removed.txt > 5-mozilla-removed.txt

comm -13 $SUPPORT_DIR/3-upstream.txt $SUPPORT_DIR/2-mozilla-added.txt > $SUPPORT_DIR/5-mozilla-added-tmp.txt
comm -23 $SUPPORT_DIR/5-mozilla-added-tmp.txt $SUPPORT_DIR/2-mozilla-nosug.txt > $SUPPORT_DIR/5-mozilla-added.txt
rm $SUPPORT_DIR/5-mozilla-added-tmp.txt
iconv -f iso-8859-1 -t utf-8 $SUPPORT_DIR/5-mozilla-added.txt > 5-mozilla-added.txt

# Clean up some files. With SCOWL_VERSION set, make-hunspell-dict suffixes
# the zip name with the version (e.g. hunspell-en_US-mozilla-rel-2026.02.25.zip).
rm -f hunspell-en_US-mozilla*.zip
rm -f nosug

# Remove backup folders in preparation for the install-new-dict script
FOLDERS=( "orig-bk" "mozilla-bk")
for f in ${FOLDERS[@]}; do
  if [ -d "$SUPPORT_DIR/$f" ]; then
    echo "Removing backup folder $f"
    rm -rf "$SUPPORT_DIR/$f"
  fi
done
