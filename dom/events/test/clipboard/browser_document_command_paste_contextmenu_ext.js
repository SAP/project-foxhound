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

async function execCommandPasteFromExtensionWithoutResult(
  aBrowser,
  aExtension
) {
  await SpecialPowers.spawn(aBrowser, [], async () => {
    content.document.notifyUserGestureActivation();
  });

  aExtension.sendMessage("pasteWithoutResult");
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["test.events.async.enabled", true],
      // Disable the paste contextmenu delay to make the test run faster.
      ["security.dialog_enable_delay", 0],
    ],
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
        } else if (aMsg === "pasteWithoutResult") {
          setTimeout(() => {
            document.execCommand("paste");
          }, 0);
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

    it("Accepting paste contextmenu", async () => {
      info(`Randomized text to avoid overlappings with other tests`);
      const clipboardText = await promiseWritingRandomTextToClipboard();

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

          const pasteButtonIsShown = promisePasteButtonIsShown();

          info(`Trigger execCommand("paste") from extension`);
          const pasteCommandResult = promiseExecCommandPasteFromExtension(
            aBrowser,
            extension
          );

          info(`Wait for paste context menu is shown`);
          await pasteButtonIsShown;

          info(`Click paste context menu`);
          const pasteButtonIsHidden = promisePasteButtonIsHidden();
          await promiseClickPasteButton();
          await pasteButtonIsHidden;

          const { execCommandResult, clipboardData } = await pasteCommandResult;
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

    it("Dismissing paste contextmenu", async () => {
      info(`Randomized text to avoid overlappings with other tests`);
      await promiseWritingRandomTextToClipboard();

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

          const pasteButtonIsShown = promisePasteButtonIsShown();

          info(`Trigger execCommand("paste") from extension`);
          const pasteCommandResult = promiseExecCommandPasteFromExtension(
            aBrowser,
            extension
          );

          info(`Wait for paste context menu is shown`);
          await pasteButtonIsShown;

          info(`Dismiss paste context menu`);
          const pasteButtonIsHidden = promisePasteButtonIsHidden();
          await promiseDismissPasteButton();
          await pasteButtonIsHidden;

          const { execCommandResult, clipboardData } = await pasteCommandResult;
          ok(!execCommandResult, `execCommand("paste") should not be succeed`);
          is(clipboardData, null, `Check clipboard data`);

          if (test.additionalCheckFunc) {
            info(`Additional checks`);
            await test.additionalCheckFunc(aBrowser, "");
          }
        }
      );

      info(`Unload extension`);
      await extension.unload();
    });

    it("Tab close", async () => {
      info(`Randomized text to avoid overlappings with other tests`);
      await promiseWritingRandomTextToClipboard();

      info(`Load and start the extension`);
      const extension = ExtensionTestUtils.loadExtension(extensionData);
      await extension.startup();

      let pasteButtonIsHidden;
      await BrowserTestUtils.withNewTab(
        kContentFileUrl,
        async function (aBrowser) {
          if (test.setupFn) {
            info(`Setup`);
            await test.setupFn(aBrowser);
          }

          const pasteButtonIsShown = promisePasteButtonIsShown();

          info(`Trigger execCommand("paste") from extension`);
          execCommandPasteFromExtensionWithoutResult(aBrowser, extension);

          info(`Wait for paste context menu is shown`);
          await pasteButtonIsShown;

          pasteButtonIsHidden = promisePasteButtonIsHidden();
          info("Close tab");
        }
      );

      await pasteButtonIsHidden;

      info(`Unload extension`);
      await extension.unload();
    });

    it("Tab switch", async () => {
      info(`Randomized text to avoid overlappings with other tests`);
      await promiseWritingRandomTextToClipboard();

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

          const pasteButtonIsShown = promisePasteButtonIsShown();

          info(`Trigger execCommand("paste") from extension`);
          execCommandPasteFromExtensionWithoutResult(aBrowser, extension);

          info(`Wait for paste context menu is shown`);
          await pasteButtonIsShown;

          info("Switch tab");
          let pasteButtonIsHidden = promisePasteButtonIsHidden();
          let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);

          info(`Wait for paste context menu is hidden`);
          await pasteButtonIsHidden;

          BrowserTestUtils.removeTab(tab);
        }
      );

      info(`Unload extension`);
      await extension.unload();
    });

    it("Window switch", async () => {
      info(`Randomized text to avoid overlappings with other tests`);
      await promiseWritingRandomTextToClipboard();

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

          const pasteButtonIsShown = promisePasteButtonIsShown();

          info(`Trigger execCommand("paste") from extension`);
          execCommandPasteFromExtensionWithoutResult(aBrowser, extension);

          info(`Wait for paste context menu is shown`);
          await pasteButtonIsShown;

          info("Switch browser window");
          let pasteButtonIsHidden = promisePasteButtonIsHidden();
          let newWin = await BrowserTestUtils.openNewBrowserWindow();

          info(`Wait for paste context menu is hidden`);
          await pasteButtonIsHidden;

          await BrowserTestUtils.closeWindow(newWin);
        }
      );

      info(`Unload extension`);
      await extension.unload();
    });

    it("Tab navigate", async () => {
      info(`Randomized text to avoid overlappings with other tests`);
      await promiseWritingRandomTextToClipboard();

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

          const pasteButtonIsShown = promisePasteButtonIsShown();

          info(`Trigger execCommand("paste") from extension`);
          execCommandPasteFromExtensionWithoutResult(aBrowser, extension);

          info(`Wait for paste context menu is shown`);
          await pasteButtonIsShown;

          info("Navigate tab");
          let pasteButtonIsHidden = promisePasteButtonIsHidden();
          aBrowser.loadURI(Services.io.newURI("https://example.com/"), {
            triggeringPrincipal:
              Services.scriptSecurityManager.getSystemPrincipal(),
          });

          info(`Wait for paste context menu is hidden`);
          await pasteButtonIsHidden;
        }
      );

      info(`Unload extension`);
      await extension.unload();
    });

    it("Tab reload", async () => {
      info(`Randomized text to avoid overlappings with other tests`);
      await promiseWritingRandomTextToClipboard();

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

          const pasteButtonIsShown = promisePasteButtonIsShown();

          info(`Trigger execCommand("paste") from extension`);
          execCommandPasteFromExtensionWithoutResult(aBrowser, extension);

          info(`Wait for paste context menu is shown`);
          await pasteButtonIsShown;

          info("Reload tab");
          let pasteButtonIsHidden = promisePasteButtonIsHidden();
          await BrowserTestUtils.reloadTab(gBrowser.selectedTab);

          info(`Wait for paste context menu is hidden`);
          await pasteButtonIsHidden;
        }
      );

      info(`Unload extension`);
      await extension.unload();
    });
  });
});
