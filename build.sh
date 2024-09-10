#!/bin/bash

CURRENT_DIR=$(dirname "$(readlink -f "$0" || exit 1)")
BASEDIR=$(realpath "${CURRENT_DIR}/..")

RED=$(tput setaf 1)
POWDER_BLUE=$(tput setaf 153)
NORMAL=$(tput sgr0)

_die() {
    [[ -n $1 ]] || {
        printf >&2 -- 'Usage:\n\t_die <message> [return code]\n'
        [[ $- == *i* ]] && return 1 || exit 1
    }

    printf >&2 -- '%s\n' "${RED}$1${NORMAL}"
    exit "${2:-1}"
}

_status() {
  echo -e "${POWDER_BLUE}${1}${NORMAL}"
}

# Shared variables
FOXHOUND_OBJ_DIR=
FOXHOUND_DIR=
PLAYWRIGHT_DIR=
PLAYWRIGHT_VERSION=
WITH_PLAYWRIGHT_INTEGRATION=
NO_CLOBBER=
MAKE_GIT_COMMIT=
SKIP_PREPARATION=
SKIP_BOOTSTRAP=
RESET_GIT_REPO=

_determine_obj_dir() {
  if [ ! -d "${FOXHOUND_OBJ_DIR}" ]; then
      OBJ_DIR="$(grep -v -e "^#" "${FOXHOUND_DIR}/.mozconfig" | grep "MOZ_OBJDIR=@TOPSRCDIR@" | cut -d "/" -f 2)"
      if [ -z "${OBJ_DIR}" ]; then
        _die "Unable to determine object directory from mozconfig, should be called MOZ_OBJDIR"
      fi
      #_status "FOXHOUND_OBJ_DIR not set, suggesting to set it to: '${OBJ_DIR}'" 1
    fi
    FOXHOUND_OBJ_DIR="$OBJ_DIR"
}

_make_git_commit() {
  pushd "${FOXHOUND_DIR}" > /dev/null || _die "Can't change into foxhound dir: ${FOXHOUND_DIR}"
  NEW_BRANCHNAME="pw-build-$(date +%s)" 
  git switch -c "${NEW_BRANCHNAME}" || _die "Can't create new Git branch called: ${NEW_BRANCHNAME}"
  git add .
  git commit --author="Foxhound builder <foxhound@whereismymind.info>" --message="Added Playwright support to Foxhound."
  popd > /dev/null || exit 1
}

_prepare_playwright() {
  pushd "${FOXHOUND_DIR}" > /dev/null || _die "Can't change into foxhound dir: ${FOXHOUND_DIR}"
  if [ ! -f "${CURRENT_DIR}/.PLAYWRIGHT_VERSION" ]; then
    _die "Can not determine playwright version, as \".PLAYWRIGHT_VERSION\" file is missing. Please open an issue on Github!"
  fi
  . "${CURRENT_DIR}/.PLAYWRIGHT_VERSION"
  _status "Set playwright version to: ${PLAYWRIGHT_VERSION}"
  popd > /dev/null || exit 1
  pushd "${PLAYWRIGHT_DIR}" > /dev/null || _die "Can't change into playwright dir: ${PLAYWRIGHT_DIR}"
  git fetch --all || _die "Git fetch failed for Playwright"
  git checkout "${PLAYWRIGHT_VERSION}" || _die "Can't checkout playwright version ${PLAYWRIGHT_VERSION}.."
  popd > /dev/null || exit 1
}

_checkout_playwright() {
  _status "Cloning playwright into ${PLAYWRIGHT_DIR}"
  git clone https://github.com/microsoft/playwright.git "${PLAYWRIGHT_DIR}" || _die "Cloning playwright failed!"
}

_check_foxhound_repo_state() {
  pushd "${FOXHOUND_DIR}" > /dev/null || _die "Can't change into foxhound dir: ${FOXHOUND_DIR}"
 test -z "$(git status --porcelain)" || _die "Dirty Worktree, please commit all changes before running the build script!"
  popd > /dev/null || exit 1
}

_prepare_foxhound() {
  pushd "${FOXHOUND_DIR}" > /dev/null || _die "Can't change into foxhound dir: ${FOXHOUND_DIR}"
 _status "Preparing the foxhound build environment"
  if [ -d "./juggler" ]; then
    _status "Deleting stale juggler"
    rm -rf "${FOXHOUND_DIR}/juggler"
  fi
  if [ ! -f "${FOXHOUND_DIR}/.mozconfig" ]; then
    _status "Setting default mozconfig from Ubuntu profile"
    cp "${FOXHOUND_DIR}/taintfox_mozconfig_ubuntu" "${FOXHOUND_DIR}/.mozconfig" 
  fi
  if [ -n "$RESET_GIT_REPO" ]; then
    _status "Resetting Git repository"
    git reset --hard HEAD
  fi
  if [ -z "$NO_CLOBBER" ]; then
    _status "Clobbering the build environment"
    ./mach --no-interactive clobber
  fi
  if [ -z "$SKIP_BOOTSTRAP" ]; then
    _status "Preparing environment via './mach bootstrap'"
    ./mach --no-interactive bootstrap --no-system-changes --application-choice=browser || _die "Bootstrapping failed! You can install dependencies manually and skip this step via the '-b' flag"
  fi
  popd > /dev/null || exit 1
}

_patch_foxhound() {
  _status "Patching foxhound for playwright integration"
  pushd "${FOXHOUND_DIR}" > /dev/null || _die "Can't change into foxhound dir: ${FOXHOUND_DIR}"
  cp -r "${PLAYWRIGHT_DIR}/browser_patches/firefox/juggler" "juggler"
  git apply --verbose --index --whitespace=nowarn --recount "${PLAYWRIGHT_DIR}/browser_patches/firefox/patches"/* || _die "Playwright patches failed to apply."
  if [ -n "$MAKE_GIT_COMMIT" ]; then
    _status "Creating Git commit"
    _make_git_commit
  fi
  popd > /dev/null || exit 1
}

_build_foxhound() {
  pushd "${FOXHOUND_DIR}" > /dev/null || _die "Can't change into foxhound dir: ${FOXHOUND_DIR}"
  ./mach build || _die "./mach build error"
  popd > /dev/null || exit 1
}

_package_foxhound() {
  pushd "${FOXHOUND_DIR}" > /dev/null || _die "Can't change into foxhound dir: ${FOXHOUND_DIR}"
 _status "Packaging foxhound.."
  ./mach package || _die "./mach package error"

  if [ -n "$WITH_PLAYWRIGHT_INTEGRATION" ]; then
    mkdir -p "${FOXHOUND_OBJ_DIR}/dist/foxhound/defaults/pref"
    cp "${PLAYWRIGHT_DIR}/browser_patches/firefox/preferences/playwright.cfg" "${FOXHOUND_OBJ_DIR}/dist/foxhound/"
    cp "${PLAYWRIGHT_DIR}/browser_patches/firefox/preferences/00-playwright-prefs.js" "${FOXHOUND_OBJ_DIR}/dist/foxhound/defaults/pref/"
  fi
  pushd "${FOXHOUND_OBJ_DIR}/dist" || exit 1
  zip -r foxhound_linux.zip foxhound
  _status "Zip located at '$(pwd  || true)/foxhound_linux.zip', done!"
  popd > /dev/null || exit 1
  popd > /dev/null || exit 1
}



main() {
  FOXHOUND_DIR="${CURRENT_DIR}"
  PLAYWRIGHT_DIR="${BASEDIR}/playwright"
  if [ -z "$SKIP_PREPARATION" ] && [ -n "$WITH_PLAYWRIGHT_INTEGRATION" ] && [ ! -d "${PLAYWRIGHT_DIR}" ]; then
    _checkout_playwright
  fi
  if [ -z "$SKIP_PREPARATION" ]; then
    _prepare_foxhound
  fi
  if [ -n "$WITH_PLAYWRIGHT_INTEGRATION" ] && [ -z "$SKIP_PREPARATION" ]; then
    _check_foxhound_repo_state
    _prepare_playwright
    _patch_foxhound
  fi
  _determine_obj_dir
  _status "Determined MOZ_OBJDIR as: $FOXHOUND_OBJ_DIR"
  _build_foxhound
  _package_foxhound
}

_help() {
   echo "Builds project foxhound"
   echo
   echo "Syntax: build.sh [-h|c|p|b|r|g|s]"
   echo "options:"
   echo "c     Does not clobber the build prior to building."
   echo "s     Skip the preparation phase (i.e., avoid applying playwright patches again)."
   echo "b     Skip './mach bootstrap' (This can help if the binaries are not available for download anymore)."
   echo "r     Resets the Git repository prior to building. This will delete any (uncommitted) changes you made!"
   echo "p     Builds with playwright integration."
   echo "g     Create a Git commit with the playwright patches."
   echo "h     Print this Help."
   echo
}

while getopts "hpcsrbg" option; do
  case $option in
    h)
        _help
        exit;;
    b) 
        SKIP_BOOTSTRAP=1;;
    r) 
        RESET_GIT_REPO=1;;
    s) 
        SKIP_PREPARATION=1;;
    c) 
        NO_CLOBBER=1;;
    g) 
        MAKE_GIT_COMMIT=1;;
    p) 
        WITH_PLAYWRIGHT_INTEGRATION=1;;
    \?) 
        echo "Error: Invalid option"
        exit;;
  esac
done

main

