"use strict";

const BOUNDARY = "boundary";
const JSON = `Content-Type: application/vnd.mozilla.json.view

{ "hello": "world" }`;

const HTML = `Content-Type: text/html

<html>
  <body>Test multipart</body>
</html>`;

async function handleRequest(request, response) {
  response.processAsync();

  response.setHeader(
    "Content-Type",
    `multipart/x-mixed-replace; boundary=${BOUNDARY}`,
    false
  );
  response.setStatusLine(request.httpVersion, "200", "OK");

  response.write(`--${BOUNDARY}\n`);
  response.write(`${JSON}\n`);
  response.write(`--${BOUNDARY}\n`);

  await sleep(1000);

  response.write(`${HTML}\n`);
  response.write(`--${BOUNDARY}--\n`);
  response.finish();
}

function sleep(delay) {
  return new Promise(res =>
    Cc["@mozilla.org/timer;1"]
      .createInstance(Ci.nsITimer)
      .init(res, delay, Ci.nsITimer.TYPE_ONE_SHOT)
  );
}
