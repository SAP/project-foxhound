/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";
const { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);
async function handleRequest(request, response) {
  response.seizePower();
  await new Promise(r => setTimeout(r, 3000));
  response.write("HTTP/1.1 302 Found\r\n");
  response.write("Location: https://example.com/\r\n");
  response.write("Content-Length: 0\r\n");
  response.write("\r\n");
  response.finish();
}
