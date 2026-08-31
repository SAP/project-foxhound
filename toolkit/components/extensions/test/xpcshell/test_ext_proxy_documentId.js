"use strict";

const server = createHttpServer({ hosts: ["example.com"] });

server.registerPathHandler("/page", (req, res) => {
  res.setStatusLine(req.httpVersion, 200, "OK");
  res.setHeader("Content-Type", "text/html", false);
  res.write(`<!DOCTYPE html><html><body>
    <img src="/img?resource">
    <img src="/img?resource2">
    <iframe src="/frame"></iframe>
  </body></html>`);
});

server.registerPathHandler("/frame", (req, res) => {
  res.setStatusLine(req.httpVersion, 200, "OK");
  res.setHeader("Content-Type", "text/html", false);
  res.write(`<!DOCTYPE html><html><body>
    <img src="/img?frame-resource">
  </body></html>`);
});

server.registerPathHandler("/img", (req, res) => {
  res.setStatusLine(req.httpVersion, 200, "OK");
  res.setHeader("Content-Type", "image/png", false);
});

add_task(async function test_proxy_documentId() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["proxy", "*://example.com/*"],
      content_scripts: [
        {
          matches: ["http://example.com/*"],
          js: ["cs.js"],
          all_frames: true,
        },
      ],
    },

    background() {
      const EXPECTED_URLS = [
        "http://example.com/page",
        "http://example.com/img?resource",
        "http://example.com/img?resource2",
        "http://example.com/frame",
        "http://example.com/img?frame-resource",
      ];

      let events = new Map();
      let csTopDocId, csFrameDocId;

      function maybeCheck() {
        if (
          !EXPECTED_URLS.every(url => events.has(url)) ||
          !csTopDocId ||
          !csFrameDocId
        ) {
          return;
        }

        let page = events.get("http://example.com/page");
        let resource = events.get("http://example.com/img?resource");
        let resource2 = events.get("http://example.com/img?resource2");
        let frame = events.get("http://example.com/frame");
        let frameResource = events.get("http://example.com/img?frame-resource");

        browser.test.assertEq(
          undefined,
          page.documentId,
          "main_frame has no documentId"
        );
        browser.test.assertEq(
          undefined,
          frame.documentId,
          "sub_frame has no documentId"
        );

        browser.test.assertEq(
          resource.documentId,
          resource2.documentId,
          "two resources from the same document share a documentId"
        );

        browser.test.assertTrue(
          resource.documentId !== frameResource.documentId,
          "different documents have different documentIds"
        );

        browser.test.assertEq(
          undefined,
          resource.parentDocumentId,
          "top-level resource has no parentDocumentId"
        );

        browser.test.assertEq(
          resource.documentId,
          frame.parentDocumentId,
          "sub_frame parentDocumentId identifies the embedding document"
        );
        browser.test.assertEq(
          resource.documentId,
          frameResource.parentDocumentId,
          "frame resource parentDocumentId identifies the embedding document"
        );

        browser.test.assertEq(
          resource.documentId,
          csTopDocId,
          "proxy.onRequest and runtime.getDocumentId agree on top-level document ID"
        );
        browser.test.assertEq(
          frameResource.documentId,
          csFrameDocId,
          "proxy.onRequest and runtime.getDocumentId agree on frame document ID"
        );

        browser.test.sendMessage("done");
      }

      browser.runtime.onMessage.addListener(msg => {
        if (msg.type === "top") {
          csTopDocId = msg.documentId;
        } else if (msg.type === "frame") {
          csFrameDocId = msg.documentId;
        }
        maybeCheck();
      });

      browser.proxy.onRequest.addListener(
        details => {
          events.set(details.url, details);
          maybeCheck();
        },
        { urls: ["*://example.com/*"] }
      );

      browser.test.sendMessage("ready");
    },

    files: {
      "cs.js"() {
        browser.runtime.sendMessage({
          type: window === window.top ? "top" : "frame",
          documentId: browser.runtime.getDocumentId(window),
        });
      },
    },
  });

  await extension.startup();
  await extension.awaitMessage("ready");
  let contentPage = await ExtensionTestUtils.loadContentPage(
    "http://example.com/page"
  );
  await extension.awaitMessage("done");
  await contentPage.close();
  await extension.unload();
});
