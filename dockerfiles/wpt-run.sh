#!/usr/bin/env bash
#
# Entrypoint for dockerfiles/Dockerfile.wpt: runs web-platform-tests against the
# Foxhound build in this image.
#
# Environment:
#   WPT_TAINT           on | off | both | none   (default: on)
#                       "off" flips tainting.active=false, giving you a baseline from
#                       the very same binary. "both" runs the suite twice and writes
#                       two reports so you can diff them. "none" leaves the pref
#                       untouched -- use it for a stock Firefox build, which has no
#                       tainting.active pref at all.
#   WPT_TOTAL_CHUNKS    number of chunks the suite is split into (default: 1)
#   WPT_THIS_CHUNK      which chunk this container runs (default: 1)
#   WPT_CHUNK_TYPE      none | hash | id_hash | dir_hash (default: dir_hash)
#   WPT_PROCESSES       parallel browser instances (default: 4)
#   WPT_RETRY_UNEXPECTED  retries for unexpected results (default: 1)
#   WPT_INCLUDE         space-separated test prefixes to include (default: everything)
#   WPT_EXCLUDE         space-separated test prefixes to exclude
#   WPT_RESULTS_DIR     output directory (default: /results)
#   WPT_SCREEN          Xvfb geometry (default: 1920x1080x24)
#   WPT_HEADLESS        set to 1 to use Firefox headless mode instead of Xvfb
#   WPT_SSL_TYPE        openssl | pregenerated | none (default: openssl)
#                       The certificates vendored in testing/web-platform/tests/tools/certs
#                       carry a one-year validity window and are routinely stale in any
#                       given checkout (the 142.0.1-era pair expired 2026-06-12; check
#                       yours with `openssl x509 -in <pem> -noout -dates`). Once
#                       expired, every https/serviceworker test dies with
#                       InsecureCertificateException -- several thousand tests. "openssl"
#                       has wptserve mint a fresh CA at run time instead, and certutil
#                       installs whichever CA the ssl environment produced, so this Just
#                       Works regardless of the tree's age.
#
# Any extra arguments are passed straight through to `mach wpt`.

set -euo pipefail

SRC_DIR=${SRC_DIR:-/home/foxhound/foxhound}
RESULTS_DIR=${WPT_RESULTS_DIR:-/results}
TAINT=${WPT_TAINT:-on}
SCREEN=${WPT_SCREEN:-1920x1080x24}

cd "$SRC_DIR"
mkdir -p "$RESULTS_DIR"

REVISION="$(cat /home/foxhound/foxhound-revision.txt 2>/dev/null || echo unknown)"

common_args=(
  --log-mach-level=info
  --log-mach=-
  --total-chunks="${WPT_TOTAL_CHUNKS:-1}"
  --this-chunk="${WPT_THIS_CHUNK:-1}"
  --chunk-type="${WPT_CHUNK_TYPE:-dir_hash}"
  --processes="${WPT_PROCESSES:-4}"
  --retry-unexpected="${WPT_RETRY_UNEXPECTED:-1}"
  # The manifest was generated at image build time; don't phone home to taskcluster.
  --no-manifest-update
  # Keep going through crashes rather than aborting the run.
  --max-restarts=10
  # wptrunner turns this on by default when the run contains exactly one test,
  # which wedges an unattended container waiting for a browser that never exits.
  --no-pause-after-test
  # Generate certificates at run time; see WPT_SSL_TYPE above.
  --ssl-type="${WPT_SSL_TYPE:-openssl}"
)

for inc in ${WPT_INCLUDE:-}; do
  common_args+=(--include="$inc")
done
for exc in ${WPT_EXCLUDE:-}; do
  common_args+=(--exclude="$exc")
done

if [[ "${WPT_HEADLESS:-0}" == "1" ]]; then
  common_args+=(--headless)
fi

run_suite() {
  local label="$1"
  local tainting="$2"
  shift 2

  local stamp
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  # $HOSTNAME is the container id, which keeps concurrent containers sharing one
  # results volume from clobbering each other's report -- a second-resolution
  # timestamp alone is not unique enough.
  local prefix="${RESULTS_DIR}/wpt-${label}-chunk${WPT_THIS_CHUNK:-1}of${WPT_TOTAL_CHUNKS:-1}-${stamp}-$(hostname)"

  echo "=============================================================="
  echo " Foxhound WPT run"
  echo "   revision:        ${REVISION}"
  echo "   tainting.active: ${tainting}"
  echo "   source:          ${SRC_DIR}"
  echo "   chunk:           ${WPT_THIS_CHUNK:-1}/${WPT_TOTAL_CHUNKS:-1} (${WPT_CHUNK_TYPE:-dir_hash})"
  echo "   processes:       ${WPT_PROCESSES:-4}"
  echo "   report:          ${prefix}.json"
  echo "=============================================================="

  local args=("${common_args[@]}")
  if [[ "$tainting" != "unset" ]]; then
    args+=(--setpref="tainting.active=${tainting}")
  fi
  args+=(
    --log-wptreport="${prefix}.json"
    --log-raw="${prefix}.raw.log"
    "$@"
  )

  local cmd=(./mach wpt "${args[@]}")
  local rc=0

  if [[ "${WPT_HEADLESS:-0}" == "1" ]]; then
    "${cmd[@]}" || rc=$?
  else
    xvfb-run -a -s "-screen 0 ${SCREEN} -nolisten tcp" "${cmd[@]}" || rc=$?
  fi

  echo "--- run '${label}' finished with exit code ${rc} ---"
  return "$rc"
}

overall=0

case "$TAINT" in
  on)
    run_suite tainted true "$@" || overall=$?
    ;;
  off)
    run_suite baseline false "$@" || overall=$?
    ;;
  none)
    run_suite stock unset "$@" || overall=$?
    ;;
  both)
    # Baseline first, so a crash in the tainted run still leaves you a reference.
    run_suite baseline false "$@" || overall=$?
    run_suite tainted true "$@" || overall=$?
    echo
    echo "Two reports written to ${RESULTS_DIR}. Diff them with:"
    echo "  wpt-compare ${RESULTS_DIR}/wpt-baseline-*.json ${RESULTS_DIR}/wpt-tainted-*.json"
    ;;
  *)
    echo "WPT_TAINT must be one of: on, off, both, none (got '${TAINT}')" >&2
    exit 2
    ;;
esac

exit "$overall"
