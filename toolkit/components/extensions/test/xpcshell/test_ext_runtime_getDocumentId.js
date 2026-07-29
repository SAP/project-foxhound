/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// example.com used for same-origin test, example.net for cross-origin.
const server = createHttpServer({ hosts: ["example.com", "example.net"] });
server.registerPathHandler("/child", () => {});
server.registerPathHandler("/iframe_embed_object", (request, response) => {
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.setHeader("Content-Type", "text/html; charset=utf-8", false);
  response.write(`
    <iframe src="http://example.com/child?iframe"></iframe>
    <embed src="http://example.com/child?embed"></embed>
    <object data="http://example.com/child?object"></object>
  `);
});

add_task(async function test_getDocumentId_invalid() {
  let extension = ExtensionTestUtils.loadExtension({
    background() {
      let proxy = new Proxy(window, {});
      let proto = Object.create(window);

      class FakeFrame extends HTMLIFrameElement {
        constructor() {
          super();
        }
      }
      customElements.define("fake-frame", FakeFrame, { extends: "iframe" });
      let custom = document.createElement("fake-frame");

      let invalid = [null, 13, "blah", document.body, proxy, proto, custom];

      for (let value of invalid) {
        browser.test.assertThrows(
          () => browser.runtime.getDocumentId(value),
          "Invalid argument: target is not a valid window or frame element.",
          "Correct exception thrown."
        );
      }

      let iframe = document.createElement("iframe");
      browser.test.assertThrows(
        () => browser.runtime.getDocumentId(iframe),
        "Could not determine document for target.",
        "getDocumentId throws for detached iframe."
      );

      document.body.append(iframe);

      // Sanity check: we do not always throw, we can get a value.
      browser.test.assertTrue(
        browser.runtime.getDocumentId(iframe),
        "getDocumentId returns ID not when iframe is live."
      );

      let removedWindow = iframe.contentWindow;

      iframe.remove();
      browser.test.assertThrows(
        () => browser.runtime.getDocumentId(iframe),
        "Could not determine document for target.",
        "getDocumentId throws for removed iframe element."
      );
      browser.test.assertThrows(
        () => browser.runtime.getDocumentId(removedWindow),
        "Could not determine document for target.",
        "getDocumentId throws for contentWindow of removed iframe."
      );

      browser.test.sendMessage("done");
    },
  });

  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
});

// Verifies that runtime.getDocumentId() accepts window, iframe, object, embed,
// frameset frame, and that the documentId is consistent inside/outside.
async function do_test_getDocumentId_consistent_across_frames(isXorigin) {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      content_scripts: [
        {
          matches: ["*://*/iframe_embed_object"],
          js: ["cs_top.js"],
          run_at: "document_start", // Register onmessage before frame load.
        },
        {
          matches: ["*://*/child*"],
          js: ["cs_frame.js"],
          all_frames: true,
        },
      ],
    },

    files: {
      "cs_top.js"() {
        let receivedMessageCount = 0;
        let seenUUIDs = new Set();
        window.onmessage = e => {
          browser.test.log(`Received message: ${JSON.stringify(e.message)}`);
          ++receivedMessageCount;

          const { tagName } = e.data;
          browser.test.assertEq(
            browser.runtime.getDocumentId(window),
            e.data.topUUID,
            `getDocumentId of top document is same as getDocumentId(parent) inside ${tagName}`
          );

          const elem = document.querySelector(tagName);
          browser.test.assertEq(
            browser.runtime.getDocumentId(elem),
            e.data.frameUUID,
            `getDocumentId on ${tagName} element returns same as script inside`
          );
          // e.source is equivalent to elem.contentWindow for iframe, but not
          // all elements (object/embed) support that, so we use e.source.
          browser.test.assertEq(
            browser.runtime.getDocumentId(e.source),
            e.data.frameUUID,
            `getDocumentId on ${tagName}'s window returns same as script inside`
          );

          seenUUIDs.add(e.data.frameUUID);
          browser.test.assertEq(
            seenUUIDs.size,
            receivedMessageCount,
            "UUID from different documents are unique"
          );

          browser.test.sendMessage(`done:${tagName}`);

          if (receivedMessageCount === 3) {
            // Got all messages from iframe, embed, object. Need to replace
            // body with <frameset>. We could not include this in the main
            // test page because <frameset> is mutually exclusive with <body>.
            let frameset = document.createElement("frameset");
            let frame = document.createElement("frame");
            frame.src = "http://example.com/child?frame";
            frameset.append(frame);
            document.body.replaceWith(frameset);
          }
        };
      },
      "cs_frame.js"() {
        const tagName = location.search.slice(1);
        const UUID_RE =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
        const frameUUID = browser.runtime.getDocumentId(window);
        browser.test.assertTrue(UUID_RE.test(frameUUID), `UUID in ${tagName}`);

        parent.postMessage(
          {
            tagName,
            frameUUID,
            topUUID: browser.runtime.getDocumentId(parent),
          },
          "*"
        );
      },
    },
  });

  await extension.startup();

  const baseUrl = isXorigin ? "http://example.net" : "http://example.com";
  let contentPage = await ExtensionTestUtils.loadContentPage(
    `${baseUrl}/iframe_embed_object`
  );
  await Promise.all([
    extension.awaitMessage("done:iframe"),
    extension.awaitMessage("done:embed"),
    extension.awaitMessage("done:object"),
    extension.awaitMessage("done:frame"),
  ]);
  await contentPage.close();

  await extension.unload();
}

add_task(async function test_getDocumentId_same_origin_frames() {
  await do_test_getDocumentId_consistent_across_frames(/* isXorigin */ false);
});

add_task(async function test_getDocumentId_cross_origin_frames() {
  await do_test_getDocumentId_consistent_across_frames(/* isXorigin */ true);
});
