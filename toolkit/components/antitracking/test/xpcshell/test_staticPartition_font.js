/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

const { CookieXPCShellUtils } = ChromeUtils.importESModule(
  "resource://testing-common/CookieXPCShellUtils.sys.mjs"
);

CookieXPCShellUtils.init(this);

let gHits = 0;

add_task(async function () {
  do_get_profile();

  Services.prefs.setIntPref("network.cookie.cookieBehavior", 0);

  const server = CookieXPCShellUtils.createServer({
    hosts: ["example.org", "foo.com", "bar.com"],
  });

  server.registerFile(
    "/font.woff",
    do_get_file("data/font.woff"),
    (_, response) => {
      response.setHeader("Access-Control-Allow-Origin", "*", false);
      gHits++;
    }
  );

  server.registerPathHandler("/font", (request, response) => {
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Content-Type", "text/html", false);
    let body = `
      <style type="text/css">
        @font-face {
          font-family: foo;
          src: url("http://example.org/font.woff") format('woff');
        }
        body { font-family: foo }
      </style>
      <iframe src="http://example.org/font-iframe"></iframe>
      <script>
        window._allFontsReady = Promise.all([
          document.fonts.ready,
          new Promise(resolve => window.addEventListener("message", function handler(e) {
            if (e.data === "iframe-fonts-ready") {
              window.removeEventListener("message", handler);
              resolve();
            }
          }))
        ]);
      </script>`;
    response.bodyOutputStream.write(body, body.length);
  });

  server.registerPathHandler("/font-iframe", (request, response) => {
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Content-Type", "text/html", false);
    let body = `
      <style type="text/css">
        @font-face {
          font-family: foo;
          src: url("http://example.org/font.woff") format('woff');
        }
        body { font-family: foo }
      </style>
      <script>
        document.fonts.ready.then(() => window.parent.postMessage("iframe-fonts-ready", "*"));
      </script>`;
    response.bodyOutputStream.write(body, body.length);
  });

  const hitsCount = 5;

  info("Clear network caches");
  Services.cache2.clear();

  info("Reset the hits count");
  gHits = 0;

  info("Let's load pages with origins A, B, and C");
  const [pageA, pageB, pageC] = await Promise.all([
    CookieXPCShellUtils.loadContentPage("http://example.org/font"),
    CookieXPCShellUtils.loadContentPage("http://foo.com/font"),
    CookieXPCShellUtils.loadContentPage("http://bar.com/font"),
  ]);
  const allFontsReady = await Promise.all([
    pageA.spawn([], function () {
      return this.content.wrappedJSObject._allFontsReady.then(() => true);
    }),
    pageB.spawn([], function () {
      return this.content.wrappedJSObject._allFontsReady.then(() => true);
    }),
    pageC.spawn([], function () {
      return this.content.wrappedJSObject._allFontsReady.then(() => true);
    }),
  ]);
  Assert.deepEqual(
    allFontsReady,
    [true, true, true],
    "_allFontsReady should be defined in all pages"
  );
  await Promise.all([pageA.close(), pageB.close(), pageC.close()]);

  Assert.equal(gHits, hitsCount, "The number of hits match");
});
