"use strict";

const { ExtensionDocumentId } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionDocumentId.sys.mjs"
);

const server = createHttpServer({ hosts: ["example.com"] });

server.registerPathHandler("/page", (req, res) => {
  res.setStatusLine(req.httpVersion, 200, "OK");
  res.setHeader("Content-Type", "text/html", false);
  res.write(`<!DOCTYPE html><html><body>
    <img src="/img?resource">
    <img src="/img?resource2">
    <img src="/redirect-source">
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

server.registerPathHandler("/redirect-source", (req, res) => {
  res.setStatusLine(req.httpVersion, 302, "Found");
  res.setHeader("Location", "/img?redirect-target", false);
});

// Navigation trigger test: one frame navigates its sibling and itself.
server.registerPathHandler("/nav-trigger-page", (req, res) => {
  res.setStatusLine(req.httpVersion, 200, "OK");
  res.setHeader("Content-Type", "text/html", false);
  res.write(`<!DOCTYPE html><html><body>
    <iframe src="/html?nav-target"></iframe>
    <iframe src="/nav-actor"></iframe>
  </body></html>`);
});

// nav-actor navigates /html?nav-target (sibling nav) and itself (self nav) on load.
server.registerPathHandler("/nav-actor", (req, res) => {
  res.setStatusLine(req.httpVersion, 200, "OK");
  res.setHeader("Content-Type", "text/html", false);
  res.write(`<!DOCTYPE html><html><body>
    <script>
      parent.frames[0].location.href = "/html?nav-target-by-sibling";
      window.location.href = "/html?nav-actor-self";
    </script>
  </body></html>`);
});

server.registerPathHandler("/html", (req, res) => {
  res.setStatusLine(req.httpVersion, 200, "OK");
  res.setHeader("Content-Type", "text/html", false);
  res.write("Dummy");
});

server.registerPathHandler("/embedder-of-worker-page", (req, res) => {
  res.setStatusLine(req.httpVersion, 200, "OK");
  res.setHeader("Content-Type", "text/html", false);
  res.write(`<!DOCTYPE html><html><body>
    <iframe src="/worker-page"></iframe>
  </body></html>`);
});

server.registerPathHandler("/worker-page", (req, res) => {
  res.setStatusLine(req.httpVersion, 200, "OK");
  res.setHeader("Content-Type", "text/html", false);
  res.write(`<!DOCTYPE html><html><body>
    <script>
      new Worker("/dedicated-worker.js");
      new SharedWorker("/shared-worker.js");
    </script>
  </body></html>`);
});

server.registerPathHandler("/dedicated-worker.js", (req, res) => {
  res.setStatusLine(req.httpVersion, 200, "OK");
  res.setHeader("Content-Type", "application/javascript", false);
  res.write(`fetch("/img?worker-fetch");`);
});

server.registerPathHandler("/shared-worker.js", (req, res) => {
  res.setStatusLine(req.httpVersion, 200, "OK");
  res.setHeader("Content-Type", "application/javascript", false);
  res.write(`onconnect = e => { fetch("/img?shared-worker-fetch"); };`);
});

add_task(async function test_webRequest_documentId() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["webRequest", "*://example.com/*"],
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
        "http://example.com/redirect-source",
        "http://example.com/img?redirect-target",
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
        let redirectSource = events.get("http://example.com/redirect-source");
        let redirectTarget = events.get(
          "http://example.com/img?redirect-target"
        );
        let frame = events.get("http://example.com/frame");
        let frameResource = events.get("http://example.com/img?frame-resource");

        // Navigation requests have no documentId (document not yet committed).
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

        // Multiple requests from the same document share a documentId.
        browser.test.assertEq(
          resource.documentId,
          resource2.documentId,
          "two resources from the same document share a documentId"
        );

        // Resources in different documents have different documentIds.
        browser.test.assertTrue(
          resource.documentId !== frameResource.documentId,
          "different documents have different documentIds"
        );

        // The top-level document has no parent.
        browser.test.assertEq(
          undefined,
          resource.parentDocumentId,
          "top-level resource has no parentDocumentId"
        );

        // Both the sub_frame navigation and its subresource report the
        // top-level document as their parent.
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

        // A redirected subresource keeps the same documentId across the
        // redirect chain (same channel, same cached ChannelWrapper value).
        browser.test.assertEq(
          resource.documentId,
          redirectSource.documentId,
          "redirected resource has the same documentId as other top-level subresources"
        );
        browser.test.assertEq(
          redirectSource.documentId,
          redirectTarget.documentId,
          "documentId is stable across a redirect"
        );

        // runtime.getDocumentId in a content script must agree with webRequest.
        browser.test.assertEq(
          resource.documentId,
          csTopDocId,
          "webRequest and runtime.getDocumentId agree on top-level document ID"
        );
        browser.test.assertEq(
          frameResource.documentId,
          csFrameDocId,
          "webRequest and runtime.getDocumentId agree on frame document ID"
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

      browser.webRequest.onBeforeRequest.addListener(
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

// parentDocumentId must be the embedding document's ID regardless of which
// document triggered the navigation (self, sibling, or parent).
add_task(async function test_webRequest_navigation_trigger_parentDocumentId() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["webRequest", "*://example.com/*"],
    },
    background() {
      const EXPECTED_URLS = [
        "http://example.com/html?nav-target",
        "http://example.com/nav-actor",
        "http://example.com/html?nav-target-by-sibling",
        "http://example.com/html?nav-actor-self",
      ];

      let events = new Map();

      function maybeCheck() {
        if (!EXPECTED_URLS.every(url => events.has(url))) {
          return;
        }

        let navTarget = events.get("http://example.com/html?nav-target");
        let navActor = events.get("http://example.com/nav-actor");
        let navTargetBySibling = events.get(
          "http://example.com/html?nav-target-by-sibling"
        );
        let navActorSelf = events.get("http://example.com/html?nav-actor-self");

        browser.test.assertEq(
          navTarget.parentDocumentId,
          navActor.parentDocumentId,
          "two sibling frames share parentDocumentId"
        );
        browser.test.assertEq(
          navTarget.parentDocumentId,
          navTargetBySibling.parentDocumentId,
          "sibling-triggered navigation has the same parentDocumentId as the initial load"
        );
        browser.test.assertEq(
          navTarget.parentDocumentId,
          navActorSelf.parentDocumentId,
          "self-triggered navigation has the same parentDocumentId as the initial load"
        );

        browser.test.sendMessage("done");
      }

      browser.webRequest.onBeforeRequest.addListener(
        details => {
          events.set(details.url, details);
          maybeCheck();
        },
        { urls: ["*://example.com/*"] }
      );

      browser.test.sendMessage("ready");
    },
  });

  await extension.startup();
  await extension.awaitMessage("ready");
  let contentPage = await ExtensionTestUtils.loadContentPage(
    "http://example.com/nav-trigger-page"
  );
  await extension.awaitMessage("done");
  await contentPage.close();
  await extension.unload();
});

async function do_test_webRequest_worker_documentId(withFrame) {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: { permissions: ["webRequest", "*://example.com/*"] },
    background() {
      const EXPECTED_URLS = [
        "http://example.com/dedicated-worker.js",
        "http://example.com/img?worker-fetch",
        "http://example.com/shared-worker.js",
        "http://example.com/img?shared-worker-fetch",
      ];

      let events = new Map();

      let pageDocumentIdPromise = new Promise(resolve => {
        browser.test.onMessage.addListener((msg, id) => {
          browser.test.assertEq("pageDocumentId", msg, "Got message");
          browser.test.assertTrue(id, `got documentId: ${id}`);
          resolve(id);
        });
      });

      async function maybeCheck() {
        if (!EXPECTED_URLS.every(url => events.has(url))) {
          return;
        }

        let dedicatedWorkerScript = events.get(
          "http://example.com/dedicated-worker.js"
        );
        let dedicatedFetch = events.get("http://example.com/img?worker-fetch");
        let sharedWorkerScript = events.get(
          "http://example.com/shared-worker.js"
        );
        let sharedFetch = events.get(
          "http://example.com/img?shared-worker-fetch"
        );

        const pageDocumentId = await pageDocumentIdPromise;

        browser.test.assertEq(
          pageDocumentId,
          dedicatedWorkerScript.documentId,
          "dedicated Worker script has documentId set to the requesting page"
        );
        browser.test.assertEq(
          undefined,
          dedicatedFetch.documentId,
          "dedicated worker fetch has no documentId"
        );
        browser.test.assertEq(
          undefined,
          dedicatedFetch.parentDocumentId,
          "dedicated worker fetch has no parentDocumentId"
        );

        // Note: differs from Chrome, which sets documentId to the document
        // that initiated the SharedWorker request.
        browser.test.assertEq(
          undefined,
          sharedWorkerScript.documentId,
          "SharedWorker script has no documentId (no single owning document)"
        );
        browser.test.assertEq(
          undefined,
          sharedFetch.documentId,
          "shared worker fetch has no documentId (no single owning document)"
        );
        browser.test.assertEq(
          undefined,
          sharedFetch.parentDocumentId,
          "shared worker fetch has no parentDocumentId"
        );

        browser.test.sendMessage("done");
      }

      browser.webRequest.onBeforeRequest.addListener(
        details => {
          events.set(details.url, details);
          maybeCheck();
        },
        { urls: ["*://example.com/*"] }
      );

      browser.test.sendMessage("ready");
    },
  });

  await extension.startup();
  await extension.awaitMessage("ready");
  let contentPage = await ExtensionTestUtils.loadContentPage(
    `http://example.com/${withFrame ? "embedder-of-" : ""}worker-page`
  );
  let innerWindowId;
  if (withFrame) {
    let bc = contentPage.browser.browsingContext.children[0];
    innerWindowId = bc.currentWindowGlobal.innerWindowId;
  } else {
    innerWindowId = contentPage.browser.innerWindowID;
  }
  extension.sendMessage(
    "pageDocumentId",
    ExtensionDocumentId.getDocumentId(innerWindowId)
  );
  await extension.awaitMessage("done");
  await contentPage.close();
  await extension.unload();
}

// Workers created in top frame.
add_task(async function test_webRequest_top_document_worker_documentId() {
  await do_test_webRequest_worker_documentId(/* withFrame */ false);
});

// Workers created in sub frame. We have this extra test separate from
// test_webRequest_top_document_worker_documentId because parentDocumentId is
// trivially undefined for requests in top frames, and we want extra coverage
// for its behavior. Independently of where the worker was created, the
// requests within the worker should behave consistently.
add_task(async function test_webRequest_sub_document_worker_documentId() {
  await do_test_webRequest_worker_documentId(/* withFrame */ true);
});
