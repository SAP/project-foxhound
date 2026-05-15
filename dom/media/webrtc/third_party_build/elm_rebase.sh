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
# Note: the very first rebase operation may require some manual
# intervention. The user will need to provide, at minimum, the first
# commit of the fast-forward stack if the script is unable to determine
# it automatically.  Example:
#   MOZ_BOTTOM_FF=30f0afb7e4c5 \
#   bash dom/media/webrtc/third_party_build/elm_rebase.sh
#
# Assumes the top of the fast-forward stack to rebase is the current revision,
# ".".

function show_error_msg()
{
  echo "*** ERROR *** $? line $1 $0 did not complete successfully!"
  echo "$ERROR_HELP"
}
ERROR_HELP=""

# Print an Error message if `set -eE` causes the script to exit due to a failed command
trap 'show_error_msg $LINENO' ERR

source dom/media/webrtc/third_party_build/use_config_env.sh

find_repo_type
echo "repo type: $MOZ_REPO"

GENERATION_ERROR=$"
Generating build files has failed.  The most common reason for this
failure is that the current commit has an upcoming '(fix-xxxxxx)' commit
that will then allow the build file generation to complete.  If the
current situation seems to fit that pattern, adding a line with
'(skip-generation)' to the commit message will ensure that future rebase
operations do not attempt to generate build files for this commit.  It may
be as simple as running the following commands:"
if [ "x$MOZ_REPO" = "xgit" ]; then
GENERATION_FIX_TEXT=$"
  git show --no-patch --format='%B' > $TMP_DIR/commit_message.txt
  ed -s $TMP_DIR/commit_message.txt <<< $'3i\n(skip-generation)\n\n.\nw\nq'
  git commit --amend -F $TMP_DIR/commit_message.txt
  bash $0
"
else
GENERATION_FIX_TEXT=$"
  HGPLAIN=1 hg log -T '{desc}' -r tip > $TMP_DIR/commit_message.txt
  ed -s $TMP_DIR/commit_message.txt <<< $'3i\n(skip-generation)\n\n.\nw\nq'
  hg commit --amend -l $TMP_DIR/commit_message.txt
  bash $0
"
fi

COMMIT_LIST_FILE=$TMP_DIR/rebase-commit-list.txt
export HGPLAIN=1

if [ "x$MOZ_TOP_FF" = "x" ]; then
  MOZ_TOP_FF=""
fi
if [ "x$MOZ_BOTTOM_FF" = "x" ]; then
  MOZ_BOTTOM_FF=""
fi
if [ "x$STOP_FOR_REORDER" = "x" ]; then
  STOP_FOR_REORDER=""
fi

# After this point:
# * eE: All commands should succeed.
# * u: All variables should be defined before use.
# * o pipefail: All stages of all pipes should succeed.
set -eEuo pipefail

# always make sure the repo is clean before doing the rebase
if [ "x$MOZ_REPO" = "xgit" ]; then
  CHANGED_FILE_CNT=`git status --porcelain | wc -l | tr -d " "`
else
  CHANGED_FILE_CNT=`hg status | wc -l | tr -d " "`
fi
if [ "x$CHANGED_FILE_CNT" != "x0" ]; then
  echo "There are modified or untracked files in the repo."
  echo "Please cleanup the repo before running"
  echo "$0"
  exit 1
fi

RESUME_FILE=$STATE_DIR/elm_rebase.resume
if [ -f $RESUME_FILE ]; then
  source $RESUME_FILE
else

  # on first run, we want to verify sanity of the patch-stack so
  # ending guidance is appropriate regarding changes in
  # third_party/libwebrtc between the old central we're currently
  # based on and the new central we're rebasing onto.
  echo "Restoring patch-stack..."
  ./mach python $SCRIPT_DIR/restore_patch_stack.py --repo-path $MOZ_LIBWEBRTC_SRC
  echo "Verify vendoring..."
  ERROR_HELP=$"When verify_vendoring.sh is successful, run the following in bash:
  (source $SCRIPT_DIR/use_config_env.sh ;
   ./mach python $SCRIPT_DIR/save_patch_stack.py \\
    --repo-path $MOZ_LIBWEBRTC_SRC \\
    --target-branch-head $MOZ_TARGET_UPSTREAM_BRANCH_HEAD  \\
    --separate-commit-bug-number $MOZ_FASTFORWARD_BUG )

Then resume running this script:
  bash $0
"
  bash $SCRIPT_DIR/verify_vendoring.sh || (echo "$ERROR_HELP" ; exit 1)
  ERROR_HELP=""

  if [ "x" == "x$MOZ_TOP_FF" ]; then
    if [ "x$MOZ_REPO" = "xgit" ]; then
      echo "When running under the firefox git repo, please provide the topmost"
      echo "commit on the command line:"
      echo "  MOZ_TOP_FF={sha} bash $0"
      exit 1
    else
      MOZ_TOP_FF=`hg log -r . -T"{node|short}"`
    fi

    ERROR_HELP=$"
The topmost commit to be rebased is not in the public phase. Should it be
pushed to elm first? If this is intentional, please rerun the command and pass
it in explicitly:
  MOZ_TOP_FF=$MOZ_TOP_FF bash $0
"
    if [[ $(hg phase -r .) != *public ]]; then
      echo "$ERROR_HELP"
      exit 1
    fi
    ERROR_HELP=""

    ERROR_HELP=$"
The topmost commit to be rebased is public but has descendants. If those
descendants should not be rebased, please rerun the command and pass the commit
in explicitly:
  MOZ_TOP_FF=$MOZ_TOP_FF bash $0
"
    if [ "x" != "x$(hg log -r 'descendants(.) and !.' -T'{node|short}')" ]; then
      echo "$ERROR_HELP"
      exit 1
    fi
    ERROR_HELP=""
  fi

  if [ "x$MOZ_REPO" = "xgit" ]; then
    echo "given MOZ_TOP_FF: $MOZ_TOP_FF"
    # make sure MOZ_TOP_FF is a hash and not a branch name or HEAD
    MOZ_TOP_FF=`git rev-parse --short $MOZ_TOP_FF`
    echo "converted MOZ_TOP_FF: $MOZ_TOP_FF"
  fi

  if [ "x$MOZ_REPO" = "xgit" ]; then
    git checkout main
    git pull --rebase
  else
    hg pull central
  fi

  ERROR_HELP=$"
Automatically determining the bottom (earliest) commit of the fast-forward
stack has failed.  Please provide the bottom commit of the fast-forward
stack.  The bottom commit means the commit following the most recent
mozilla-central commit.  This could be the sha of the .arcconfig commit
if it is the bottom commit.
That command looks like:
  MOZ_BOTTOM_FF={base-sha} bash $0
"
  if [ "x" == "x$MOZ_BOTTOM_FF" ]; then
    if [ "x$MOZ_REPO" = "xgit" ]; then
      MOZ_OLD_CENTRAL=`git merge-base main $MOZ_TOP_FF`
      MOZ_BOTTOM_FF=`git log --format='%h' $MOZ_OLD_CENTRAL..$MOZ_TOP_FF | tail -1`
    else
      # Finds the common ancestor between our top fast-forward commit and
      # mozilla-central using:
      #    ancestor($MOZ_TOP_FF, central)
      MOZ_OLD_CENTRAL=`hg id --id --rev "ancestor($MOZ_TOP_FF, central)"`
      # Using that ancestor and $MOZ_TOP_FF as a range, find the commit _after_
      # the the common commit using limit(range, 1, 1) which gives the first
      # commit of the range, offset by one commit.
      MOZ_BOTTOM_FF=`hg id --id --rev "limit($MOZ_OLD_CENTRAL::$MOZ_TOP_FF, 1, 1)"`
    fi
  fi
  if [ "x" == "x$MOZ_BOTTOM_FF" ]; then
    echo "No value found for the bottom commit of the fast-forward commit stack."
    echo "$ERROR_HELP"
    exit 1
  fi
  ERROR_HELP=""

  if [ "x$MOZ_REPO" = "xgit" ]; then
    MOZ_NEW_CENTRAL=`git show --format='%h' --no-patch main`
  else
    MOZ_NEW_CENTRAL=`hg log -r central -T"{node|short}"`
  fi

  echo "bottom of fast-foward tree is $MOZ_BOTTOM_FF"
  echo "top of fast-forward tree (webrtc-fast-forward) is $MOZ_TOP_FF"
  echo "new target for elm rebase $MOZ_NEW_CENTRAL (tip of moz-central)"

  if [ "x$MOZ_REPO" = "xgit" ]; then
    git log --reverse --oneline -r $MOZ_BOTTOM_FF^..$MOZ_TOP_FF > $COMMIT_LIST_FILE
  else
    hg log -T '{rev}:{node|short} {desc|firstline}\n' \
        -r $MOZ_BOTTOM_FF::$MOZ_TOP_FF > $COMMIT_LIST_FILE
  fi

  # move all FLOAT lines to end of file, and delete the "empty" tilde line
  # line at the beginning
  ed -s $COMMIT_LIST_FILE <<< $'g/- FLOAT -/m$\ng/^~$/d\nw\nq'

  MOZ_BOOKMARK=`date "+webrtc-fast-forward-%Y-%m-%d--%H-%M"`
  if [ "x$MOZ_REPO" = "xgit" ]; then
    git branch $MOZ_BOOKMARK $MOZ_TOP_FF
  else
    hg bookmark -r elm $MOZ_BOOKMARK
  fi

  if [ "x$MOZ_REPO" = "xgit" ]; then
    MOZ_REBASE_BRANCH=`date "+rebase-%Y-%m-%d--%H-%M"`
    git checkout -b $MOZ_REBASE_BRANCH $MOZ_NEW_CENTRAL
  else
    hg update $MOZ_NEW_CENTRAL
  fi

  ERROR_HELP=$"
Running ./mach bootstrap has failed.  For details, see:
$LOG_DIR/log-bootstrap.txt
"
  echo "Running ./mach bootstrap..."
  ./mach bootstrap --application=browser --no-system-changes &> $LOG_DIR/log-bootstrap.txt
  echo "Done running ./mach bootstrap"
  ERROR_HELP=""

  echo "Running ./mach clobber..."
  ./mach clobber &> $LOG_DIR/log-sanity-clobber.txt
  echo "Done running ./mach clobber"

  # pre-work is complete, let's write out a temporary config file that allows
  # us to resume
  echo $"export MOZ_BOTTOM_FF=$MOZ_BOTTOM_FF
export MOZ_TOP_FF=$MOZ_TOP_FF
export MOZ_OLD_CENTRAL=$MOZ_OLD_CENTRAL
export MOZ_NEW_CENTRAL=$MOZ_NEW_CENTRAL
export MOZ_BOOKMARK=$MOZ_BOOKMARK
" > $RESUME_FILE
  if [ "x$MOZ_REPO" = "xgit" ]; then
    echo "export MOZ_REBASE_BRANCH=$MOZ_REBASE_BRANCH" >> $RESUME_FILE
  fi
fi # if [ -f $RESUME_FILE ]; then ; else

if [ "x$STOP_FOR_REORDER" = "x1" ]; then
  echo ""
  echo "Stopping after generating commit list ($COMMIT_LIST_FILE) to"
  echo "allow tweaking commit ordering.  Re-running $0 will resume the"
  echo "rebase processing.  To stop processing during the rebase,"
  echo "insert a line with only 'STOP'."
  exit
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

  function remove_commit () {
    echo "Removing from list '$FULL_COMMIT_LINE'"
    ed -s $COMMIT_LIST_FILE <<< $'1d\nw\nq'
  }

  if [ "$FULL_COMMIT_LINE" == "STOP" ]; then
    echo "Stopping for history editing.  Re-run $0 to resume."
    remove_commit
    exit
  fi

  if [ "x$MOZ_REPO" = "xgit" ]; then
    IS_BUILD_COMMIT=`git show --no-patch --oneline $commit \
                     | grep "file updates" | wc -l | tr -d " " || true`
  else
    IS_BUILD_COMMIT=`hg log -T '{desc|firstline}' -r $commit \
                     | grep "file updates" | wc -l | tr -d " " || true`
  fi
  echo "IS_BUILD_COMMIT: $IS_BUILD_COMMIT"
  if [ "x$IS_BUILD_COMMIT" != "x0" ]; then
    echo "Skipping $commit:"
    if [ "x$MOZ_REPO" = "xgit" ]; then
      git show --no-patch --oneline $commit
    else
      hg log -T '{desc|firstline}' -r $commit
    fi
    remove_commit
    continue
  fi

  if [ "x$MOZ_REPO" = "xgit" ]; then
    IS_SKIP_GEN_COMMIT=`git show --no-patch --format='%B' $commit \
                        | grep "skip-generation" | wc -l | tr -d " " || true`
  else
    IS_SKIP_GEN_COMMIT=`hg log --verbose \
                           -r $commit \
                        | grep "skip-generation" | wc -l | tr -d " " || true`
  fi
  echo "IS_SKIP_GEN_COMMIT: $IS_SKIP_GEN_COMMIT"

  echo "Generate patch for: $commit"
  if [ "x$MOZ_REPO" = "xgit" ]; then
    git format-patch --keep-subject --no-signature \
        --numbered-files -1 --output-directory $TMP_DIR -r $commit
    mv $TMP_DIR/1 $TMP_DIR/rebase.patch
  else
    hg export -r $commit > $TMP_DIR/rebase.patch
  fi

  echo "Import patch for $commit"
  if [ "x$MOZ_REPO" = "xgit" ]; then
    git am $TMP_DIR/rebase.patch || \
    ( git show --no-patch --format='%B' > $TMP_DIR/rebase_commit_message.txt ; \
      remove_commit ; \
      echo "Error importing: '$FULL_COMMIT_LINE'" ; \
      echo "Please fix import errors, then:" ; \
      echo "  git commit --file $TMP_DIR/rebase_commit_message.txt" ; \
      echo "  bash $0" ; \
      exit 1 )
  else
    hg import $TMP_DIR/rebase.patch || \
    ( hg log -T '{desc}' -r $commit > $TMP_DIR/rebase_commit_message.txt ; \
      remove_commit ; \
      echo "Error importing: '$FULL_COMMIT_LINE'" ; \
      echo "Please fix import errors, then:" ; \
      echo "  hg commit -l $TMP_DIR/rebase_commit_message.txt" ; \
      echo "  bash $0" ; \
      exit 1 )
  fi

  remove_commit

  if [ "x$IS_SKIP_GEN_COMMIT" != "x0" ]; then
    echo "Skipping build generation for $commit"
    continue
  fi

  MODIFIED_BUILD_RELATED_FILE_CNT=`bash $SCRIPT_DIR/get_build_file_changes.sh \
      | wc -l | tr -d " "`
  echo "MODIFIED_BUILD_RELATED_FILE_CNT: $MODIFIED_BUILD_RELATED_FILE_CNT"
  if [ "x$MODIFIED_BUILD_RELATED_FILE_CNT" != "x0" ]; then
    echo "Regenerate build files"
    ./mach python build/gn_processor.py \
        dom/media/webrtc/third_party_build/gn-configs/webrtc.json || \
    ( echo "$GENERATION_ERROR$GENERATION_FIX_TEXT" ; exit 1 )

    if [ "x$MOZ_REPO" = "xgit" ]; then
      MOZ_BUILD_CHANGE_CNT=`git status --porcelain third_party/libwebrtc \
          | grep "moz.build$" | wc -l | tr -d " " || true`
    else
      MOZ_BUILD_CHANGE_CNT=`hg status third_party/libwebrtc \
          --include 'third_party/libwebrtc/**moz.build' | wc -l | tr -d " "`
    fi
    if [ "x$MOZ_BUILD_CHANGE_CNT" != "x0" ]; then
      bash dom/media/webrtc/third_party_build/commit-build-file-changes.sh
      if [ "x$MOZ_REPO" = "xgit" ]; then
        NEWEST_COMMIT=`git show --no-patch --oneline`
      else
        NEWEST_COMMIT=`hg log -T '{desc|firstline}' -r tip`
      fi
      echo "NEWEST_COMMIT: $NEWEST_COMMIT"
      echo "NEWEST_COMMIT: $NEWEST_COMMIT" >> $LOG_DIR/rebase-build-changes-commits.log
    fi
    echo "Done generating build files"
  fi

  echo "Done processing $commit"
done

ERROR_HELP=$"
Running the sanity build has failed.  For details, see:
$LOG_DIR/log-sanity-build.txt

Please fix the build, commit the changes (if necessary, the
patch-stack will be fixed up during steps following the
build), and then run:
  bash $0
"
echo "Running sanity build..."
./mach build &> $LOG_DIR/log-sanity-build.txt
echo "Done running sanity build"
ERROR_HELP=""

# In case any changes were made to fix the build after the rebase,
# we'll check for changes since the last patch-stack update in
# third_party/libwebrtc/moz-patch-stack.
# TODO: this is copied from verify_vendoring.sh.  We should make
# make this reusable.
# we grab the entire firstline description for convenient logging
if [ "x$MOZ_REPO" = "xgit" ]; then
  LAST_PATCHSTACK_UPDATE_COMMIT=`git log --max-count 1 --oneline 'third_party/libwebrtc/moz-patch-stack/*.patch'`
else
  LAST_PATCHSTACK_UPDATE_COMMIT=`hg log -r ::. --template "{node|short} {desc|firstline}\n" \
      --include "third_party/libwebrtc/moz-patch-stack/*.patch" | tail -1`
fi
echo "LAST_PATCHSTACK_UPDATE_COMMIT: $LAST_PATCHSTACK_UPDATE_COMMIT"

LAST_PATCHSTACK_UPDATE_COMMIT_SHA=`echo $LAST_PATCHSTACK_UPDATE_COMMIT \
    | awk '{ print $1; }'`
echo "LAST_PATCHSTACK_UPDATE_COMMIT_SHA: $LAST_PATCHSTACK_UPDATE_COMMIT_SHA"

# grab the oldest, non "Vendor from libwebrtc" line
if [ "x$MOZ_REPO" = "xgit" ]; then
  CANDIDATE_COMMITS=`git log --reverse --format='%h' --invert-grep \
      --grep="Vendor libwebrtc" $LAST_PATCHSTACK_UPDATE_COMMIT_SHA..HEAD -- third_party/libwebrtc \
      | awk 'BEGIN { ORS=" " }; { print $1; }'`
else
  CANDIDATE_COMMITS=`hg log --template "{node|short} {desc|firstline}\n" \
      -r "children($LAST_PATCHSTACK_UPDATE_COMMIT_SHA)::. - desc('re:(Vendor libwebrtc)')" \
      --include "third_party/libwebrtc/" | awk 'BEGIN { ORS=" " }; { print $1; }'`
fi
echo "CANDIDATE_COMMITS:"
echo "$CANDIDATE_COMMITS"

EXTRACT_COMMIT_RANGE=""
if [ "x$CANDIDATE_COMMITS" != "x" ]; then
  EXTRACT_COMMIT_RANGE="$CANDIDATE_COMMITS"
  echo "EXTRACT_COMMIT_RANGE: $EXTRACT_COMMIT_RANGE"
fi

# This is blank in case no changes have been made in third_party/libwebrtc
# since the previous rebase (or original elm reset).
PATCH_STACK_FIXUP=""

if [ "x$MOZ_REPO" = "xgit" ]; then
  COMMIT_RANGE_SEPARATOR=".."
else
  COMMIT_RANGE_SEPARATOR="::"
fi

echo "Checking for new mercurial changes in third_party/libwebrtc"
FIXUP_INSTRUCTIONS=$"
Mercurial changes in third_party/libwebrtc since the last rebase have been
detected (using the verify_vendoring.sh script).  Running the following
commands should help remedy the situation:

  ./mach python $SCRIPT_DIR/extract-for-git.py \\
         $MOZ_OLD_CENTRAL$COMMIT_RANGE_SEPARATOR$MOZ_NEW_CENTRAL \\
         $EXTRACT_COMMIT_RANGE
  mv mailbox.patch $MOZ_LIBWEBRTC_SRC
  (cd $MOZ_LIBWEBRTC_SRC && \\
   git am mailbox.patch)
  bash $SCRIPT_DIR/verify_vendoring.sh

When verify_vendoring.sh is successful, run the following in bash:
  (source $SCRIPT_DIR/use_config_env.sh ;
   ./mach python $SCRIPT_DIR/save_patch_stack.py \\
    --repo-path $MOZ_LIBWEBRTC_SRC \\
    --target-branch-head $MOZ_TARGET_UPSTREAM_BRANCH_HEAD  \\
    --separate-commit-bug-number $MOZ_FASTFORWARD_BUG )
"
echo "Restoring patch-stack..."
# restore to make sure new no-op commit files are in the state directory
# in case the user is instructed to save the patch-stack.
./mach python $SCRIPT_DIR/restore_patch_stack.py --repo-path $MOZ_LIBWEBRTC_SRC
echo "Verify vendoring..."
bash $SCRIPT_DIR/verify_vendoring.sh &> $LOG_DIR/log-verify.txt || PATCH_STACK_FIXUP="$FIXUP_INSTRUCTIONS"
echo "Done checking for new mercurial changes in third_party/libwebrtc"

# now that we've run all the things that should be fallible, remove the
# resume state file
rm $RESUME_FILE

if [ "x$MOZ_REPO" = "xgit" ]; then
REMAINING_STEPS=$"
The rebase process is complete.  The following steps must be completed manually:
$PATCH_STACK_FIXUP
  git push origin $MOZ_REBASE_BRANCH && \\
  git push origin $MOZ_BOOKMARK

Note: the steps above are preliminary, and may change after git-hosted
twig repos are officially supported by treeherder/CI.
"
else
REMAINING_STEPS=$"
The rebase process is complete.  The following steps must be completed manually:
$PATCH_STACK_FIXUP
  hg push -r tip --force && \\
  hg push -B $MOZ_BOOKMARK
"
fi
echo "$REMAINING_STEPS"
