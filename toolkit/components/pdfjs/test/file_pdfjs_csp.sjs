// Serves a minimal PDF together with a `sandbox` CSP directive, which is
// ignored for the PDF response and so never sets SANDBOXED_DOWNLOADS.
function handleRequest(request, response) {
  response.setHeader("Cache-Control", "no-cache", false);
  response.setHeader(
    "Content-Security-Policy",
    "sandbox allow-scripts allow-same-origin",
    false
  );
  response.setHeader("Content-Type", "application/pdf", false);
  response.setStatusLine(request.httpVersion, "200", "OK");
  response.write(
    "%PDF-1.\ntrailer<</Root<</Pages<</Kids[<</MediaBox[0 0 3 3]>>]>>>>>>"
  );
}
