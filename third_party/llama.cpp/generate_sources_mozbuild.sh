#!/bin/bash -e
#
# Copyright (c) 2012 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

# Modified from /media/libaom/generate_sources_mozbuild.sh, that has been
# adapted from chromium/src/third_party/libaom/generate_gni.sh

# This script is used to generate sources.mozbuild and files in the
# config/platform directories needed to build llama.cpp.
# Every time llama.cpp source code is updated just run this script.
#
# Usage:
# $ ./generate_sources_mozbuild.sh

export LC_ALL=C
BASE_DIR=$(pwd)

python3 -m venv temp
source temp/bin/activate
pip install pyparsing==2.4.7 colorama
python3 run_parser.py
deactivate
rm -r temp

