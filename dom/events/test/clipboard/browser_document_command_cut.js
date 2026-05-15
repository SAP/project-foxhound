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
        document.queryCommandSupported("cut"),
        "Check if the 'cut' command is supported"
      );
      // XXX: should "cut" command be disabled without an editing target,
      // even if it is called from system principal?
      ok(
        document.queryCommandEnabled("cut"),
        "Check if the 'cut' command is enabled without editing"
      );
      // XXX: Should the "cut" command succeed even without an editable target
      // when it’s called from the system principal?
      ok(
        document.execCommand("cut"),
        "Check if the 'cut' command is succeed without editing"
      );

      // Test with editing.
      const textArea = document.createElement("textarea");
      document.body.appendChild(textArea);
      textArea.textContent = "textarea text";
      textArea.setSelectionRange(0, textArea.value.length);
      textArea.focus();
      ok(
        document.queryCommandEnabled("cut"),
        "Check if the 'cut' command is enabled when editing"
      );
      ok(
        document.execCommand("cut"),
        "Check if the 'cut' command is succeed when editing"
      );
      textArea.remove();
    });

    it(`called from web content`, async () => {
      await BrowserTestUtils.withNewTab(kContentFileUrl, async browser => {
        await SpecialPowers.spawn(browser, [aPrefValue], async aPrefValue => {
          const doc = Cu.waiveXrays(content.document);
          is(
            doc.queryCommandSupported("cut"),
            aPrefValue,
            `Check if the 'cut' command is supported`
          );

          // https://bugzilla.mozilla.org/show_bug.cgi?id=1012662
          // Test no user activation.
          content.document.clearUserGestureActivation();
          ok(
            !doc.queryCommandEnabled("cut"),
            "Check if the 'cut' command is enabled without user activation"
          );
          ok(
            !doc.execCommand("cut"),
            "Check if the 'cut' command is succeed without user activation"
          );

          // Test with user activation.
          // XXX: should "cut" command be disabled without an editing target?
          content.document.notifyUserGestureActivation();
          is(
            doc.queryCommandEnabled("cut"),
            aPrefValue,
            "Check if the 'cut' command is enabled with user activation"
          );
          ok(
            !doc.execCommand("cut"),
            "Check if the 'cut' command is succeed with user activation"
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
            !doc.queryCommandEnabled("cut"),
            "Check if the 'cut' command is enabled without user activation when editing"
          );
          ok(
            !doc.execCommand("cut"),
            "Check if the 'cut' command is succeed without user activation when editing"
          );

          // Test with user activation.
          textArea.textContent = "textarea text";
          textArea.setSelectionRange(0, textArea.value.length);
          textArea.focus();
          content.document.notifyUserGestureActivation();
          is(
            doc.queryCommandEnabled("cut"),
            aPrefValue,
            "Check if the 'cut' command is enabled with user activation when editing"
          );
          is(
            doc.execCommand("cut"),
            aPrefValue,
            "Check if the 'cut' command is succeed with user activation when editing"
          );
        });
      });
    });

    [true, false].forEach(aPermission => {
      describe(`extension ${aPermission ? "with" : "without"} clipboardWrite permission`, () => {
        const sharedScript = function () {
          this.testCutCommand = function () {
            return [
              document.queryCommandSupported("cut"),
              document.queryCommandEnabled("cut"),
              document.execCommand("cut"),
            ];
          };
        };

        it("called from content script", async () => {
          const contentScript = function () {
            document
              .querySelector("button")
              .addEventListener("click", function (e) {
                browser.test.sendMessage("result", testCutCommand());
              });
            browser.test.sendMessage("ready", testCutCommand());
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
              "Check if the 'cut' command is supported"
            );

            // Test with user activation.
            // XXX: should "cut" command be disabled without an editing target?
            is(
              enabled,
              aPermission,
              "Check if the 'cut' command is enabled without user activation"
            );
            ok(
              !succeed,
              "Check if the 'cut' command is succeed without user activation"
            );

            // Click on the content to trigger user activation.
            promiseClickContentElement(browser, "btn");
            [supported, enabled, succeed] =
              await extension.awaitMessage("result");
            // XXX: should "cut" command be disabled without an editing target?
            is(
              enabled,
              aPrefValue || aPermission,
              "Check if the 'cut' command is enabled with user activation"
            );
            ok(
              !succeed,
              "Check if the 'cut' command is succeed with user activation"
            );
          });
          await extension.unload();
        });

        it("called from content script when editing", async () => {
          const contentScript = function () {
            const textArea = document.createElement("textarea");
            document.body.appendChild(textArea);
            const testCutCommandWhenEditing = function () {
              // Start editing.
              textArea.textContent = "textarea text";
              textArea.setSelectionRange(0, textArea.value.length);
              textArea.focus();
              return testCutCommand();
            };
            document
              .querySelector("button")
              .addEventListener("click", function (e) {
                browser.test.sendMessage("result", testCutCommandWhenEditing());
              });
            browser.test.sendMessage("ready", testCutCommandWhenEditing());
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
              "Check if the 'cut' command is supported"
            );

            // Test with user activation.
            is(
              enabled,
              aPermission,
              "Check if the 'cut' command is enabled without user activation"
            );
            is(
              succeed,
              aPermission,
              "Check if the 'cut' command is succeed without user activation"
            );

            // Click on the content to trigger user activation.
            promiseClickContentElement(browser, "btn");
            [supported, enabled, succeed] =
              await extension.awaitMessage("result");
            is(
              enabled,
              aPrefValue || aPermission,
              "Check if the 'cut' command is enabled with user activation"
            );
            is(
              succeed,
              aPrefValue || aPermission,
              "Check if the 'cut' command is succeed with user activation"
            );
          });
          await extension.unload();
        });

        it("called from background script", async () => {
          const backgroundScript = function () {
            browser.test.sendMessage("ready", testCutCommand());
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
              "Check if the 'cut' command is supported"
            );
            // XXX: should "cut" command be disabled without an editing target?
            is(enabled, aPermission, "Check if the 'cut' command is enabled");
            ok(!succeed, "Check if the 'cut' command is succeed");
          });
          await extension.unload();
        });
      });
    });
  });
});
