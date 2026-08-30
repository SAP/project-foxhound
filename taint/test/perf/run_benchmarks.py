#!/usr/bin/env python3
"""Measure taint tracking overhead by running browser benchmarks side by side.

Serves each benchmark from localhost and captures the results the driver hands
back, so nothing is downloaded and no Talos machinery is involved. Builds are
run interleaved and in rotating order, so drift over the run is spread evenly
rather than landing on whichever build went first.

  run_benchmarks.py --rounds 8 --out results.json \
      vanilla=/path/to/firefox foxhound=/path/to/foxhound

Results are written as JSON; summarise.py turns them into a table.
"""

import argparse
import http.server
import json
import os
import shutil
import socketserver
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import benchmarks  # noqa: E402

TOPSRCDIR = os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
)

PROFILE_PREFS = """
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("datareporting.policy.dataSubmissionEnabled", false);
user_pref("datareporting.healthreport.uploadEnabled", false);
user_pref("toolkit.telemetry.enabled", false);
user_pref("app.update.enabled", false);
user_pref("browser.startup.homepage_override.mstone", "ignore");
user_pref("browser.sessionstore.resume_from_crash", false);
user_pref("extensions.autoDisableScopes", 15);
user_pref("dom.disable_open_during_load", false);
user_pref("browser.newtabpage.enabled", false);
"""


class Harness:
    def __init__(self, serve_dir):
        self.serve_dir = serve_dir
        self.result = []
        handler = self._make_handler()
        socketserver.TCPServer.allow_reuse_address = True
        self.httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
        self.port = self.httpd.server_address[1]
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def _make_handler(harness_self):
        serve_dir = harness_self.serve_dir

        class Handler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, *a, **kw):
                super().__init__(*a, directory=serve_dir, **kw)

            def do_GET(self):
                if self.path.startswith("/report?"):
                    harness_self.result.append(
                        urllib.parse.unquote(self.path[len("/report?"):])
                    )
                    self.send_response(200)
                    self.send_header("Content-Type", "text/plain")
                    self.end_headers()
                    try:
                        self.wfile.write(b"ok")
                    except BrokenPipeError:
                        pass
                    return
                try:
                    return super().do_GET()
                except BrokenPipeError:
                    # The driver navigates away mid-request routinely.
                    pass

            def log_message(self, *a):
                pass

        return Handler

    def shutdown(self):
        self.httpd.shutdown()


def run_once(binary, port, driver, timeout):
    profile = tempfile.mkdtemp(prefix="benchprof-")
    with open(os.path.join(profile, "user.js"), "w") as f:
        f.write(PROFILE_PREFS)
    env = dict(os.environ)
    env["MOZ_DISABLE_CONTENT_SANDBOX"] = "1"
    url = f"http://127.0.0.1:{port}/{driver}"
    proc = subprocess.Popen(
        [binary, "--headless", "--profile", profile, "--new-instance", url],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return proc, profile


def measure(harness, binary, driver, timeout):
    harness.result.clear()
    proc, profile = run_once(binary, harness.port, driver, timeout)
    start = time.time()
    try:
        while time.time() - start < timeout:
            if harness.result:
                return harness.result.pop(0)
            if proc.poll() is not None:
                raise RuntimeError(f"{binary} exited before reporting results")
            time.sleep(0.25)
        raise RuntimeError(f"{binary} timed out after {timeout}s")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=30)
        except subprocess.TimeoutExpired:
            proc.kill()
        shutil.rmtree(profile, ignore_errors=True)


def stage_benchmark(spec, workdir):
    """Copy the benchmark somewhere writable and patch its driver."""
    dest = os.path.join(workdir, os.path.basename(spec["path"]))
    shutil.copytree(spec["abspath"], dest)
    driver_path = os.path.join(dest, spec["driver"])
    with open(driver_path, encoding="utf-8", errors="surrogateescape") as f:
        html = f.read()
    with open(driver_path, "w", encoding="utf-8", errors="surrogateescape") as f:
        f.write(spec["patch"](html))
    return dest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rounds", type=int, default=6)
    ap.add_argument("--timeout", type=int, default=1800)
    ap.add_argument("--out", default="benchmark-results.json")
    ap.add_argument(
        "--benchmarks",
        default="sunspider,kraken,v8",
        help="comma separated subset of: " + ",".join(benchmarks.BENCHMARKS),
    )
    ap.add_argument(
        "builds",
        nargs="+",
        metavar="LABEL=BINARY",
        help="the browser builds to compare, e.g. vanilla=/path/to/firefox",
    )
    args = ap.parse_args()

    builds = []
    for entry in args.builds:
        label, _, binary = entry.partition("=")
        if not binary:
            ap.error(f"expected LABEL=BINARY, got {entry!r}")
        if not os.path.exists(binary):
            ap.error(f"no such binary: {binary}")
        builds.append((label, binary))

    names = [n.strip() for n in args.benchmarks.split(",") if n.strip()]
    for name in names:
        if name not in benchmarks.BENCHMARKS:
            ap.error(f"unknown benchmark {name!r}")

    results = {}
    workdir = tempfile.mkdtemp(prefix="benchsrc-")
    try:
        for name in names:
            spec = benchmarks.resolve(TOPSRCDIR, name)
            if not os.path.isdir(spec["abspath"]):
                print(f"skipping {name}: {spec['abspath']} is missing", flush=True)
                continue
            served = stage_benchmark(spec, workdir)
            harness = Harness(served)
            results[name] = {
                "label": spec["label"],
                "unit": spec["unit"],
                "higher_is_better": spec["higher_is_better"],
                "runs": {label: [] for label, _ in builds},
            }
            try:
                for r in range(args.rounds):
                    # Rotate so no build is always measured first.
                    order = builds[r % len(builds):] + builds[: r % len(builds)]
                    for label, binary in order:
                        raw = measure(harness, binary, spec["driver"], args.timeout)
                        parsed = spec["parse"](raw)
                        results[name]["runs"][label].append(parsed)
                        total = sum(sum(v) / len(v) for v in parsed.values())
                        print(
                            f"{name:<10} round {r + 1}/{args.rounds}  "
                            f"{label:<18} {total:10.1f} {spec['unit']}",
                            flush=True,
                        )
                    with open(args.out, "w") as f:
                        json.dump(results, f)
            finally:
                harness.shutdown()
    finally:
        shutil.rmtree(workdir, ignore_errors=True)

    with open(args.out, "w") as f:
        json.dump(results, f)
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
