"use strict";

function handleRequest(request, response) {
  response.setHeader("Content-Type", "text/html", false);
  response.setHeader("Cache-Control", "no-cache", false);
  // Wait a bit.
  var s = Date.now();
  // eslint-disable-next-line no-empty
  while (Date.now() - s < 1000) {}

  response.write(`<!DOCTYPE HTML>
  <html>
    <body>
     bar
    </body>
  </html>
  `);
}
