#!/bin/bash -vex

set -x -e

echo "running as" $(id)

set -v

cd $GECKO_PATH

. taskcluster/scripts/misc/android-gradle-dependencies/before.sh

export MOZCONFIG=mobile/android/config/mozconfigs/android-arm-gradle-dependencies/nightly
./mach build

# After the `mach build` invocation!
export GRADLE_FLAGS="--no-configuration-cache --write-verification-metadata sha256 --dry-run"

./mach android gradle-dependencies
./mach gradle -p mobile/android/fenix lint :benchmark:assembleBenchmark
./mach gradle -p mobile/android/focus-android lint
./mach gradle -p mobile/android/android-components -Pcoverage detekt lint :components:tooling-lint:test :components:lib-auth:assemble :components:lib-auth:assembleAndroidTest :components:lib-auth:testRelease :components:lib-auth:lintRelease :components:lib-auth:publish

. taskcluster/scripts/misc/android-gradle-dependencies/after.sh
