/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * A page that performs 301 redirection to the given 'src'.
 */

"use strict";

function handleRequest(request, response) {
  let query = new URLSearchParams(request.queryString);

  // The 'src' must be included.
  if (!query.has("src")) {
    throw Error("No 'src' in the query string");
  }

  response.setStatusLine(request.httpVersion, 301, "Moved Permanently");
  response.setHeader("Location", query.get("src"));
  response.setHeader("Cache-Control", "no-cache", false);

  // Optional body for 301 response
  response.write("Redirecting...");
}
