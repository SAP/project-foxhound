"use strict";

function handleRequest(request, response) {
  response.setHeader("Cache-Control", "no-cache", false);

  const params = new URLSearchParams(request.queryString);
  let code = 200;
  if (params.has("code")) {
    code = parseInt(params.get("code"), 10);
  }
  let hasBody = params.get("body") === "1";

  response.setStatusLine(request.httpVersion, code, "Error");

  if (hasBody) {
    response.setHeader("Content-Type", "text/html", false);
    response.write(`<html><body>status=${code}</body></html>`);
  }
}
