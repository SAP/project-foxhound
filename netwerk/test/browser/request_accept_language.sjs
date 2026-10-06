"use strict";

function handleRequest(request, response) {
  const headers = request.getHeader("Accept-Language");
  response.setHeader("Content-Type", "text/plain", false);
  response.write(JSON.stringify(headers));
}
