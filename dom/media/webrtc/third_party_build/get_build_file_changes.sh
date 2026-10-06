#!/bin/bash

# Both loop-ff.sh and elm_rebase.sh check for modified build (related)
# files - in other words, files that when modified might produce a
# change in the generated moz.build files.  This script is to ensure
# that both are using the same set of files

# since the output of this script is used by loop-ff.sh and
# elm_rebase.sh to count the number of changes in specific files, make
# sure any logging from use_config_env.sh is squelched.  This is mostly
# safe since both scripts have already called use_config_env.sh and
# exposed any errors it encountered.  In practice, we're only using
# use_config_env.sh here to "import" the function find_repo_type.
source dom/media/webrtc/third_party_build/use_config_env.sh &> /dev/null

find_repo_type

if [ "x$MOZ_REPO" == "xgit" ]; then
  git show --format='' --name-only \
                'third_party/libwebrtc/**BUILD.gn' \
                'third_party/libwebrtc/**.gni' \
                'third_party/libwebrtc/.gn' \
                'dom/media/webrtc/third_party_build/gn-configs/webrtc.json'
else
  hg status --change . \
      --include 'third_party/libwebrtc/**BUILD.gn' \
      --include 'third_party/libwebrtc/**/*.gni' \
      --include 'third_party/libwebrtc/.gn' \
      --include 'dom/media/webrtc/third_party_build/gn-configs/webrtc.json'
fi
