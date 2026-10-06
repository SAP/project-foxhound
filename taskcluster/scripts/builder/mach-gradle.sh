#!/bin/bash
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Script to run mach gradle in CI.
# Environment variables:
#   GRADLE_PROJECT - path to the gradle project (e.g., mobile/android/gradle/plugins/apilint)
#   GRADLE_ARGS - gradle arguments (e.g., test)
#   MACH_BUILD_EXPORTS (optional) - set to "1" to run ./mach build pre-export export

set -e
set -x

cd "$GECKO_PATH"

mozconfig=$(mktemp)
cat > "$mozconfig" <<EOF
# the corresponding geckoview's mozconfig, to pick up its config options
. $MOZCONFIG
# no-compile because we don't need to build native code here
. $GECKO_PATH/build/mozconfig.no-compile

# Disable Keyfile Loading (and checks)
# This overrides the settings in the common android mozconfig
ac_add_options --without-mozilla-api-keyfile
ac_add_options --without-google-safebrowsing-api-keyfile

ac_add_options --disable-nodejs
unset NODEJS
EOF

export GRADLE_MAVEN_REPOSITORIES="file://$MOZ_FETCHES_DIR/android-gradle-dependencies/mozilla,file://$MOZ_FETCHES_DIR/android-gradle-dependencies/google,file://$MOZ_FETCHES_DIR/android-gradle-dependencies/central,file://$MOZ_FETCHES_DIR/android-gradle-dependencies/gradle-plugins"
export MOZCONFIG="$mozconfig"

export MOZ_OBJDIR=/builds/worker/workspace/obj-build

./mach configure

if [ "$MACH_BUILD_EXPORTS" = "1" ]; then
    ./mach build pre-export export
fi

./mach gradle -p "$GRADLE_PROJECT" $GRADLE_ARGS
