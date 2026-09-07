#!/bin/bash

function show_error_msg()
{
  echo "*** ERROR *** $? line $1 $0 did not complete successfully!"
  echo "$ERROR_HELP"
}
ERROR_HELP=""

# Print an Error message if `set -eE` causes the script to exit due to a failed command
trap 'show_error_msg $LINENO' ERR

source dom/media/webrtc/third_party_build/use_config_env.sh

if [ "x$PROCESS_DIR" = "x" ]; then
  PROCESS_DIR=third_party/libwebrtc
  echo "Default directory: $PROCESS_DIR"
fi

# All commands should be printed as they are executed
# set -x

# After this point:
# * eE: All commands should succede.
# * u: All variables should be defined before use.
# * o pipefail: All stages of all pipes should succede.
set -eEuo pipefail

find_repo_type
echo "repo type: $MOZ_REPO"

if [ ! -d $PROCESS_DIR ]; then
  echo "No directory found for '$PROCESS_DIR'"
  exit 1
fi

if [ "x$MOZ_REPO" == "xgit" ]; then
  BUILD_FILE_GIT_SPEC="$PROCESS_DIR/**moz.build"
  MOZ_BUILD_CHANGE_CNT=`git status --porcelain "$BUILD_FILE_GIT_SPEC" | wc -l | tr -d " "`
else
  MOZ_BUILD_CHANGE_CNT=`hg status --include="**moz.build" $PROCESS_DIR | wc -l | tr -d " "`
fi
echo "MOZ_BUILD_CHANGE_CNT: $MOZ_BUILD_CHANGE_CNT"
if [ "x$MOZ_BUILD_CHANGE_CNT" != "x0" ]; then
  if [ "x$MOZ_REPO" == "xgit" ]; then
    COMMIT_DESC=`git show --format='%s' --no-patch`
  else
    CURRENT_COMMIT_SHA=`hg id -i | sed 's/+//'`
    COMMIT_DESC=`hg --config alias.log=log log -T '{desc|firstline}' -r $CURRENT_COMMIT_SHA`
  fi

  # since we have build file changes, touch the CLOBBER file
  cat CLOBBER | grep -E "^#|^$" > CLOBBER.new
  mv CLOBBER.new CLOBBER
  echo "Modified build files in $PROCESS_DIR - $COMMIT_DESC" >> CLOBBER

  # handle added files
  if [ "x$MOZ_REPO" == "xgit" ]; then
    ADD_CNT=`git status --porcelain "$BUILD_FILE_GIT_SPEC" | grep "^??" | wc -l | tr -d " " || true`
    if [ "x$ADD_CNT" != "x0" ]; then
      git status --porcelain "$BUILD_FILE_GIT_SPEC" | grep "^??" | awk '{ print $2; }' | xargs git add
    fi
  else
    ADD_CNT=`hg status --include="**moz.build" -nu $PROCESS_DIR | wc -l | tr -d " "`
    if [ "x$ADD_CNT" != "x0" ]; then
      hg status --include="**moz.build" -nu $PROCESS_DIR | xargs hg add
    fi
  fi

  # handle deleted files
  if [ "x$MOZ_REPO" == "xgit" ]; then
    DEL_CNT=`git status --porcelain "$BUILD_FILE_GIT_SPEC" | grep "^ D" | wc -l | tr -d " " || true`
    if [ "x$DEL_CNT" != "x0" ]; then
      git status --porcelain "$BUILD_FILE_GIT_SPEC" | grep "^ D" | awk '{ print $2; }' | xargs git rm --quiet
    fi
  else
    DEL_CNT=`hg status --include="**moz.build" -nd $PROCESS_DIR | wc -l | tr -d " "`
    if [ "x$DEL_CNT" != "x0" ]; then
      hg status --include="**moz.build" -nd $PROCESS_DIR | xargs hg rm
    fi
  fi

  # handle modified files - mercurial doesn't need this
  if [ "x$MOZ_REPO" == "xgit" ]; then
    MOD_CNT=`git status --porcelain "$BUILD_FILE_GIT_SPEC" CLOBBER | grep "^ M" | wc -l | tr -d " " || true`
    if [ "x$MOD_CNT" != "x0" ]; then
      git status --porcelain "$BUILD_FILE_GIT_SPEC" CLOBBER | grep "^ M" | awk '{ print $2; }' | xargs git add
    fi
  fi

  if [ "x$MOZ_REPO" == "xgit" ]; then
    git commit -m "$COMMIT_DESC - moz.build file updates"
  else
    hg commit -m \
      "$COMMIT_DESC - moz.build file updates" \
      --include="**moz.build" --include="CLOBBER" $PROCESS_DIR CLOBBER
  fi
fi

echo "Done in $0"
