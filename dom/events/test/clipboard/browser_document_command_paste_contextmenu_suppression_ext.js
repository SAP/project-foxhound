/* -*- Mode: JavaScript; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const kContentFileUrl = kBaseUrlForContent + "simple_page_ext.html";

async function promiseExecCommandPasteFromExtension(aBrowser, aExtension) {
  await SpecialPowers.spawn(aBrowser, [], async () => {
    content.document.notifyUserGestureActivation();
  });

  aExtension.sendMessage("paste");
  return await aExtension.awaitMessage("result");
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["test.events.async.enabled", true],
      // Disable the paste contextmenu delay to make the test run faster.
      ["security.dialog_enable_delay", 0],
    ],
  });

  // Paste contextmenu should not be shown during the test.
  let listener = function (e) {
    if (e.target.getAttribute("id") == kPasteMenuPopupId) {
      ok(false, "paste contextmenu should not be shown");
    }
  };
  document.addEventListener("popupshown", listener);

  registerCleanupFunction(() => {
    document.removeEventListener("popupshown", listener);
  });
});

kPasteCommandTests.forEach(test => {
  describe(test.description, () => {
    const contentScript = function () {
      browser.test.onMessage.addListener(async aMsg => {
        if (aMsg === "paste") {
          let clipboardData = null;
          document.addEventListener(
            "paste",
            e => {
              clipboardData = e.clipboardData.getData("text/plain");
            },
            { once: true }
          );

          const execCommandResult = document.execCommand("paste");
          browser.test.sendMessage("result", {
            execCommandResult,
            clipboardData,
          });
        }
      });
    };
    const extensionData = {
      manifest: {
        content_scripts: [
          {
            js: ["contentscript.js"],
            matches: ["https://example.com/*"],
          },
        ],
      },
      files: {
        "contentscript.js": contentScript,
      },
    };

    it("Same-origin data", async () => {
      const clipboardText = "X" + Math.random();

      info(`Load and start the extension`);
      const extension = ExtensionTestUtils.loadExtension(extensionData);
      await extension.startup();

      await BrowserTestUtils.withNewTab(
        kContentFileUrl,
        async function (aBrowser) {
          if (test.setupFn) {
            info(`Setup`);
            await test.setupFn(aBrowser);
          }

          info(`Write clipboard data`);
          await SpecialPowers.spawn(aBrowser, [clipboardText], async text => {
            content.document.notifyUserGestureActivation();
            return content.eval(`navigator.clipboard.writeText("${text}");`);
          });

          info(`Trigger execCommand("paste") from extension`);
          const { execCommandResult, clipboardData } =
            await promiseExecCommandPasteFromExtension(aBrowser, extension);
          ok(execCommandResult, `execCommand("paste") should be succeed`);
          is(clipboardData, clipboardText, `Check clipboard data`);

          if (test.additionalCheckFunc) {
            info(`Additional checks`);
            await test.additionalCheckFunc(aBrowser, clipboardText);
          }
        }
      );

      info(`Unload extension`);
      await extension.unload();
    });

    it("Extension with clipboardRead permission", async () => {
      info(`Randomized text to avoid overlappings with other tests`);
      const clipboardText = await promiseWritingRandomTextToClipboard();

      info(`Load and start the extension`);
      extensionData.manifest.permissions = ["clipboardRead"];
      const extension = ExtensionTestUtils.loadExtension(extensionData);
      await extension.startup();

      await BrowserTestUtils.withNewTab(
        kContentFileUrl,
        async function (aBrowser) {
          if (test.setupFn) {
            info(`Setup`);
            await test.setupFn(aBrowser);
          }

          info(`Trigger execCommand("paste") from extension`);
          const { execCommandResult, clipboardData } =
            await promiseExecCommandPasteFromExtension(aBrowser, extension);
          ok(execCommandResult, `execCommand("paste") should be succeed`);
          is(clipboardData, clipboardText, `Check clipboard data`);

          if (test.additionalCheckFunc) {
            info(`Additional checks`);
            await test.additionalCheckFunc(aBrowser, clipboardText);
          }
        }
      );

      info(`Unload extension`);
      await extension.unload();
    });
  });
});
