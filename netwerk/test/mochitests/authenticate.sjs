/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function handleRequest(request, response) {
  const expectedAuth = "Basic " + btoa("user:pass");

  let actualAuth = request.hasHeader("Authorization")
    ? request.getHeader("Authorization")
    : null;

  if (actualAuth === expectedAuth) {
    response.setStatusLine("1.1", 200, "OK");
    response.write("Authenticated");
  } else {
    response.setStatusLine("1.1", 401, "Unauthorized");
    response.setHeader("WWW-Authenticate", 'Basic realm="TestRealm"');
    response.write("Authentication required");
  }
}
