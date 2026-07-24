/* -*- Mode: JavaScript; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const kContentFileUrl = kBaseUrlForContent + "simple_page_ext.html";

add_setup(async function init() {
  await SpecialPowers.pushPrefEnv({
    // This to turn off the paste contextmenu for testing.
    set: [["dom.events.testing.asyncClipboard", true]],
  });
});

[true, false].forEach(aPrefValue => {
  describe(`dom.execCommand.paste.enabled=${aPrefValue}`, () => {
    it("set preference", async () => {
      await SpecialPowers.pushPrefEnv({
        set: [["dom.execCommand.paste.enabled", aPrefValue]],
      });
    });

    describe("test paste comment", () => {
      beforeEach(async () => {
        info("Write random text to clipboard");
        await promiseWritingRandomTextToClipboard();
      });

      it(`called from system principal`, async () => {
        document.clearUserGestureActivation();
        ok(
          document.queryCommandSupported("paste"),
          "Check if the 'paste' command is supported"
        );

        // Test without editing.
        ok(
          !document.queryCommandEnabled("paste"),
          "Check if the 'paste' command is enabled without editing"
        );
        ok(
          !document.execCommand("paste"),
          "Check if the 'paste' command is succeed without editing"
        );

        // Test with editing.
        const textArea = document.createElement("textarea");
        document.body.appendChild(textArea);
        textArea.textContent = "textarea text";
        textArea.setSelectionRange(0, textArea.value.length);
        textArea.focus();
        ok(
          document.queryCommandEnabled("paste"),
          "Check if the 'paste' command is enabled when editing"
        );
        ok(
          document.execCommand("paste"),
          "Check if the 'paste' command is succeed when editing"
        );
        textArea.remove();
      });

      it(`called from web content`, async () => {
        await BrowserTestUtils.withNewTab(kContentFileUrl, async browser => {
          await SpecialPowers.spawn(browser, [aPrefValue], async aPrefValue => {
            const doc = Cu.waiveXrays(content.document);
            is(
              doc.queryCommandSupported("paste"),
              aPrefValue,
              `Check if the 'paste' command is supported`
            );

            // Test no user activation.
            content.document.clearUserGestureActivation();
            ok(
              !doc.queryCommandEnabled("paste"),
              "Check if the 'paste' command is enabled without user activation"
            );
            ok(
              !doc.execCommand("paste"),
              "Check if the 'paste' command is succeed without user activation"
            );

            // Test with user activation.
            content.document.notifyUserGestureActivation();
            is(
              doc.queryCommandEnabled("paste"),
              aPrefValue,
              "Check if the 'paste' command is enabled with user activation"
            );
            is(
              doc.execCommand("paste"),
              aPrefValue,
              "Check if the 'paste' command is succeed with user activation"
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
              !doc.queryCommandEnabled("paste"),
              "Check if the 'paste' command is enabled without user activation when editing"
            );
            ok(
              !doc.execCommand("paste"),
              "Check if the 'paste' command is succeed without user activation when editing"
            );

            // Test with user activation.
            textArea.textContent = "textarea text";
            textArea.setSelectionRange(0, textArea.value.length);
            textArea.focus();
            content.document.notifyUserGestureActivation();
            is(
              doc.queryCommandEnabled("paste"),
              aPrefValue,
              "Check if the 'paste' command is enabled with user activation when editing"
            );
            is(
              doc.execCommand("paste"),
              aPrefValue,
              "Check if the 'paste' command is succeed with user activation when editing"
            );
          });
        });
      });

      [true, false].forEach(aPermission => {
        describe(`extension ${aPermission ? "with" : "without"} clipboardRead permission`, () => {
          const sharedScript = function () {
            this.testPasteCommand = function () {
              return [
                document.queryCommandSupported("paste"),
                document.queryCommandEnabled("paste"),
                document.execCommand("paste"),
              ];
            };
          };

          it("called from content script", async () => {
            const contentScript = function () {
              document
                .querySelector("button")
                .addEventListener("click", function (e) {
                  browser.test.sendMessage("result", testPasteCommand());
                });
              browser.test.sendMessage("ready", testPasteCommand());
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
              extensionData.manifest.permissions = ["clipboardRead"];
            }

            // Load and start the extension.
            const extension = ExtensionTestUtils.loadExtension(extensionData);
            await extension.startup();
            await BrowserTestUtils.withNewTab(
              kContentFileUrl,
              async browser => {
                let [supported, enabled, succeed] =
                  await extension.awaitMessage("ready");
                is(
                  supported,
                  aPrefValue || aPermission,
                  "Check if the 'paste' command is supported"
                );

                // Test no user activation.
                is(
                  enabled,
                  aPermission,
                  "Check if the 'paste' command is enabled without user activation"
                );
                is(
                  succeed,
                  aPermission,
                  "Check if the 'paste' command is succeed without user activation"
                );

                // Click on the content to trigger user activation.
                promiseClickContentElement(browser, "btn");
                [supported, enabled, succeed] =
                  await extension.awaitMessage("result");
                is(
                  enabled,
                  aPrefValue || aPermission,
                  "Check if the 'paste' command is enabled with user activation"
                );
                is(
                  succeed,
                  aPrefValue || aPermission,
                  "Check if the 'paste' command is succeed with user activation"
                );
              }
            );
            await extension.unload();
          });

          it("called from content script when editing", async () => {
            const contentScript = function () {
              const textArea = document.createElement("textarea");
              document.body.appendChild(textArea);
              const testPasteCommandWhenEditing = function () {
                // Start editing.
                textArea.textContent = "textarea text";
                textArea.setSelectionRange(0, textArea.value.length);
                textArea.focus();
                return testPasteCommand();
              };
              document
                .querySelector("button")
                .addEventListener("click", function (e) {
                  browser.test.sendMessage(
                    "result",
                    testPasteCommandWhenEditing()
                  );
                });
              browser.test.sendMessage("ready", testPasteCommandWhenEditing());
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
              extensionData.manifest.permissions = ["clipboardRead"];
            }

            // Load and start the extension.
            const extension = ExtensionTestUtils.loadExtension(extensionData);
            await extension.startup();
            await BrowserTestUtils.withNewTab(
              kContentFileUrl,
              async browser => {
                let [supported, enabled, succeed] =
                  await extension.awaitMessage("ready");
                is(
                  supported,
                  aPrefValue || aPermission,
                  "Check if the 'paste' command is supported"
                );
                is(
                  enabled,
                  aPermission,
                  "Check if the 'paste' command is enabled without user activation"
                );
                is(
                  succeed,
                  aPermission,
                  "Check if the 'paste' command is succeed without user activation"
                );

                // Click on the content to trigger user activation.
                promiseClickContentElement(browser, "btn");
                [supported, enabled, succeed] =
                  await extension.awaitMessage("result");
                is(
                  enabled,
                  aPrefValue || aPermission,
                  "Check if the 'paste' command is enabled with user activation"
                );
                is(
                  succeed,
                  aPrefValue || aPermission,
                  "Check if the 'paste' command is succeed with user activation"
                );
              }
            );
            await extension.unload();
          });

          it("called from background script", async () => {
            const backgroundScript = function () {
              browser.test.sendMessage("ready", testPasteCommand());
            };
            const extensionData = {
              background: [sharedScript, backgroundScript],
            };
            if (aPermission) {
              extensionData.manifest = {
                permissions: ["clipboardRead"],
              };
            }

            // Load and start the extension.
            const extension = ExtensionTestUtils.loadExtension(extensionData);
            await extension.startup();
            await BrowserTestUtils.withNewTab(
              kContentFileUrl,
              async browser => {
                let [supported, enabled, succeed] =
                  await extension.awaitMessage("ready");
                is(
                  supported,
                  aPrefValue || aPermission,
                  "Check if the 'paste' command is supported"
                );
                is(
                  enabled,
                  aPermission,
                  "Check if the 'paste' command is enabled"
                );
                is(
                  succeed,
                  aPermission,
                  "Check if the 'paste' command is succeed"
                );
              }
            );
            await extension.unload();
          });
        });
      });
    });
  });
});
