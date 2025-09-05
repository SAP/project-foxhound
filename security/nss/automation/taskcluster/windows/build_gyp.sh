#!/usr/bin/env bash

set -v -e -x

# Parse for the -t option.
m=x64
for i in "$@"; do
    case "$i" in
        -t|--target) m= ;;
        --target=*) m="${i#*=}" ;;
        *) [[ -z "$m" ]] && m="$i" ;;
    esac
done
[[ "$m" == "ia32" ]] && m=x86
source "$(dirname "$0")/setup.sh"

git clone https://chromium.googlesource.com/external/gyp

# Install GYP.
pushd gyp
python -m venv ./test-env
test-env/Scripts/python setup.py install
test-env/Scripts/python -m pip install --upgrade pip
test-env/Scripts/pip install --upgrade 'setuptools<45.0.0' six
# Fool GYP.
touch "${VSPATH}/VC/vcvarsall.bat"
export GYP_MSVS_OVERRIDE_PATH="${VSPATH}"
export GYP_MSVS_VERSION=2015
popd

export PATH="${PATH}:${PWD}/ninja/bin:${PWD}/gyp/test-env/Scripts"

test -v VCS_PATH

# builds write to the source dir (and its parent), so move the source trees to
# our workspace from the (cached) checkout dir
cp -a "${VCS_PATH}/nspr" "${VCS_PATH}/nss" .

pushd nspr
hg revert --all
if [[ -f ../nss/nspr.patch && "$ALLOW_NSPR_PATCH" == "1" ]]; then
  cat ../nss/nspr.patch | patch -p1
fi
popd

make () {
	mozmake "$@"
}
export -f make

# Build with gyp.
./nss/build.sh -g -v --enable-libpkix -Denable_draft_hpke=1 "$@"

# Package.
7z a public/build/dist.7z dist
