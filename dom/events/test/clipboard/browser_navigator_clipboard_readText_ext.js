/* -*- Mode: JavaScript; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from head.js */

const kContentFileUrl = kBaseUrlForContent + "simple_page_ext.html";

const sharedScript = function () {
  this.clipboardReadText = function () {
    return navigator.clipboard.readText().then(
      data => {
        browser.test.sendMessage("result", data);
      },
      error => {
        browser.test.sendMessage("result", [error.name, error.message]);
      }
    );
  };
};

let contentScript = function () {
  document.querySelector("button").addEventListener("click", function (e) {
    clipboardReadText();
  });
  browser.test.sendMessage("ready");
};

const backgroundScript = function () {
  clipboardReadText();
};

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["test.events.async.enabled", true]],
  });
});

// There’s another test that checks calling readText() without permission in
// toolkit/components/extensions/test/mochitest/test_ext_async_clipboard.html.
describe("test extension without clipboardRead permission", () => {
  it("test content script", async function () {
    const text = await promiseWritingRandomTextToClipboard();
    const extensionData = {
      manifest: {
        content_scripts: [
          {
            js: ["sharedScript.js", "contentscript.js"],
            matches: ["https://example.com/*"],
          },
        ],
      },
      files: {
        "sharedScript.js": sharedScript,
        "contentscript.js": contentScript,
      },
    };
    const extension = ExtensionTestUtils.loadExtension(extensionData);
    await extension.startup();
    await BrowserTestUtils.withNewTab(kContentFileUrl, async browser => {
      await extension.awaitMessage("ready");

      // click on the content and wait for pasted button shown.
      await Promise.all([
        promisePasteButtonIsShown(),
        promiseClickContentElement(browser, "btn"),
      ]);

      // click on the paste button.
      let resultPromise = extension.awaitMessage("result");
      await Promise.all([
        promisePasteButtonIsHidden(),
        promiseClickPasteButton(),
      ]);
      is(await resultPromise, text, "check readText() result");

      // click on the content and wait for pasted button shown.
      await Promise.all([
        promisePasteButtonIsShown(),
        promiseClickContentElement(browser, "btn"),
      ]);

      // dismiss the paste button.
      resultPromise = extension.awaitMessage("result");
      await Promise.all([
        promisePasteButtonIsHidden(),
        promiseDismissPasteButton(),
      ]);
      const [name, message] = await resultPromise;
      is(name, "NotAllowedError", "check readText() error name");
      is(
        message,
        "Clipboard read operation is not allowed.",
        "check readText() error message"
      );
    });
    await extension.unload();
  });

  describe("test background script", () => {
    // paste button should not be shown during the test.
    const popupShownListener = function (e) {
      const pastePopup = document.getElementById(kPasteMenuPopupId);
      if (e.target != pastePopup) {
        return;
      }
      ok(
        false,
        "Paste popup should not be shown for extension with permission"
      );
      promiseDismissPasteButton();
    };
    beforeEach(() => {
      document.addEventListener("popupshown", popupShownListener);
    });
    afterEach(() => {
      document.removeEventListener("popupshown", popupShownListener);
    });

    it("test without user activation", async function () {
      const text = await promiseWritingRandomTextToClipboard();
      const extensionData = {
        background: [sharedScript, backgroundScript],
      };
      const extension = ExtensionTestUtils.loadExtension(extensionData);
      await extension.startup();
      const [name, message] = await extension.awaitMessage("result");
      is(name, "NotAllowedError", "check readText() error name");
      is(
        message,
        "Clipboard read request was blocked due to lack of user activation.",
        "check readText() error message"
      );
      await extension.unload();
    });

    it("test with user activation", async function () {
      const backgroundScriptWithUserActivation = function () {
        browser.test.withHandlingUserInput(() => {
          clipboardReadText();
        });
      };
      const text = await promiseWritingRandomTextToClipboard();
      const extensionData = {
        background: [sharedScript, backgroundScriptWithUserActivation],
      };
      const extension = ExtensionTestUtils.loadExtension(extensionData);
      await extension.startup();
      const [name, message] = await extension.awaitMessage("result");
      is(name, "NotAllowedError", "check readText() error name");
      is(
        message,
        "Clipboard read operation is not allowed.",
        "check readText() error message"
      );
      await extension.unload();
    });
  });
});

// There’s another test that checks calling readText() with permission in
// toolkit/components/extensions/test/mochitest/test_ext_async_clipboard.html.
describe("test extension with clipboardRead permission", () => {
  // paste button should not be shown during the test.
  const popupShownListener = function (e) {
    const pastePopup = document.getElementById(kPasteMenuPopupId);
    if (e.target != pastePopup) {
      return;
    }
    ok(false, "Paste popup should not be shown for extension with permission");
    promiseDismissPasteButton();
  };
  beforeEach(() => {
    document.addEventListener("popupshown", popupShownListener);
  });
  afterEach(() => {
    document.removeEventListener("popupshown", popupShownListener);
  });

  it("test content script", async function () {
    const text = await promiseWritingRandomTextToClipboard();
    const extensionData = {
      manifest: {
        content_scripts: [
          {
            js: ["sharedScript.js", "contentscript.js"],
            matches: ["https://example.com/*"],
          },
        ],
        permissions: ["clipboardRead"],
      },
      files: {
        "sharedScript.js": sharedScript,
        "contentscript.js": contentScript,
      },
    };
    const extension = ExtensionTestUtils.loadExtension(extensionData);
    await extension.startup();
    await BrowserTestUtils.withNewTab(kContentFileUrl, async browser => {
      await extension.awaitMessage("ready");

      // extension with clipboardRead permission should not show paste button.
      const resultPromise = extension.awaitMessage("result");
      await promiseClickContentElement(browser, "btn");
      is(await resultPromise, text, "check readText() result");
    });
    await extension.unload();
  });

  it("test background script", async function () {
    const text = await promiseWritingRandomTextToClipboard();
    const extensionData = {
      background: [sharedScript, backgroundScript],
      manifest: {
        permissions: ["clipboardRead"],
      },
    };
    const extension = ExtensionTestUtils.loadExtension(extensionData);
    await extension.startup();
    is(await extension.awaitMessage("result"), text, "check readText() result");
    await extension.unload();
  });
});
