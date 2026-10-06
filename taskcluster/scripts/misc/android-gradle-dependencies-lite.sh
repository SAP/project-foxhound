#!/bin/bash -vex

set -x -e

echo "running as" $(id)

set -v

cd $GECKO_PATH

. taskcluster/scripts/misc/android-gradle-dependencies/before.sh

export MOZCONFIG=mobile/android/config/mozconfigs/android-arm-gradle-dependencies/nightly-lite
./mach build

# After the `mach build` invocation!
export GRADLE_FLAGS="--no-configuration-cache --write-verification-metadata sha256 --dry-run"

./mach android gradle-dependencies

. taskcluster/scripts/misc/android-gradle-dependencies/after.sh
