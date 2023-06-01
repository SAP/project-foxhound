#!/bin/bash

# This script exists to help with the rebase process on elm.  It rebases
# each patch individually to make it easier to fix rebase conflicts
# without jeopardizing earlier, sucessfully rebased commits. In order to
# limit rebase conflicts around generated moz.build files, it regenerates
# moz.build file commits.  It also ensures any commits with 'FLOAT' in the
# commit summary are pushed to the top of the fast-forward stack to help
# the sheriffs more easily merge our commit stack from elm to moz-central.
#
# Occasionally, there will be upstream vendored commits that break the
# build file generation with follow on commits that fix that error. In
# order to allow the rebase process to work more smoothly, it is possible
# to annotate a commit with the string '(skip-generation)' and normal
# build file generation (detected with changes to BUILD.gn files) is
# disabled for that commit.  The script outputs instructions for handling
# this situation.
#
# Note: the very first rebase operation will require some manual
# intervention. The user will need to provide, at minimum, the commit that
# corresponds to moz-central upon which the fast-forward stack is based.
# It may also be necessary to provide the first commit of the
# fast-forward stack.  Example:
#   MOZ_BOTTOM_FF=30f0afb7e4c5 \
#   MOZ_CURRENT_CENTRAL=cad1bd47c273 \
#   bash dom/media/webrtc/third_party_build/elm_rebase.sh
#
# Assumes the top of the fast-forward stack to rebase is tip.

function show_error_msg()
{
  echo "*** ERROR *** $? line $1 $0 did not complete successfully!"
  echo "$ERROR_HELP"
}
ERROR_HELP=""

# Print an Error message if `set -eE` causes the script to exit due to a failed command
trap 'show_error_msg $LINENO' ERR

source dom/media/webrtc/third_party_build/use_config_env.sh

GENERATION_ERROR=$"
Generating build files has failed.  The most common reason for this
failure is that the current commit has an upcoming '(fix-xxxxxx)' commit
that will then allow the build file generation to complete.  If the
current situation seems to fit that pattern, adding a line with
'(skip-generation)' to the commit message will ensure that future rebase
operations do not attempt to generate build files for this commit.  It may
be as simple as running the following commands:
  HGPLAIN=1 hg log -T '{desc}' -r tip > $TMP_DIR/commit_message.txt
  ed -s $TMP_DIR/commit_message.txt <<< $'3i\n(skip-generation)\n\n.\nw\nq'
  hg commit --amend -l $TMP_DIR/commit_message.txt
  bash $0
"
COMMIT_LIST_FILE=$TMP_DIR/rebase-commit-list.txt
export HGPLAIN=1

# After this point:
# * eE: All commands should succeed.
# * o pipefail: All stages of all pipes should succeed.
set -eEo pipefail

if [ -f $STATE_DIR/rebase_resume_state ]; then
  source $STATE_DIR/rebase_resume_state
else
MOZ_TOP_FF=`hg log -r tip -T"{node|short}"`

ERROR_HELP=$"
An error here is likely because no revision for central is found.
One possible reason for this is this is your first rebase operation.
To 'bootstrap' the first rebase operation, please find the
moz-central commit that the vendoring commits is based on, and
rerun the command:
  MOZ_CURRENT_CENTRAL={central-sha} bash $0

You may also need to provide the bottom commit of the fast-forward
stack.  The bottom commit means the commit following central.  This
could be the sha of the .arcconfig commit if it is the bottom commit.
That command looks like:
  MOZ_BOTTOM_FF={base-sha} MOZ_CURRENT_CENTRAL={central-sha} bash $0
"
if [ "x" == "x$MOZ_CURRENT_CENTRAL" ]; then
  MOZ_CURRENT_CENTRAL=`hg log -r central -T"{node|short}"`
fi
if [ "x" == "x$MOZ_BOTTOM_FF" ]; then
  MOZ_BOTTOM_FF=`hg log -r $MOZ_CURRENT_CENTRAL~-1 -T"{node|short}"`
fi
ERROR_HELP=""

if [ "x" == "x$MOZ_BOTTOM_FF" ]; then
  echo "No value found for the bottom commit of the fast-forward commit stack."
  exit 1
fi

# After this point:
# * eE: All commands should succeed.
# * u: All variables should be defined before use.
# * o pipefail: All stages of all pipes should succeed.
set -eEuo pipefail

hg pull central
MOZ_NEW_CENTRAL=`hg log -r central -T"{node|short}"`

echo "moz-central in elm is currently $MOZ_CURRENT_CENTRAL"
echo "bottom of fast-foward tree is $MOZ_BOTTOM_FF"
echo "top of fast-forward tree (webrtc-fast-forward) is $MOZ_TOP_FF"
echo "new target for elm rebase $MOZ_NEW_CENTRAL (tip of moz-central)"

hg log -T '{rev}:{node|short} {desc|firstline}\n' \
    -r $MOZ_BOTTOM_FF::$MOZ_TOP_FF > $COMMIT_LIST_FILE

# move all FLOAT lines to end of file, and delete the "empty" tilde line
# line at the beginning
ed -s $COMMIT_LIST_FILE <<< $'g/- FLOAT -/m$\ng/^~$/d\nw\nq'

MOZ_BOOKMARK=`date "+webrtc-fast-forward-%Y-%m-%d--%H-%M"`
hg bookmark $MOZ_BOOKMARK

hg update $MOZ_NEW_CENTRAL

# pre-work is complete, let's write out a temporary config file that allows
# us to resume
echo $"export MOZ_CURRENT_CENTRAL=$MOZ_CURRENT_CENTRAL
export MOZ_BOTTOM_FF=$MOZ_BOTTOM_FF
export MOZ_TOP_FF=$MOZ_TOP_FF
export MOZ_NEW_CENTRAL=$MOZ_NEW_CENTRAL
export MOZ_BOOKMARK=$MOZ_BOOKMARK
" > $STATE_DIR/rebase_resume_state
fi

# grab all commits
COMMITS=`cat $COMMIT_LIST_FILE | awk '{print $1;}'`

echo -n "Commits: "
for commit in $COMMITS; do
echo -n "$commit "
done
echo ""

for commit in $COMMITS; do
  echo "Processing $commit"
  FULL_COMMIT_LINE=`head -1 $COMMIT_LIST_FILE`
  echo "Removing from list '$FULL_COMMIT_LINE'"
  ed -s $COMMIT_LIST_FILE <<< $'1d\nw\nq'

  IS_BUILD_COMMIT=`hg log -T '{desc|firstline}' -r $commit \
                   | grep "file updates" | wc -l | tr -d " " || true`
  echo "IS_BUILD_COMMIT: $IS_BUILD_COMMIT"
  if [ "x$IS_BUILD_COMMIT" != "x0" ]; then
    echo "Skipping $commit:"
    hg log -T '{desc|firstline}' -r $commit
    continue
  fi

  IS_SKIP_GEN_COMMIT=`hg log --verbose \
                         -r $commit \
                      | grep "skip-generation" | wc -l | tr -d " " || true`
  echo "IS_SKIP_GEN_COMMIT: $IS_SKIP_GEN_COMMIT"

  echo "Generate patch for: $commit"
  hg export -r $commit > $TMP_DIR/rebase.patch

  echo "Import patch for $commit"
  hg import $TMP_DIR/rebase.patch || \
  ( hg log -T '{desc}' -r $commit > $TMP_DIR/rebase_commit_message.txt ; \
    echo "Error importing: '$FULL_COMMIT_LINE'" ; \
    echo "Please fix import errors, then:" ; \
    echo "  hg commit -l $TMP_DIR/rebase_commit_message.txt" ; \
    echo "  bash $0" ; \
    exit 1 )

  if [ "x$IS_SKIP_GEN_COMMIT" != "x0" ]; then
    echo "Skipping build generation for $commit"
    continue
  fi

  MODIFIED_BUILD_RELATED_FILE_CNT=`hg diff -c tip --stat \
      --include 'third_party/libwebrtc/**BUILD.gn' \
      --include 'third_party/libwebrtc/webrtc.gni' \
      --include 'dom/media/webrtc/third_party_build/gn-configs/webrtc.json' \
      | wc -l | tr -d " "`
  echo "MODIFIED_BUILD_RELATED_FILE_CNT: $MODIFIED_BUILD_RELATED_FILE_CNT"
  if [ "x$MODIFIED_BUILD_RELATED_FILE_CNT" != "x0" ]; then
    echo "Regenerate build files"
    ./mach python python/mozbuild/mozbuild/gn_processor.py \
        dom/media/webrtc/third_party_build/gn-configs/webrtc.json || \
    ( echo "$GENERATION_ERROR" ; exit 1 )

    MOZ_BUILD_CHANGE_CNT=`hg status third_party/libwebrtc \
        --include 'third_party/libwebrtc/**moz.build' | wc -l | tr -d " "`
    if [ "x$MOZ_BUILD_CHANGE_CNT" != "x0" ]; then
      bash dom/media/webrtc/third_party_build/commit-build-file-changes.sh
      NEWEST_COMMIT=`hg log -T '{desc|firstline}' -r tip`
      echo "NEWEST_COMMIT: $NEWEST_COMMIT"
      echo "NEWEST_COMMIT: $NEWEST_COMMIT" >> $LOG_DIR/rebase-build-changes-commits.log
    fi
    echo "Done generating build files"
  fi

  echo "Done processing $commit"
done

rm $STATE_DIR/rebase_resume_state

REMAINING_STEPS=$"
The rebase process is complete.  The following steps must be completed manually:
  ./mach bootstrap --application=browser --no-system-changes
  ./mach build
  hg push -r tip --force
  hg push -B $MOZ_BOOKMARK
"
echo "$REMAINING_STEPS"
