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
SKIP_PATCHING=
SKIP_BUILD=
SKIP_PACKAGE=
RESET_GIT_REPO=
DRY_RUN=

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
  _status "Fetching Playwright and checking out ${PLAYWRIGHT_VERSION} branch"
  if [ -z "$DRY_RUN" ]; then
    pushd "${PLAYWRIGHT_DIR}" > /dev/null || _die "Can't change into playwright dir: ${PLAYWRIGHT_DIR}"
    git fetch --all || _die "Git fetch failed for Playwright"
    git checkout "${PLAYWRIGHT_VERSION}" || _die "Can't checkout playwright version ${PLAYWRIGHT_VERSION}.."
    popd > /dev/null || exit 1
  fi
}

_checkout_playwright() {
  _status "Cloning playwright into ${PLAYWRIGHT_DIR}"
  if [ -z "$DRY_RUN" ]; then
    git clone https://github.com/microsoft/playwright.git "${PLAYWRIGHT_DIR}" || _die "Cloning playwright failed!"
  fi
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
    if [ -z "$DRY_RUN" ]; then
      rm -rf "${FOXHOUND_DIR}/juggler"
    fi
  fi
  if [ ! -f "${FOXHOUND_DIR}/.mozconfig" ]; then
    _status "Setting default mozconfig from Ubuntu profile"
    if [ -z "$DRY_RUN" ]; then
      cp "${FOXHOUND_DIR}/taintfox_mozconfig_ubuntu" "${FOXHOUND_DIR}/.mozconfig"
    fi
  fi
  if [ -n "$RESET_GIT_REPO" ]; then
    _status "Resetting Git repository"
    if [ -z "$DRY_RUN" ]; then
      git reset --hard HEAD
    fi
  fi
  if [ -z "$NO_CLOBBER" ]; then
    _status "Clobbering the build environment"
    if [ -z "$DRY_RUN" ]; then
      ./mach --no-interactive clobber
    fi
  fi
  if [ -z "$SKIP_BOOTSTRAP" ]; then
    _status "Preparing environment via './mach bootstrap'"
    if [ -z "$DRY_RUN" ]; then
      ./mach --no-interactive bootstrap --no-system-changes --application-choice=browser || _die "Bootstrapping failed! You can install dependencies manually and skip this step via the '-b' flag"
    fi
  fi
  popd > /dev/null || exit 1
}

_patch_foxhound() {
  _status "Patching foxhound for playwright integration"
  pushd "${FOXHOUND_DIR}" > /dev/null || _die "Can't change into foxhound dir: ${FOXHOUND_DIR}"
  if [ -z "$DRY_RUN" ]; then
    cp -r "${PLAYWRIGHT_DIR}/browser_patches/firefox/juggler" "juggler"
    git apply --verbose --index --whitespace=nowarn --recount "${PLAYWRIGHT_DIR}/browser_patches/firefox/patches"/* || _die "Playwright patches failed to apply."
  fi
  if [ -n "$MAKE_GIT_COMMIT" ]; then
    _status "Creating Git commit"
    if [ -z "$DRY_RUN" ]; then
      _make_git_commit
    fi
  fi
  popd > /dev/null || exit 1
}

_build_foxhound() {
  pushd "${FOXHOUND_DIR}" > /dev/null || _die "Can't change into foxhound dir: ${FOXHOUND_DIR}"
  _status "Starting Foxhound build.. This can take a while"
  if [ -z "$DRY_RUN" ]; then
    ./mach build || _die "./mach build error"
  fi
  popd > /dev/null || exit 1
}

_package_foxhound() {
  pushd "${FOXHOUND_DIR}" > /dev/null || _die "Can't change into foxhound dir: ${FOXHOUND_DIR}"
 _status "Packaging foxhound.."

  if [ -z "$DRY_RUN" ]; then
    ./mach package || _die "./mach package error"
  fi

  if [ -n "$WITH_PLAYWRIGHT_INTEGRATION" ]; then
    _status "Applying playwright preferences"
    if [ -z "$DRY_RUN" ]; then
      mkdir -p "${FOXHOUND_OBJ_DIR}/dist/foxhound/defaults/pref"
      cp "${PLAYWRIGHT_DIR}/browser_patches/firefox/preferences/playwright.cfg" "${FOXHOUND_OBJ_DIR}/dist/foxhound/"
      cp "${PLAYWRIGHT_DIR}/browser_patches/firefox/preferences/00-playwright-prefs.js" "${FOXHOUND_OBJ_DIR}/dist/foxhound/defaults/pref/"
    fi
  fi
  _status "Creating Foxhound zip"
  if [ -z "$DRY_RUN" ]; then
    pushd "${FOXHOUND_OBJ_DIR}/dist" || exit 1
    zip -r foxhound_linux.zip foxhound
    if [ -n "$WITH_PLAYWRIGHT_INTEGRATION" ]; then
        cp foxhound_linux.zip "foxhound_linux_${PLAYWRIGHT_VERSION}.zip"
    fi
    _status "Zip located at '$(pwd  || true)/foxhound_linux.zip', done!"
    popd > /dev/null || exit 1
  fi
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
  if [[ -n "$WITH_PLAYWRIGHT_INTEGRATION" && ( -z "$SKIP_PREPARATION" && -z "$SKIP_PATCHING") ]]; then
    if [ -z "$SKIP_GIT_CHECK" ]; then
      _check_foxhound_repo_state
    fi

    _prepare_playwright
    _patch_foxhound
  fi
  _determine_obj_dir
  _status "Determined MOZ_OBJDIR as: $FOXHOUND_OBJ_DIR"
  if [ -z "$SKIP_BUILD" ]; then
      _build_foxhound
  fi
  if [ -z "$SKIP_PACKAGE" ]; then
     _package_foxhound
  fi
}

_help() {
   echo "Builds project foxhound"
   echo
   echo "Syntax: build.sh [-c|s|t|u|v|b|r|p|g|n|h]"
   echo
   echo "For example, to build from scratch with playwright:"
   echo "> bash build.sh -p"
   echo
   echo "options:"
   echo "c     Does not clobber the build prior to building."
   echo "s     Skip the preparation phase (i.e., avoid applying playwright patches again)."
   echo "t     Skip applying the playwright patches"
   echo "u     Skip the build itself"
   echo "v     Skip the packaging stage"
   echo "b     Skip './mach bootstrap' (This can help if the binaries are not available for download anymore)."
   echo "r     Resets the Git repository prior to building. This will delete any (uncommitted) changes you made!"
   echo "p     Builds with playwright integration."
   echo "g     Create a Git commit with the playwright patches."
   echo "n     Dry run. Only print the step the script would perform."
   echo "h     Print this Help."
   echo
   echo
   echo "Environment variables:"
   echo
   echo "These are meant to be used if you know what you are doing and can lead to states that are difficult to revert. Use with caution!"
   echo
   echo "SKIP_GIT_CHECK:"
   echo "If set to any value this skips the check whether the git repository is dirty."
   echo "Warning: When used together with Playwright support this can lead to a state where untangling the Playwright patches from your changes to commit them is very cumbersome!"
}

while getopts "hpcstuvrbgn" option; do
  case "$option" in
    h)
        _help
        exit;;
    b)
        SKIP_BOOTSTRAP=1;;
    r)
        RESET_GIT_REPO=1;;
    s)
        SKIP_PREPARATION=1;;
    t)
        SKIP_PATCHING=1;;
    u)
        SKIP_BUILD=1;;
    v)
        SKIP_PACKAGE=1;;
    c)
        NO_CLOBBER=1;;
    g)
        MAKE_GIT_COMMIT=1;;
    p)
        WITH_PLAYWRIGHT_INTEGRATION=1;;
    n)
        DRY_RUN=1;;
    \?)
        _die "Error: Invalid option: $option";;
  esac
done

main

