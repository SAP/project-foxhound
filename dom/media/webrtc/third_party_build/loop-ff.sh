#!/bin/bash

source dom/media/webrtc/third_party_build/use_config_env.sh

# file for logging loop script output
LOOP_OUTPUT_LOG=$LOG_DIR/log-loop-ff.txt

function echo_log()
{
  echo "===loop-ff=== $@" 2>&1| tee -a $LOOP_OUTPUT_LOG
}

function show_error_msg()
{
  echo_log "*** ERROR *** $? line $1 $0 did not complete successfully!"
  echo_log "$ERROR_HELP"
}
ERROR_HELP=""

# Print an Error message if `set -eE` causes the script to exit due to a failed command
trap 'show_error_msg $LINENO' ERR

# If DEBUG_LOOP_FF is set all commands should be printed as they are executed
if [ ! "x$DEBUG_LOOP_FF" = "x" ]; then
  set -x
fi

if [ "x$MOZ_LIBWEBRTC_SRC" = "x" ]; then
  echo "MOZ_LIBWEBRTC_SRC is not defined, see README.md"
  exit
fi

if [ ! -d $MOZ_LIBWEBRTC_SRC ]; then
  echo "Path $MOZ_LIBWEBRTC_SRC is not found, see README.md"
  exit
fi

if [ "x$MOZ_LIBWEBRTC_BRANCH" = "x" ]; then
  echo "MOZ_LIBWEBRTC_BRANCH is not defined, see README.md"
  exit
fi

if [ "x$MOZ_STOP_AFTER_COMMIT" = "x" ]; then
  MOZ_STOP_AFTER_COMMIT=`cd $MOZ_LIBWEBRTC_SRC ; git show $MOZ_TARGET_UPSTREAM_BRANCH_HEAD --format='%h' --name-only | head -1`
  echo "No MOZ_STOP_AFTER_COMMIT variable defined - stopping at $MOZ_TARGET_UPSTREAM_BRANCH_HEAD"
fi

if [ "x$SKIP_NEXT_REVERT_CHK" = "x" ]; then
  SKIP_NEXT_REVERT_CHK="0"
fi

MOZ_CHANGED=0
GIT_CHANGED=0
HANDLE_NOOP_COMMIT=""

# After this point:
# * eE: All commands should succeed.
# * u: All variables should be defined before use.
# * o pipefail: All stages of all pipes should succeed.
set -eEuo pipefail

# start a new log with every run of this script
rm -f $LOOP_OUTPUT_LOG
# make sure third_party/libwebrtc/README.moz-ff-commit is the committed version
# so we properly determine MOZ_LIBWEBRTC_BASE and MOZ_LIBWEBRTC_NEXT_BASE
# in the loop below
hg revert -C third_party/libwebrtc/README.moz-ff-commit &> /dev/null

# check for a resume situation from fast-forward-libwebrtc.sh
RESUME=""
if [ -f $STATE_DIR/resume_state ]; then
  RESUME=`tail -1 $STATE_DIR/resume_state`
fi

ERROR_HELP=$"
It appears that initial vendoring verification has failed.
- If you have never run the fast-forward process before, you may need to
  prepare the github repository by running prep_repo.sh.
- If you have previously run loop-ff.sh successfully, there may be a new
  change to third_party/libwebrtc that should be extracted and added to
  the patch stack in github.  It may be as easy as running:
      ./mach python $SCRIPT_DIR/extract-for-git.py tip::tip
      mv mailbox.patch $MOZ_LIBWEBRTC_SRC
      (cd $MOZ_LIBWEBRTC_SRC && \\
       git am mailbox.patch)
"
# if we're not in the resume situation from fast-forward-libwebrtc.sh
if [ "x$RESUME" = "x" ]; then
  # start off by verifying the vendoring process to make sure no changes have
  # been added to elm to fix bugs.
  echo_log "Verifying vendoring..."
  bash $SCRIPT_DIR/verify_vendoring.sh
  echo_log "Done verifying vendoring."
fi
ERROR_HELP=""

for (( ; ; )); do

find_base_commit
find_next_commit

if [ $MOZ_LIBWEBRTC_BASE == $MOZ_LIBWEBRTC_NEXT_BASE ]; then
  echo_log "Processing complete, already at upstream $MOZ_LIBWEBRTC_BASE"
  exit
fi

echo_log "==================="

COMMITS_REMAINING=`cd $MOZ_LIBWEBRTC_SRC ; \
   git log --oneline $MOZ_LIBWEBRTC_BASE..$MOZ_TARGET_UPSTREAM_BRANCH_HEAD \
   | wc -l | tr -d " "`
echo_log "Commits remaining: $COMMITS_REMAINING"

ERROR_HELP=$"Some portion of the detection and/or fixing of upstream revert commits
has failed.  Please fix the state of the git hub repo at: $MOZ_LIBWEBRTC_SRC.
When fixed, please resume this script with the following command:
    SKIP_NEXT_REVERT_CHK=1 bash $SCRIPT_DIR/loop-ff.sh
"
if [ "x$SKIP_NEXT_REVERT_CHK" == "x0" ]; then
  echo_log "Check for upcoming revert commit"
  AUTO_FIX_REVERT_AS_NOOP=1 bash $SCRIPT_DIR/detect_upstream_revert.sh 2>&1| tee -a $LOOP_OUTPUT_LOG
fi
SKIP_NEXT_REVERT_CHK="0"
ERROR_HELP=""

echo_log "Looking for $STATE_DIR/$MOZ_LIBWEBRTC_NEXT_BASE.no-op-cherry-pick-msg"
if [ -f $STATE_DIR/$MOZ_LIBWEBRTC_NEXT_BASE.no-op-cherry-pick-msg ]; then
  echo_log "Detected special commit msg, setting HANDLE_NOOP_COMMIT=1"
  HANDLE_NOOP_COMMIT="1"
fi

echo_log "Moving from moz-libwebrtc commit $MOZ_LIBWEBRTC_BASE to $MOZ_LIBWEBRTC_NEXT_BASE"
bash $SCRIPT_DIR/fast-forward-libwebrtc.sh 2>&1| tee -a $LOOP_OUTPUT_LOG

MOZ_CHANGED=`hg diff -c tip --stat \
   | egrep -ve "README.moz-ff-commit|README.mozilla|files changed," \
   | wc -l | tr -d " " || true`
GIT_CHANGED=`cd $MOZ_LIBWEBRTC_SRC ; \
   git show --oneline --name-only $MOZ_LIBWEBRTC_NEXT_BASE \
   | csplit -f $TMP_DIR/gitshow -sk - 2 ; cat $TMP_DIR/gitshow01 \
   | egrep -ve "^CODE_OF_CONDUCT.md|^ENG_REVIEW_OWNERS|^PRESUBMIT.py|^README.chromium|^WATCHLISTS|^abseil-in-webrtc.md|^codereview.settings|^license_template.txt|^native-api.md|^presubmit_test.py|^presubmit_test_mocks.py|^pylintrc|^style-guide.md" \
   | wc -l | tr -d " " || true`
FILE_CNT_MISMATCH_MSG=$"
The number of files changed in the upstream commit ($GIT_CHANGED) does
not match the number of files changed in the local Mozilla repo
commit ($MOZ_CHANGED).  This may indicate a mismatch between the vendoring
script and this script, or it could be a true error in the import
processing.  Once the issue has been resolved, the following steps
remain for this commit:
  # generate moz.build files (may not be necessary)
  ./mach python python/mozbuild/mozbuild/gn_processor.py \\
      $SCRIPT_DIR/gn-configs/webrtc.json
  # commit the updated moz.build files with the appropriate commit msg
  bash $SCRIPT_DIR/commit-build-file-changes.sh
  # do a (hopefully) quick test build
  ./mach build
"
echo_log "Verify number of files changed MOZ($MOZ_CHANGED) GIT($GIT_CHANGED)"
if [ "x$HANDLE_NOOP_COMMIT" == "x1" ]; then
  echo_log "NO-OP commit detected, we expect file changed counts to differ"
elif [ $MOZ_CHANGED -ne $GIT_CHANGED ]; then
  echo_log "MOZ_CHANGED $MOZ_CHANGED should equal GIT_CHANGED $GIT_CHANGED"
  echo "$FILE_CNT_MISMATCH_MSG"
  exit 1
fi
HANDLE_NOOP_COMMIT=""

MODIFIED_BUILD_RELATED_FILE_CNT=`hg diff -c tip --stat \
    --include 'third_party/libwebrtc/**BUILD.gn' \
    --include 'third_party/libwebrtc/webrtc.gni' \
    | grep -v "files changed" \
    | wc -l | tr -d " " || true`
ERROR_HELP=$"
Generating build files has failed.  This likely means changes to one or more
BUILD.gn files are required.  Commit those changes following the instructions
in https://wiki.mozilla.org/Media/WebRTC/libwebrtc_Update_Process#Operational_notes
Then complete these steps:
  # generate moz.build files (may not be necessary)
  ./mach python python/mozbuild/mozbuild/gn_processor.py \\
      $SCRIPT_DIR/gn-configs/webrtc.json
  # commit the updated moz.build files with the appropriate commit msg
  bash $SCRIPT_DIR/commit-build-file-changes.sh
  # do a (hopefully) quick test build
  ./mach build
After a successful build, you may resume this script.
"
echo_log "Modified BUILD.gn (or webrtc.gni) files: $MODIFIED_BUILD_RELATED_FILE_CNT"
if [ "x$MODIFIED_BUILD_RELATED_FILE_CNT" != "x0" ]; then
  echo_log "Regenerate build files"
  ./mach python python/mozbuild/mozbuild/gn_processor.py \
      $SCRIPT_DIR/gn-configs/webrtc.json 2>&1| tee -a $LOOP_OUTPUT_LOG

  MOZ_BUILD_CHANGE_CNT=`hg status third_party/libwebrtc \
      --include 'third_party/libwebrtc/**moz.build' | wc -l | tr -d " "`
  if [ "x$MOZ_BUILD_CHANGE_CNT" != "x0" ]; then
    echo_log "Detected modified moz.build files, commiting"
  fi

  bash $SCRIPT_DIR/commit-build-file-changes.sh 2>&1| tee -a $LOOP_OUTPUT_LOG
fi
ERROR_HELP=""

ERROR_HELP=$"
The test build has failed.  Most likely this is due to an upstream api change that
must be reflected in Mozilla code outside of the third_party/libwebrtc directory.
"
echo_log "Test build"
./mach build 2>&1| tee -a $LOOP_OUTPUT_LOG
ERROR_HELP=""

if [ ! "x$MOZ_STOP_AFTER_COMMIT" = "x" ]; then
if [ $MOZ_LIBWEBRTC_NEXT_BASE = $MOZ_STOP_AFTER_COMMIT ]; then
  break
fi
fi

done

echo_log "Completed fast-foward to $MOZ_STOP_AFTER_COMMIT"
