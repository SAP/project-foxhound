"use strict";

let { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

// Sends a 103 Early Hint for square2.png immediately, then delays the 200
// response to ensure the parent-connect-timeout fires first (bug 1829935).
function handleRequest(_request, response) {
  response.seizePower();

  response.write(
    `HTTP/1.1 103 Early Hint\r\n` +
      `Link: <https://example.com/browser/netwerk/test/browser/square2.png>;` +
      ` rel=preload; as=image\r\n` +
      `\r\n`
  );

  setTimeout(() => {
    let body = `<!DOCTYPE html>
<html>
<body>

</body>
</html>
`;
    response.write(
      `HTTP/1.1 200 OK\r\n` +
        `Content-Type: text/html;charset=utf-8\r\n` +
        `Cache-Control: no-cache\r\n` +
        `Content-Length: ${body.length}\r\n` +
        `\r\n` +
        body
    );
    response.finish();
  }, 500);
}
