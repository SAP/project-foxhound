#! /bin/bash -vex
set -x -e -v

export OUTPUT_DIR=/builds/worker/talos-pdfs

cd $GECKO_PATH
./mach python taskcluster/scripts/misc/fetch-talos-pdfs.py

mkdir -p $UPLOAD_DIR
tar -cavf $UPLOAD_DIR/talos-pdfs.tar.zst -C $OUTPUT_DIR/.. talos-pdfs
