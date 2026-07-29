# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import threading
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from base_python_support import BasePythonSupport
from logger.logger import RaptorLogger

LOG = RaptorLogger(component="raptor-browsertime")

# Artificial /target.html backend delay so prefetch vs. cold-nav is legible.
# 500 ms corresponds to the p75 response time from the pageload event.
TARGET_STALL_MS = 500

SPECULATION_RULES_TAG = """<script type="speculationrules">
{
  "prefetch": [{
    "source": "document",
    "where": { "href_matches": "/target.html*" },
    "eagerness": "moderate"
  }]
}
</script>
"""

LANDING_HTML_TEMPLATE = """<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Speculation Rules Prefetch Demo</title>
{rules}
<style>
  html, body {{ height: 100%; margin: 0; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
                 system-ui, sans-serif;
    background: #f4f5f7;
    color: #1c1d21;
    display: flex;
    align-items: center;
    justify-content: center;
  }}
  .card {{
    background: #ffffff;
    border-radius: 16px;
    padding: 36px 48px 40px;
    box-shadow: 0 8px 24px rgba(15, 22, 36, 0.08),
                0 2px 4px rgba(15, 22, 36, 0.04);
    max-width: 560px;
    text-align: center;
  }}
  h1 {{
    margin: 0 0 6px;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }}
  .subtitle {{
    margin: 0 0 22px;
    color: #5c6370;
    font-size: 14px;
    line-height: 1.5;
  }}
  .subtitle code {{
    font-size: 13px;
    background: #eef0f3;
    padding: 1px 6px;
    border-radius: 4px;
  }}
  .buttons {{
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }}
  .btn {{
    display: inline-block;
    padding: 14px 30px;
    background: #0060df;
    color: #ffffff;
    text-decoration: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 500;
    letter-spacing: 0.01em;
    transition: background-color 0.15s ease;
  }}
  .btn:hover {{ background: #0250bb; }}
  footer {{
    margin-top: 22px;
    color: #8892a0;
    font-size: 12px;
  }}
</style>
</head>
<body>
<div class="card">
  <h1>Speculation Rules Prefetch Demo</h1>
  <p class="subtitle">
    Inline <code>&lt;script type="speculationrules"&gt;</code> with
    <strong>moderate</strong> eagerness fires prefetch after ~200&nbsp;ms
    of sustained hover on a matching link.
    Target pages have a <strong>{stall_ms}&nbsp;ms</strong> server stall.
  </p>
  <div class="buttons">
    <a id="btn-a" class="btn" href="/target.html?item=a">Alpha</a>
    <a id="btn-b" class="btn" href="/target.html?item=b">Beta</a>
    <a id="btn-c" class="btn" href="/target.html?item=c">Gamma</a>
    <a id="btn-d" class="btn" href="/target.html?item=d">Delta</a>
  </div>
  <footer>Hover a button to trigger prefetch, then click.</footer>
</div>
</body>
</html>
"""

TARGET_HTML = """<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Target · Speculation Rules Demo</title>
<style>
  html, body { height: 100%; margin: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
                 system-ui, sans-serif;
    background: #ffffff;
    color: #1c1d21;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0 24px;
  }
  h1 {
    margin: 0 0 10px;
    font-size: 40px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .caption {
    margin: 0 0 24px;
    color: #5c6370;
    font-size: 14px;
  }
  dl.metrics {
    display: grid;
    grid-template-columns: auto auto;
    gap: 8px 28px;
    margin: 0;
    font-variant-numeric: tabular-nums;
  }
  dl.metrics dt {
    margin: 0;
    color: #5c6370;
    font-size: 14px;
    font-weight: 500;
    text-align: right;
  }
  dl.metrics dd {
    margin: 0;
    color: #1c1d21;
    font-size: 15px;
    font-weight: 600;
    text-align: left;
    min-width: 7ch;
  }
</style>
</head>
<body>
<h1>Arrived</h1>
<p class="caption">Target page · 500&nbsp;ms server stall.</p>
<dl class="metrics">
  <dt>Delivery</dt>       <dd id="m-delivery">—</dd>
  <dt>Response time</dt>  <dd id="m-response">—</dd>
  <dt>FCP</dt>            <dd id="m-fcp">—</dd>
  <dt>LCP</dt>            <dd id="m-lcp">—</dd>
  <dt>Load time</dt>      <dd id="m-load">—</dd>
</dl>
<script>
  (function () {
    function ms(v) {
      return v == null || isNaN(v) ? "—" : Math.round(v) + " ms";
    }
    function set(id, txt) {
      var el = document.getElementById(id);
      if (el) el.textContent = txt;
    }

    var nav = performance.getEntriesByType("navigation")[0];
    if (nav) {
      set("m-delivery", nav.deliveryType || "network");
      set("m-response", ms(nav.responseStart));
    }

    try {
      new PerformanceObserver(function (list) {
        for (var entry of list.getEntries()) {
          if (entry.name === "first-contentful-paint") {
            set("m-fcp", ms(entry.startTime));
          }
        }
      }).observe({ type: "paint", buffered: true });
    } catch (e) {}

    try {
      new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        if (entries.length) {
          set("m-lcp", ms(entries[entries.length - 1].startTime));
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch (e) {}

    function updateLoad() {
      var n = performance.getEntriesByType("navigation")[0];
      if (n && n.loadEventEnd > 0) {
        set("m-load", ms(n.loadEventEnd));
      }
    }
    if (document.readyState === "complete") {
      setTimeout(updateLoad, 0);
    } else {
      window.addEventListener("load", function () {
        setTimeout(updateLoad, 0);
      });
    }
  })();
</script>
</body>
</html>
"""


class _Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _send(self, body):
        body_bytes = body.encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body_bytes)))
        # Give the cache entry a non-expired freshness lifetime; without it
        # nsPrefetchNode::OnStartRequest aborts speculation prefetches with
        # NS_BINDING_ABORTED ("document cannot be reused from cache").
        self.send_header("Cache-Control", "max-age=60")
        self.end_headers()
        self.wfile.write(body_bytes)

    def _send_404(self):
        self.send_response(HTTPStatus.NOT_FOUND)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/", "/landing.html"):
            self._send(
                LANDING_HTML_TEMPLATE.format(
                    rules=SPECULATION_RULES_TAG,
                    stall_ms=TARGET_STALL_MS,
                )
            )
        elif path == "/target.html":
            time.sleep(TARGET_STALL_MS / 1000.0)
            self._send(TARGET_HTML)
        else:
            self._send_404()

    def log_message(self, fmt, *args):
        LOG.info("demo-server: " + fmt % args)


class SpeculationRules(BasePythonSupport):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.httpd = None
        self.server_thread = None
        self.port = None

    def setup_test(self, test, args):
        super().setup_test(test, args)
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
        self.port = self.httpd.server_address[1]
        self.server_thread = threading.Thread(
            target=self.httpd.serve_forever, daemon=True
        )
        self.server_thread.start()
        LOG.info(f"SpeculationRules demo server: http://127.0.0.1:{self.port}/")

    def modify_command(self, cmd, test):
        cmd += [
            "--browsertime.server_url",
            f"http://127.0.0.1:{self.port}",
            # Target page renders its own Performance-API panel; this overlay
            # (desktop default) otherwise obscures it in the recording.
            "--videoParams.addTimer",
            "false",
        ]

    def handle_result(self, bt_result, raw_result, last_result=False, **kwargs):
        extras = raw_result.get("extras", [])
        if not extras or not isinstance(extras, list):
            return
        custom = extras[0].get("custom_data", {})
        for key in ("navigation_duration", "response_start"):
            val = custom.get(key)
            if val is None:
                continue
            try:
                bt_result["measurements"].setdefault(key, []).append(float(val))
            except (TypeError, ValueError):
                LOG.warning(f"SpeculationRules: non-numeric {key}={val!r}; skipped")
        delivery_type = custom.get("delivery_type")
        if delivery_type is not None:
            LOG.info(f"SpeculationRules delivery_type: {delivery_type!r}")

    def summarize_test(self, test, suite, **kwargs):
        # Perfherder schema requires subtests to be a list, not a dict.
        if suite.get("subtests") == {}:
            suite["subtests"] = []
        for name, replicates in test["measurements"].items():
            if not replicates:
                continue
            suite["subtests"].append(
                self._build_standard_subtest(test, replicates, name, should_alert=False)
            )
        suite["subtests"].sort(key=lambda st: st["name"])

    def clean_up(self):
        if self.httpd is not None:
            try:
                self.httpd.shutdown()
                self.httpd.server_close()
            except Exception as e:
                LOG.warning(f"SpeculationRules shutdown error: {e}")
        if self.server_thread is not None:
            self.server_thread.join(5)
