/* -*- Mode: JavaScript; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const kContentFileUrl = kBaseUrlForContent + "simple_page_ext.html";
const kIsMac = navigator.platform.indexOf("Mac") > -1;

const kSuppressionTests = [
  {
    description: "Trigger paste command from keyboard shortcut",
    triggerPasteFun: async () => {
      await EventUtils.synthesizeAndWaitKey(
        "v",
        kIsMac ? { accelKey: true } : { ctrlKey: true }
      );
    },
  },
  {
    description: "Trigger paste command",
    triggerPasteFun: async aBrowser => {
      await SpecialPowers.spawn(aBrowser, [], async () => {
        await SpecialPowers.doCommand(content.window, "cmd_paste");
      });
    },
  },
];

async function promiseClipboardDataFromPasteEvent(aBrowser, aTriggerPasteFun) {
  const promisePasteEvent = SpecialPowers.spawn(aBrowser, [], () => {
    return new Promise(resolve => {
      content.document.addEventListener(
        "paste",
        e => {
          const clipboardData = e.clipboardData.getData("text/plain");
          resolve(clipboardData);
        },
        { once: true }
      );
    });
  });
  // Enuse the event listener is registered on remote target.
  await SpecialPowers.spawn(aBrowser, [], async () => {
    await new Promise(resolve => {
      SpecialPowers.executeSoon(resolve);
    });
  });
  const result = await aTriggerPasteFun(aBrowser);
  const clipboardData = await promisePasteEvent;
  return { result, clipboardData };
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
    it("Same-origin data", async () => {
      const clipboardText = "X" + Math.random();

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

          info(`Trigger execCommand("paste")`);
          const { result, clipboardData } =
            await promiseClipboardDataFromPasteEvent(aBrowser, async () => {
              return SpecialPowers.spawn(aBrowser, [], () => {
                content.document.notifyUserGestureActivation();
                return Cu.waiveXrays(content.document).execCommand("paste");
              });
            });
          ok(result, `execCommand("paste") should be succeed`);
          is(clipboardData, clipboardText, `Check clipboard data`);

          if (test.additionalCheckFunc) {
            info(`Additional checks`);
            await test.additionalCheckFunc(aBrowser, clipboardText);
          }
        }
      );
    });

    describe("cross-origin data", () => {
      kSuppressionTests.forEach(subTest => {
        it(subTest.description, async () => {
          const clipboardText = await promiseWritingRandomTextToClipboard();

          await BrowserTestUtils.withNewTab(
            kContentFileUrl,
            async function (aBrowser) {
              if (test.setupFn) {
                info(`Setup`);
                await test.setupFn(aBrowser);
              }

              info(`Trigger paste command`);
              const { clipboardData } =
                await promiseClipboardDataFromPasteEvent(
                  aBrowser,
                  subTest.triggerPasteFun
                );
              is(clipboardData, clipboardText, `Check clipboard data`);

              if (test.additionalCheckFunc) {
                info(`Additional checks`);
                await test.additionalCheckFunc(aBrowser, clipboardText);
              }
            }
          );
        });
      });
    });
  });
});
