#!/bin/bash

# Publish script to be called by `npm publish` and not manually.
# See README.md
# This script will introduce changed which are going to be reverted
# automatically by `npm publish` by calling `publish-cleanup.sh`.

# Replace all ES Module import URL which only works within Firefox
# and make them compatible with Node environment.

if [ -n "$(git status -s -uno)" ]; then
  echo "It looks like you have pending changes in reps/ folder."
  echo "You have to commit or reset them before running this command"
  exit 1
fi

for file in $(find . -name "*.mjs"); do
  sed -i -E 's#resource://devtools/client/shared/vendor/react.mjs#react#g' "$file"
  sed -i -E 's#resource://devtools/client/shared/vendor/react-dom-factories.mjs#react-dom-factories#g' "$file"
  sed -i -E 's#resource://devtools/client/shared/vendor/react-prop-types.mjs#prop-types#g' "$file"
done

if git grep "resource://devtools/client/shared/vendor/" "**.mjs"; then
  echo "It looks like a new vendor module is used and should be handled by publish.sh";
  exit 1
fi

# Also remove all css declarations refering to a chrome URL
# (these chrome files aren't shipped in the npm package anyway)
for file in $(find . -name "*.css"); do
  sed -i '/chrome/d' "$file"
done
