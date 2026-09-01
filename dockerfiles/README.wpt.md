# Running the web-platform-tests against Foxhound, locally

`Dockerfile.wpt` builds Foxhound from source and runs the vendored
web-platform-test suite against it. Nothing here touches taskcluster or any
other Mozilla infrastructure — the only network access is during `docker build`.

## What it actually takes

A few things make this less painful than it sounds:

* **The tests are already in the tree.** `testing/web-platform/tests` is a
  vendored WPT checkout, so there is no separate `web-platform-tests` clone and
  no upstream sync step.
* **No `/etc/hosts` editing.** The upstream `wpt run` CLI wants
  `web-platform.test`, `www.web-platform.test`, `xn--n8j6ds53lwwkrqhv28a.web-platform.test`
  and friends in `/etc/hosts`. `mach wpt` with `--product=firefox` doesn't: the
  Gecko browser plugin sets `network.dns.localDomains` to the full domain set
  (`testing/web-platform/tests/tools/wptrunner/wptrunner/browsers/firefox.py`),
  so the browser resolves them internally. This is why the container needs no
  extra capabilities.
* **Certificates are pregenerated.** `mach` points wptrunner at
  `testing/web-platform/tests/tools/certs/`, and `certutil` from
  `obj-tf-release/dist/bin` loads them into each fresh profile.
* **clang comes from apt.llvm.org, not the Ubuntu archive.** Firefox 153 requires
  llvm >= 19 (`Only clang/llvm 19.0 or newer is supported`) and noble ships 18.1.3.
  The `LLVM_VERSION` build arg (default 20) selects the version.
* **`--enable-tests` is required.** wptrunner needs
  `dist/xpi-stage/specialpowers@mozilla.org.xpi`, the staged `objdir/_tests`
  tree, and `geckodriver` (for the `wdspec` test type). Foxhound's
  `taintfox_mozconfig_ubuntu` leaves `--disable-tests` commented out, so tests
  are on by default; the Dockerfile makes that explicit so a future edit to the
  mozconfig can't silently break the image.
* **The manifest must be built offline.** By default `mach wpt` fetches a
  prebuilt `MANIFEST.json` from taskcluster. The image runs
  `./mach wpt-manifest-update --no-download --rebuild` at build time and the
  entrypoint then passes `--no-manifest-update`.
* **A display.** The entrypoint wraps the run in `xvfb-run`, which is what
  Mozilla CI does and gives better fidelity for reftests than Firefox's own
  headless mode. Set `WPT_HEADLESS=1` to use `--headless` instead.

Practical costs: roughly **60 GB of disk** and **2–4 hours** for the build on a
reasonable machine, then **several hours** for one pass over the full suite
(~55k tests). Chunk it across containers if you want it to finish sooner.

## Build

```bash
docker build -f dockerfiles/Dockerfile.wpt -t foxhound-wpt dockerfiles/
```

The build context is `dockerfiles/`, not the repo root — the source is cloned
inside the image, so there's no reason to ship a multi-gigabyte gecko tree to
the daemon.

Build args:

| Arg | Default | Meaning |
| --- | --- | --- |
| `FOXHOUND_REPO` | `https://github.com/SAP/project-foxhound.git` | Repository to clone |
| `FOXHOUND_REF` | `main` | Branch or tag |
| `FOXHOUND_CACHE_BUST` | `0` | Bump to force a fresh clone of a moved branch |
| `BUILD_JOBS` | *(unset)* | `MOZ_PARALLEL_BUILD`; useful on memory-constrained hosts |
| `UBUNTU_VERSION` | `24.04` | Base image |
| `LLVM_VERSION` | `20` | clang/lld version pulled from apt.llvm.org (must be >= 19) |
| `RUST_VERSION` | `1.90.0` | rustup toolchain |
| `CBINDGEN_VERSION` | `0.29.4` | cbindgen |
| `USER_UID` / `USER_GID` | `1000` | Match your host user so `/results` is writable |

To build a fork or a local branch, push it somewhere reachable and point
`FOXHOUND_REPO`/`FOXHOUND_REF` at it. To reuse an existing built tree from the
host instead, mount it and override `SRC_DIR`:

```bash
docker run --rm --init --shm-size=2g \
  -v "$PWD:/src" -v "$PWD/wpt-results:/results" \
  -e SRC_DIR=/src \
  foxhound-wpt
```

(The tree must already be built and its objdir must be usable from inside the
container.)

## Run

Full suite, taint tracking on:

```bash
mkdir -p wpt-results
docker run --rm --init --shm-size=2g \
  -v "$PWD/wpt-results:/results" \
  foxhound-wpt
```

`--init` matters: wptrunner spawns a lot of processes and you want them reaped.
`--shm-size=2g` matters too — Firefox is unhappy with Docker's default 64 MB
`/dev/shm` and you'll see spurious content-process crashes without it.

### Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `WPT_TAINT` | `on` | `on`, `off`, or `both`. Sets `tainting.active`. |
| `WPT_TOTAL_CHUNKS` | `1` | Split the suite into N chunks |
| `WPT_THIS_CHUNK` | `1` | Which chunk this container runs |
| `WPT_CHUNK_TYPE` | `dir_hash` | `none`, `hash`, `id_hash`, `dir_hash` |
| `WPT_PROCESSES` | `4` | Parallel browser instances |
| `WPT_RETRY_UNEXPECTED` | `1` | Retries for unexpected results |
| `WPT_INCLUDE` | *(all)* | Space-separated test prefixes to include |
| `WPT_EXCLUDE` | | Space-separated test prefixes to exclude |
| `WPT_HEADLESS` | `0` | `1` uses `--headless` instead of Xvfb |
| `WPT_SCREEN` | `1920x1080x24` | Xvfb geometry |
| `WPT_RESULTS_DIR` | `/results` | Output directory |
| `SRC_DIR` | `/home/foxhound/foxhound` | Source tree to run from |

Extra arguments are passed straight to `mach wpt`:

```bash
docker run --rm --init --shm-size=2g -v "$PWD/wpt-results:/results" \
  -e WPT_INCLUDE="/dom /html/webappapis" \
  foxhound-wpt --log-tbpl=-
```

### Chunking across containers

```bash
for i in $(seq 1 8); do
  docker run -d --init --shm-size=2g \
    --name "foxhound-wpt-$i" \
    -v "$PWD/wpt-results:/results" \
    -e WPT_TOTAL_CHUNKS=8 -e WPT_THIS_CHUNK="$i" -e WPT_PROCESSES=2 \
    foxhound-wpt
done
```

Each container writes its own `wpt-tainted-chunk<i>of8-<timestamp>.json`.

## Interpreting the results

The expectation metadata in `testing/web-platform/meta` is Firefox's, and it is
pinned to whatever Firefox release Foxhound was rebased onto (153.0 on this branch).
A plain run will therefore show some failures that have nothing to do with taint
tracking — upstream test churn since the rebase, missing GPU/media codecs in the
container, timing flakes.

To isolate what taint tracking itself changes, run the suite twice from the same
binary and diff the two reports. `tainting.active=false` turns the
instrumentation off, giving you a clean control:

```bash
docker run --rm --init --shm-size=2g \
  -v "$PWD/wpt-results:/results" \
  -e WPT_TAINT=both \
  foxhound-wpt

docker run --rm -v "$PWD/wpt-results:/results" --entrypoint wpt-compare foxhound-wpt \
  /results/wpt-baseline-<timestamp>.json /results/wpt-tainted-<timestamp>.json
```

`wpt-compare` prints a summary of status transitions plus the per-test and
per-subtest diff, and exits non-zero if anything changed — so it can gate CI.
Add `--json out.json` for a machine-readable diff.

This is the measurement that matters for Foxhound: not "how much of WPT passes",
but "what does enabling taint tracking break".

## Known rough edges

* `wdspec` tests need `geckodriver`. It is built automatically when tests are
  enabled, but if `find_webdriver_binary` comes up empty those tests will error
  out rather than fail cleanly.
* Media, WebGL and some `css` reftests depend on codecs and GPU features that
  aren't present in a plain container. They will fail in both the baseline and
  the tainted run, so the diff still stays clean.
* The ccache `RUN --mount=type=cache` line hardcodes `uid=1000`; if you override
  `USER_UID`, update it to match or drop the mount.
* The build stage is not incremental across `docker build` invocations beyond
  what ccache gives you. For iterating on Foxhound itself, use the `SRC_DIR`
  mount above against a host build tree.
