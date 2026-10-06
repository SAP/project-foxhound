// Server handler that counts requests per key and serves responses
// with configurable cache headers. Used to test prefetch cache behavior
// for bug 1527334.
function handleRequest(request, response) {
  let params = new URLSearchParams(request.queryString);
  let key = params.get("key") || "default";
  let mode = params.get("mode") || "content";

  if (mode === "count") {
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Content-Type", "text/plain", false);
    response.setHeader("Cache-Control", "no-store", false);
    let count = getSharedState(key) || "0";
    response.write(count);
    return;
  }

  if (mode === "reset") {
    setSharedState(key, "0");
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Content-Type", "text/plain", false);
    response.setHeader("Cache-Control", "no-store", false);
    response.write("reset");
    return;
  }

  // Content mode: increment counter and serve response
  let count = parseInt(getSharedState(key) || "0", 10) + 1;
  setSharedState(key, count.toString());

  response.setStatusLine(request.httpVersion, 200, "OK");
  let contentType = params.get("type") || "text/html";
  response.setHeader("Content-Type", contentType, false);

  let cacheControl = params.get("cache-control");
  if (cacheControl) {
    response.setHeader("Cache-Control", cacheControl, false);
  }
  // If no cache-control param, deliberately omit Cache-Control header
  // to simulate the bug 1527334 scenario.

  let vary = params.get("vary");
  if (vary) {
    response.setHeader("Vary", vary, false);
  }

  if (contentType === "application/javascript") {
    response.write("// prefetched script " + count);
  } else {
    let body = "<html><body>Prefetched content " + count;
    if (params.get("notify") === "opener") {
      let payload = JSON.stringify({
        type: "prefetch-nav-loaded",
        key,
        count,
      });
      body +=
        "<script>if (window.opener) { window.opener.postMessage(" +
        payload +
        ', "*"); }</' +
        "script>";
    }
    body += "</body></html>";
    response.write(body);
  }
}
