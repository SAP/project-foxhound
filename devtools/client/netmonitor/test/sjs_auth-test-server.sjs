/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

function handleRequest(request, response) {
  // "Z3Vlc3Q6Z3Vlc3Q=" == btoa("guest:guest")
  const expectedHeader = "Basic Z3Vlc3Q6Z3Vlc3Q=";

  if (
    request.hasHeader("Authorization") &&
    request.getHeader("Authorization") == expectedHeader
  ) {
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Content-Type", "text/plain", false);
    response.write("success");
  } else {
    response.setStatusLine(request.httpVersion, 401, "Unauthorized");
    response.setHeader("WWW-Authenticate", 'Basic realm="secret"', false);
    response.setHeader("Content-Type", "text/plain", false);
    response.write("auth required");
  }
}
