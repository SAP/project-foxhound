"use strict";

const server = createHttpServer({ hosts: ["example.com"] });

const staticImportHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <meta charset=utf-8>
  <body>
  <script type="module">
    import text from './test.txt' with { type: 'text' };
  </script>
  </body></html>`;

const dynamicImportHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <meta charset=utf-8>
  <body>
  <script type="module">
    import('./test.txt', { with: { type: 'text' } });
  </script>
  </body></html>`;

server.registerPathHandler("/static-import.html", (request, response) => {
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.setHeader("Content-Type", "text/html", false);
  response.write(staticImportHtml);
});

server.registerPathHandler("/dynamic-import.html", (request, response) => {
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.setHeader("Content-Type", "text/html", false);
  response.write(dynamicImportHtml);
});

server.registerPathHandler("/test.txt", (request, response) => {
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.setHeader("Content-Type", "text/plain", false);
  response.write("hello");
});

add_task(async function test_static_import() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["webRequest", "webRequestBlocking", "<all_urls>"],
    },
    background() {
      browser.webRequest.onBeforeRequest.addListener(
        async details => {
          browser.test.assertEq("other", details.type);
          browser.test.notifyPass("webRequest");
        },
        { urls: ["*://example.com/test.txt"] },
        ["blocking"]
      );
    },
  });
  await extension.startup();

  let contentPage = await ExtensionTestUtils.loadContentPage(
    "http://example.com/static-import.html"
  );

  await extension.awaitFinish("webRequest");

  await extension.unload();
  await contentPage.close();
});

add_task(async function test_dynamic_import() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["webRequest", "webRequestBlocking", "<all_urls>"],
    },
    background() {
      browser.webRequest.onBeforeRequest.addListener(
        async details => {
          browser.test.assertEq("http://example.com/test.txt", details.url);
          browser.test.assertEq("other", details.type);
          browser.test.notifyPass("webRequest");
        },
        { urls: ["<all_urls>"], types: ["other"] },
        ["blocking"]
      );
    },
  });
  await extension.startup();

  let contentPage = await ExtensionTestUtils.loadContentPage(
    "http://example.com/dynamic-import.html"
  );

  await extension.awaitFinish("webRequest");

  await extension.unload();
  await contentPage.close();
});
