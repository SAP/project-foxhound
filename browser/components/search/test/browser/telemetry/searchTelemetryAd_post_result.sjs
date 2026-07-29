/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

function handleRequest(request, response) {
  response.setHeader("Cache-Control", "no-cache, must-revalidate", false);
  response.setHeader("Content-Type", "text/html;charset=utf-8", false);
  response.write(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <a id="ad1" href="https://example.com/ad">Ad link</a>
  <a id="ad2" href="https://example.com/ad2">Second Ad link</a>
  <a id="non_ad" href="https://example.com/non-ad">Non-ad link</a>
</body>
</html>`);
}
