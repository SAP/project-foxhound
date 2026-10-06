#!/bin/sh
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/. */

set -e

# FIXME: This isn't going to work long-term.
if test "${ACTION}" != "clean"; then
    if [ -z "${GECKO_TOPOBJDIR}" ]; then
        GECKO_TOPOBJDIR=`"${GECKO_TOPSRCDIR}/mach" environment --format=json | python3 -c 'import sys, json; print(json.load(sys.stdin)["topobjdir"])'`
        if [ -z "${GECKO_TOPOBJDIR}" ]; then
            echo "Error: Could not determine GECKO_TOPOBJDIR"
        fi
    fi

    echo "Copying files from ${GECKO_TOPOBJDIR}/dist/bin"
    echo "Copying files to $BUILT_PRODUCTS_DIR/$CONTENTS_FOLDER_PATH/Frameworks"
    rsync -pvtrlL --delete --exclude "Test*" \
          --exclude "test_*" --exclude "*_unittest" \
          "${GECKO_TOPOBJDIR}/dist/bin/" "$BUILT_PRODUCTS_DIR/$CONTENTS_FOLDER_PATH/Frameworks"

    cp "${GECKO_TOPOBJDIR}/dist/include/GeckoView/"*.h "$BUILT_PRODUCTS_DIR/$CONTENTS_FOLDER_PATH/Headers/"

    for x in $BUILT_PRODUCTS_DIR/$CONTENTS_FOLDER_PATH/Frameworks/*.dylib $BUILT_PRODUCTS_DIR/$CONTENTS_FOLDER_PATH/Frameworks/XUL; do
        echo "Signing $x"
        codesign --force --sign "${EXPANDED_CODE_SIGN_IDENTITY}" --preserve-metadata=identifier,entitlements,resource-rules $x
    done
fi
