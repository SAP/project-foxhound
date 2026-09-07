/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

function handleRequest(request, response) {
  // Check if this is the initial request or the redirected request
  if (request.queryString.includes("redirected=true")) {
    // This is the redirected request - return normal content
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Content-Type", "text/html", false);
    response.setHeader("Cache-Control", "no-cache", false);

    let body =
      "<!DOCTYPE html><html><body><h1>Redirected Page</h1><p>This page was reached via 302 redirect</p></body></html>";
    response.write(body);
  } else {
    // This is the initial request - return 302 redirect with Set-Cookie
    response.setStatusLine(request.httpVersion, 302, "Found");
    response.setHeader("Location", request.path + "?redirected=true", false);
    response.setHeader(
      "Set-Cookie",
      "test-cookie=redirect-value; Path=/",
      false
    );
    response.setHeader("Cache-Control", "no-cache", false);

    // Optional body for 302 response
    response.write("Redirecting...");
  }
}
