/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { ExtensionDocumentId } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionDocumentId.sys.mjs"
);

add_task(async function test_runtime_getContexts() {
  function background() {
    browser.test.onMessage.addListener(async (msg, ...args) => {
      if (msg === "runtime.getContexts") {
        try {
          const filter = args[0];
          if (!filter) {
            // Expected to be rejected.
            await browser.runtime.getContexts();
          } else {
            // Expected to be resolved.
            const result = await browser.runtime.getContexts(filter);
            browser.test.sendMessage(`${msg}:result`, result);
          }
        } catch (err) {
          browser.test.log(`runtime.getContexts error: ${err}\n`);
          browser.test.sendMessage(`${msg}:error`, String(err));
        }
      }
    });
    browser.test.sendMessage(
      "bgpage:loaded",
      browser.runtime.getDocumentId(window)
    );
  }

  const extension = ExtensionTestUtils.loadExtension({
    manifest: {
      manifest_version: 3,
    },
    background,
    files: {
      "tab.html": `<!DOCTYPE html><html></html>`,
    },
  });

  await extension.startup();
  const bgDocumentId = await extension.awaitMessage("bgpage:loaded");

  const documentOrigin = extension.extension.baseURI.spec.slice(0, -1);
  const tabDocumentUrl = extension.extension.baseURI.resolve("tab.html");
  const bgDocumentUrl = extension.extension.baseURI.resolve(
    "_generated_background_page.html"
  );

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const assertValidDocumentId = documentId => {
    Assert.ok(
      UUID_RE.test(documentId),
      `documentId should be a UUID, got: ${documentId}`
    );
  };

  assertValidDocumentId(bgDocumentId);

  let expectedBackground = {
    contextType: "BACKGROUND",
    documentId: bgDocumentId,
    documentOrigin,
    documentUrl: bgDocumentUrl,
    incognito: false,
    frameId: 0,
    tabId: -1,
    windowId: -1,
  };

  let expectedTab = {
    contextType: "TAB",
    documentId: undefined, // populated after loadContentPage
    documentOrigin,
    documentUrl: `${tabDocumentUrl}?fistOpenedTab=true`,
    incognito: false,
    frameId: 0,
    // tabId and windowId are expected to be -1 in xpcshell test
    // (these are also covered by browser_ext_getContexts.js).
    tabId: -1,
    windowId: -1,
  };

  const assertValidContextId = contextId => {
    Assert.equal(
      typeof contextId,
      "string",
      "contextId should be set to a string"
    );
    Assert.notEqual(
      contextId.length,
      0,
      "contextId should be set to a non-zero length string"
    );
  };
  const assertGetContextsResult = (
    actual,
    expected,
    msg,
    { assertContextId = false } = {}
  ) => {
    const actualCopy = assertContextId ? actual : actual.map(it => ({ ...it }));
    if (!assertContextId) {
      actualCopy.forEach(it => delete it.contextId);
    }
    Assert.deepEqual(actualCopy, expected, msg);
  };

  info(
    "Test runtime.getContexts rejects when called without any filter parameter"
  );
  extension.sendMessage("runtime.getContexts", undefined);
  let resError = await extension.awaitMessage("runtime.getContexts:error");
  Assert.equal(
    resError,
    "Error: Incorrect argument types for runtime.getContexts.",
    "Got the expected error message"
  );

  info(
    "Test runtime.getContext resolved when called with an empty filter parameter"
  );

  extension.sendMessage("runtime.getContexts", {});
  let res = await extension.awaitMessage("runtime.getContexts:result");

  assertGetContextsResult(
    res,
    [expectedBackground],
    "Got the expected properties for the background context"
  );

  let actualBackground = res[0];
  assertValidContextId(actualBackground.contextId);

  const page = await ExtensionTestUtils.loadContentPage(
    `${tabDocumentUrl}?fistOpenedTab=true`
  );

  expectedTab.documentId = ExtensionDocumentId.getDocumentId(
    page.browser.innerWindowID
  );
  assertValidDocumentId(expectedTab.documentId);
  Assert.notEqual(
    bgDocumentId,
    expectedTab.documentId,
    "Background and tab contexts have different documentIds"
  );

  res = await page.spawn([], () =>
    this.content.wrappedJSObject.browser.runtime.getContexts({})
  );

  const bgItem = res.find(it => it.contextType === "BACKGROUND");
  const tabItem = res.find(it => it.contextType === "TAB");

  assertValidContextId(tabItem.contextId);

  assertGetContextsResult(
    res,
    [expectedBackground, expectedTab],
    "Got expected properties for backgrond and tab contexts"
  );
  assertGetContextsResult(
    [bgItem],
    [actualBackground],
    "Expect the expected properties for the background context (included same contextId)",
    { assertContextId: true }
  );

  info("Test runtime.getContexts with a documentIds filter");

  extension.sendMessage("runtime.getContexts", { documentIds: [bgDocumentId] });
  res = await extension.awaitMessage("runtime.getContexts:result");
  assertGetContextsResult(
    res,
    [expectedBackground],
    "documentIds filter for background returns only the background context"
  );

  extension.sendMessage("runtime.getContexts", {
    documentIds: [expectedTab.documentId],
  });
  res = await extension.awaitMessage("runtime.getContexts:result");
  assertGetContextsResult(
    res,
    [expectedTab],
    "documentIds filter for tab returns only the tab context"
  );

  extension.sendMessage("runtime.getContexts", {
    documentIds: [bgDocumentId, expectedTab.documentId],
  });
  res = await extension.awaitMessage("runtime.getContexts:result");
  assertGetContextsResult(
    res,
    [expectedBackground, expectedTab],
    "documentIds filter with both ids returns both contexts"
  );

  extension.sendMessage("runtime.getContexts", {
    documentIds: ["00000000-0000-0000-0000-000000000000"],
  });
  res = await extension.awaitMessage("runtime.getContexts:result");
  Assert.equal(res.length, 0, "Unknown documentId filter returns empty array");

  info("Test runtime.getContexts with a contextType filter");
  res = await page.spawn([], () =>
    this.content.wrappedJSObject.browser.runtime.getContexts({
      contextTypes: ["BACKGROUND"],
    })
  );
  assertGetContextsResult(
    res,
    [actualBackground],
    "Expect only the backgrund context to be included in the results",
    { assertContextId: true }
  );

  info("Test runtime.ContextType enum");
  const contextTypeEnum = await page.spawn([], () => {
    return this.content.wrappedJSObject.browser.runtime.ContextType;
  });

  const expectedTypesMap = ["BACKGROUND", "POPUP", "SIDE_PANEL", "TAB"].reduce(
    (acc, item) => {
      acc[item] = item;
      return acc;
    },
    {}
  );

  Assert.deepEqual(
    contextTypeEnum,
    expectedTypesMap,
    "Got the expected values in the ContextType enum"
  );

  await extension.unload();
});
