"use strict";

const server = createHttpServer({ hosts: ["example.com"] });
server.registerPathHandler("/test", (request, response) => {
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.setHeader("Content-Type", "text/html", false);
  response.write("<!DOCTYPE html><html><body></body></html>");
});

async function testStructuredClone(legacyPref) {
  Services.prefs.setBoolPref(
    "extensions.webextensions.legacyStructuredCloneBehavior",
    legacyPref
  );

  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      content_scripts: [
        {
          matches: ["http://example.com/test"],
          js: ["cs.js"],
        },
      ],
    },
    files: {
      "cs.js"() {
        /* globals cloneInto, structuredClone */
        browser.test.assertTrue(
          location.hash == "#true" || location.hash == "#false",
          "unexpected legacy pref value"
        );

        function isWindow(obj, desc) {
          browser.test.assertTrue(
            obj instanceof window.Object,
            `${desc}: is a window.Object`
          );
          browser.test.assertFalse(
            obj instanceof Object,
            `${desc}: is not a sandbox.Object`
          );
        }
        function isSandbox(obj, desc) {
          browser.test.assertTrue(
            obj instanceof Object,
            `${desc}: is a sandbox.Object`
          );
          browser.test.assertFalse(
            obj instanceof window.Object,
            `${desc}: is not a window.Object`
          );
        }

        let sbObj = { a: 1 };
        let winObj = cloneInto(sbObj, window);
        let winBlob = new Blob(["test"]);
        let sbBlob = cloneInto(winBlob, globalThis);

        // Confirm that our initial objects are in the expected globals.
        // NOTE: The original blob was constructed in the Window (as the 'Blob'
        // constructor is provided by Window).
        isWindow(winObj, "winObj");
        isSandbox(sbObj, "sbObj");
        isWindow(winBlob, "winBlob");
        isSandbox(sbBlob, "sbBlob");

        // structuredClone(obj) should always clone into the sandbox
        isSandbox(structuredClone(winObj), "structuredClone(winObj)");
        isSandbox(
          globalThis.structuredClone(winObj),
          "globalThis.structuredClone(winObj)"
        );
        isSandbox(structuredClone(sbObj), "structuredClone(sbObj)");
        isSandbox(
          globalThis.structuredClone(sbObj),
          "globalThis.structuredClone(sbObj)"
        );

        // structuredClone(blob) depends on the legacy pref
        let blobAssertion = location.hash == "#true" ? isWindow : isSandbox;
        blobAssertion(structuredClone(winBlob), "structuredClone(winBlob)");
        blobAssertion(
          globalThis.structuredClone(winBlob),
          "globalThis.structuredClone(winBlob)"
        );
        blobAssertion(structuredClone(sbBlob), "structuredClone(sbBlob)");
        blobAssertion(
          globalThis.structuredClone(sbBlob),
          "globalThis.structuredClone(sbBlob)"
        );

        // window.structuredClone(...) always clones into the window global
        isWindow(
          window.structuredClone(winObj),
          "window.structuredClone(winObj)"
        );
        isWindow(
          window.structuredClone(sbObj),
          "window.structuredClone(sbObj)"
        );
        isWindow(
          window.structuredClone(winBlob),
          "window.structuredClone(winBlob)"
        );
        isWindow(
          window.structuredClone(sbBlob),
          "window.structuredClone(sbBlob)"
        );

        // Also test the behaviour of returned xrays. In non-window cases,
        // there should be no xrays, but when calling window.structuredClone
        // there are xrays, which will prevent adding function properties.
        structuredClone(winObj).x = function () {};
        globalThis.structuredClone(winObj).x = function () {};
        browser.test.assertThrows(
          () => (window.structuredClone(winObj).x = function () {}),
          /Not allowed to define cross-origin object as property/,
          "window.structuredClone(winObj) should be an xray wrapper"
        );

        structuredClone(sbObj).x = function () {};
        globalThis.structuredClone(sbObj).x = function () {};
        browser.test.assertThrows(
          () => (window.structuredClone(sbObj).x = function () {}),
          /Not allowed to define cross-origin object as property/,
          "window.structuredClone(sbObj) should be an xray wrapper"
        );

        browser.test.sendMessage("done");
      },
    },
  });

  await extension.startup();
  let contentPage = await ExtensionTestUtils.loadContentPage(
    `http://example.com/test#${legacyPref}`
  );
  await extension.awaitMessage("done");
  await contentPage.close();
  await extension.unload();
}

add_task(async function test_structuredClone_legacy() {
  await testStructuredClone(true);
});

add_task(async function test_structuredClone_nonlegacy() {
  await testStructuredClone(false);
});
