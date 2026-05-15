/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

function handleRequest(request, response) {
  response.setHeader("Content-Type", "text/html", false);
  response.setHeader("Cache-Control", "no-cache", false);

  // Get the target URL from the query string
  const params = new URLSearchParams(request.queryString);
  const targetURL = params.get("target") || "about:blank";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Link Hover Test</title>
</head>
<body>
  <h1>Link Hover Speculative Connection Test</h1>
  <a id="testLink" href="${targetURL}">Test Link</a>
</body>
</html>`;

  response.write(html);
}
