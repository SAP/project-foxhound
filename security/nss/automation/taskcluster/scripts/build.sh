#!/usr/bin/env bash

source $(dirname "$0")/tools.sh

if [ -n "$NSS_BUILD_MODULAR" ]; then
    $(dirname "$0")/build_nspr.sh || exit $?
    $(dirname "$0")/build_util.sh || exit $?
    $(dirname "$0")/build_softoken.sh || exit $?
    $(dirname "$0")/build_nss.sh || exit $?
    exit
fi

# Clone NSPR if needed.
hg_clone https://hg.mozilla.org/projects/nspr ./nspr default

pushd nspr
hg revert --all
if [[ -f ../nss/nspr.patch && "$ALLOW_NSPR_PATCH" == "1" ]]; then
  cat ../nss/nspr.patch | patch -p1
fi
popd

# Build.
make -C nss nss_build_all

# Package.
mkdir artifacts
tar cvfjh artifacts/dist.tar.bz2 dist
