#!/bin/bash

set -e

LOGALLOC="${1#--logalloc=}"
PROGRAM="$2"
SRCDIR="$3"
PYTHON3="$4"

grep "^1 " ${SRCDIR}/replay.log > expected_output.log

# Test with MALLOC_LOG as a file descriptor number
# We filter out anything happening before the first jemalloc_stats (first
# command in replay.log) because starting with libstdc++ 5, a static
# initializer in the STL allocates memory, which we obviously don't have
# in expected_output.log.
MALLOC_LOG=1 ${LOGALLOC} ${PROGRAM} < ${SRCDIR}/replay.log | sed -n '/jemalloc_stats/,$p' | ${PYTHON3} ${SRCDIR}/logalloc_munge.py | diff -w - expected_output.log

# Test with MALLOC_LOG as a file name
rm -f test_output.log
MALLOC_LOG=test_output.log ${LOGALLOC} ${PROGRAM} < ${SRCDIR}/replay.log
sed -n '/jemalloc_stats/,$p' test_output.log | ${PYTHON3} ${SRCDIR}/logalloc_munge.py | diff -w - expected_output.log

MALLOC_LOG=1 MALLOC_LOG_MINIMAL=1 ${LOGALLOC} ${PROGRAM} < ${SRCDIR}/replay.log | sed -n '/jemalloc_stats/,$p' | ${PYTHON3} ${SRCDIR}/logalloc_munge.py | diff -w - ${SRCDIR}/expected_output_minimal.log

