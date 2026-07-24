/* -*- Mode: JavaScript; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const kContentFileUrl = kBaseUrlForContent + "simple_page_ext.html";

// https://bugzilla.mozilla.org/show_bug.cgi?id=1170911
[true, false].forEach(aPrefValue => {
  describe(`dom.allow_cut_copy=${aPrefValue}`, () => {
    it("set preference", async () => {
      await SpecialPowers.pushPrefEnv({
        set: [["dom.allow_cut_copy", aPrefValue]],
      });
    });

    it(`called from system principal`, () => {
      document.clearUserGestureActivation();

      // Test without editing.
      ok(
        document.queryCommandSupported("copy"),
        "Check if the 'copy' command is supported"
      );
      ok(
        document.queryCommandEnabled("copy"),
        "Check if the 'copy' command is enabled"
      );
      ok(
        document.execCommand("copy"),
        "Check if the 'copy' command is succeed"
      );

      // Test with editing.
      const textArea = document.createElement("textarea");
      document.body.appendChild(textArea);
      textArea.textContent = "textarea text";
      textArea.setSelectionRange(0, textArea.value.length);
      textArea.focus();
      ok(
        document.queryCommandEnabled("copy"),
        "Check if the 'copy' command is enabled when editing"
      );
      ok(
        document.execCommand("copy"),
        "Check if the 'copy' command is succeed when editing"
      );
      textArea.remove();
    });

    it(`called from web content`, async () => {
      await BrowserTestUtils.withNewTab(kContentFileUrl, async browser => {
        await SpecialPowers.spawn(browser, [aPrefValue], async aPrefValue => {
          const doc = Cu.waiveXrays(content.document);
          is(
            doc.queryCommandSupported("copy"),
            aPrefValue,
            `Check if the 'copy' command is supported`
          );

          // https://bugzilla.mozilla.org/show_bug.cgi?id=1012662
          // Test no user activation.
          content.document.clearUserGestureActivation();
          ok(
            !doc.queryCommandEnabled("copy"),
            "Check if the 'copy' command is enabled without user activation"
          );
          ok(
            !doc.execCommand("copy"),
            "Check if the 'copy' command is succeed without user activation"
          );

          // Test with user activation.
          content.document.notifyUserGestureActivation();
          is(
            doc.queryCommandEnabled("copy"),
            aPrefValue,
            "Check if the 'copy' command is enabled with user activation"
          );
          is(
            doc.execCommand("copy"),
            aPrefValue,
            "Check if the 'copy' command is succeed with user activation"
          );

          // Test with editing.
          const textArea = content.document.createElement("textarea");
          content.document.body.appendChild(textArea);
          textArea.textContent = "textarea text";
          textArea.setSelectionRange(0, textArea.value.length);
          textArea.focus();

          // Test no user activation.
          content.document.clearUserGestureActivation();
          ok(
            !doc.queryCommandEnabled("copy"),
            "Check if the 'copy' command is enabled without user activation when editing"
          );
          ok(
            !doc.execCommand("copy"),
            "Check if the 'copy' command is succeed without user activation when editing"
          );

          // Test with user activation.
          content.document.notifyUserGestureActivation();
          is(
            doc.queryCommandEnabled("copy"),
            aPrefValue,
            "Check if the 'copy' command is enabled with user activation when editing"
          );
          is(
            doc.execCommand("copy"),
            aPrefValue,
            "Check if the 'copy' command is succeed with user activation when editing"
          );
        });
      });
    });

    [true, false].forEach(aPermission => {
      describe(`extension ${aPermission ? "with" : "without"} clipboardWrite permission`, () => {
        const sharedScript = function () {
          this.testCopyCommand = function () {
            return [
              document.queryCommandSupported("copy"),
              document.queryCommandEnabled("copy"),
              document.execCommand("copy"),
            ];
          };
        };

        it("called from content script", async () => {
          const contentScript = function () {
            document
              .querySelector("button")
              .addEventListener("click", function (e) {
                browser.test.sendMessage("result", testCopyCommand());
              });
            browser.test.sendMessage("ready", testCopyCommand());
          };
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
          if (aPermission) {
            extensionData.manifest.permissions = ["clipboardWrite"];
          }

          // Load and start the extension.
          const extension = ExtensionTestUtils.loadExtension(extensionData);
          await extension.startup();
          await BrowserTestUtils.withNewTab(kContentFileUrl, async browser => {
            let [supported, enabled, succeed] =
              await extension.awaitMessage("ready");
            is(
              supported,
              aPrefValue || aPermission,
              "Check if the 'copy' command is supported"
            );
            is(
              enabled,
              aPermission,
              "Check if the 'copy' command is enabled without user activation"
            );
            is(
              succeed,
              aPermission,
              "Check if the 'copy' command is succeed without user activation"
            );

            // Click on the content to trigger user activation.
            promiseClickContentElement(browser, "btn");
            [supported, enabled, succeed] =
              await extension.awaitMessage("result");
            is(
              enabled,
              aPrefValue || aPermission,
              "Check if the 'copy' command is enabled with user activation"
            );
            is(
              succeed,
              aPrefValue || aPermission,
              "Check if the 'copy' command is succeed with user activation"
            );
          });
          await extension.unload();
        });

        it("called from content script when editing", async () => {
          const contentScript = function () {
            const textArea = document.createElement("textarea");
            document.body.appendChild(textArea);
            const testCopyCommandWhenEditing = function () {
              // Start editing.
              textArea.textContent = "textarea text";
              textArea.setSelectionRange(0, textArea.value.length);
              textArea.focus();
              return testCopyCommand();
            };
            document
              .querySelector("button")
              .addEventListener("click", function (e) {
                browser.test.sendMessage(
                  "result",
                  testCopyCommandWhenEditing()
                );
              });
            browser.test.sendMessage("ready", testCopyCommandWhenEditing());
          };
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
          if (aPermission) {
            extensionData.manifest.permissions = ["clipboardWrite"];
          }

          // Load and start the extension.
          const extension = ExtensionTestUtils.loadExtension(extensionData);
          await extension.startup();
          await BrowserTestUtils.withNewTab(kContentFileUrl, async browser => {
            let [supported, enabled, succeed] =
              await extension.awaitMessage("ready");
            is(
              supported,
              aPrefValue || aPermission,
              "Check if the 'copy' command is supported"
            );
            is(
              enabled,
              aPermission,
              "Check if the 'copy' command is enabled without user activation"
            );
            is(
              succeed,
              aPermission,
              "Check if the 'copy' command is succeed without user activation"
            );

            // Click on the content to trigger user activation.
            promiseClickContentElement(browser, "btn");
            [supported, enabled, succeed] =
              await extension.awaitMessage("result");
            is(
              enabled,
              aPrefValue || aPermission,
              "Check if the 'copy' command is enabled with user activation"
            );
            is(
              succeed,
              aPrefValue || aPermission,
              "Check if the 'copy' command is succeed with user activation"
            );
          });
          await extension.unload();
        });

        it("called from background script", async () => {
          const backgroundScript = function () {
            browser.test.sendMessage("ready", testCopyCommand());
          };
          const extensionData = {
            background: [sharedScript, backgroundScript],
          };
          if (aPermission) {
            extensionData.manifest = {
              permissions: ["clipboardWrite"],
            };
          }

          // Load and start the extension.
          const extension = ExtensionTestUtils.loadExtension(extensionData);
          await extension.startup();
          await BrowserTestUtils.withNewTab(kContentFileUrl, async browser => {
            let [supported, enabled, succeed] =
              await extension.awaitMessage("ready");
            is(
              supported,
              aPrefValue || aPermission,
              "Check if the 'copy' command is supported"
            );
            is(enabled, aPermission, "Check if the 'copy' command is enabled");
            is(succeed, aPermission, "Check if the 'copy' command is succeed");
          });
          await extension.unload();
        });
      });
    });
  });
});
