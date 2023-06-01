/* -*- Mode: JavaScript; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const kBaseUrlForContent = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);

const kContentFileName = "simple_navigator_clipboard_read.html";

const kContentFileUrl = kBaseUrlForContent + kContentFileName;

const kApzTestNativeEventUtilsUrl =
  "chrome://mochitests/content/browser/gfx/layers/apz/test/mochitest/apz_test_native_event_utils.js";

Services.scriptloader.loadSubScript(kApzTestNativeEventUtilsUrl, this);

// @param aBrowser browser object of the content tab.
// @param aMultipleReadTextCalls if false, exactly one call is made, two
//                               otherwise.
function promiseClickContentToTriggerClipboardRead(
  aBrowser,
  aMultipleReadTextCalls
) {
  return promiseClickContentElement(
    aBrowser,
    aMultipleReadTextCalls ? "invokeReadTwiceId" : "invokeReadOnceId"
  );
}

// @param aBrowser browser object of the content tab.
function promiseMutatedReadResultFromContentElement(aBrowser) {
  return promiseMutatedTextContentFromContentElement(aBrowser, "readResultId");
}

add_setup(async function() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.events.asyncClipboard.clipboardItem", true],
      ["test.events.async.enabled", true],
    ],
  });
});

add_task(async function test_paste_button_position() {
  // Ensure there's text on the clipboard.
  await promiseWritingRandomTextToClipboard();

  await BrowserTestUtils.withNewTab(kContentFileUrl, async function(browser) {
    const pasteButtonIsShown = promisePasteButtonIsShown();
    const coordsOfClickInContentRelativeToScreenInDevicePixels = await promiseClickContentToTriggerClipboardRead(
      browser,
      false
    );
    info(
      "coordsOfClickInContentRelativeToScreenInDevicePixels: " +
        coordsOfClickInContentRelativeToScreenInDevicePixels.x +
        ", " +
        coordsOfClickInContentRelativeToScreenInDevicePixels.y
    );

    const pasteButtonCoordsRelativeToScreenInDevicePixels = await pasteButtonIsShown;
    info(
      "pasteButtonCoordsRelativeToScreenInDevicePixels: " +
        pasteButtonCoordsRelativeToScreenInDevicePixels.x +
        ", " +
        pasteButtonCoordsRelativeToScreenInDevicePixels.y
    );

    const mouseCoordsRelativeToScreenInDevicePixels = getMouseCoordsRelativeToScreenInDevicePixels();
    info(
      "mouseCoordsRelativeToScreenInDevicePixels: " +
        mouseCoordsRelativeToScreenInDevicePixels.x +
        ", " +
        mouseCoordsRelativeToScreenInDevicePixels.y
    );

    // Asserting not overlapping is important; otherwise, when the
    // "Paste" button is shown via a `mousedown` event, the following
    // `mouseup` event could accept the "Paste" button unnoticed by the
    // user.
    ok(
      isCloselyLeftOnTopOf(
        mouseCoordsRelativeToScreenInDevicePixels,
        pasteButtonCoordsRelativeToScreenInDevicePixels
      ),
      "'Paste' button is closely left on top of the mouse pointer."
    );
    ok(
      isCloselyLeftOnTopOf(
        coordsOfClickInContentRelativeToScreenInDevicePixels,
        pasteButtonCoordsRelativeToScreenInDevicePixels
      ),
      "Coords of click in content are closely left on top of the 'Paste' button."
    );

    // To avoid disturbing subsequent tests.
    const pasteButtonIsHidden = promisePasteButtonIsHidden();
    await promiseClickPasteButton();
    await pasteButtonIsHidden;
  });
});

add_task(async function test_accepting_paste_button() {
  // Randomized text to avoid overlappings with other tests.
  const clipboardText = await promiseWritingRandomTextToClipboard();

  await BrowserTestUtils.withNewTab(kContentFileUrl, async function(browser) {
    const pasteButtonIsShown = promisePasteButtonIsShown();
    await promiseClickContentToTriggerClipboardRead(browser, false);
    await pasteButtonIsShown;
    const pasteButtonIsHidden = promisePasteButtonIsHidden();
    const mutatedReadResultFromContentElement = promiseMutatedReadResultFromContentElement(
      browser
    );
    await promiseClickPasteButton();
    await pasteButtonIsHidden;
    await mutatedReadResultFromContentElement.then(value => {
      is(
        value,
        "Resolved: " + clipboardText,
        "Text returned from `navigator.clipboard.read()` is as expected."
      );
    });
  });
});

add_task(async function test_dismissing_paste_button() {
  await BrowserTestUtils.withNewTab(kContentFileUrl, async function(browser) {
    const pasteButtonIsShown = promisePasteButtonIsShown();
    await promiseClickContentToTriggerClipboardRead(browser, false);
    await pasteButtonIsShown;
    const pasteButtonIsHidden = promisePasteButtonIsHidden();
    const mutatedReadResultFromContentElement = promiseMutatedReadResultFromContentElement(
      browser
    );
    await promiseDismissPasteButton();
    await pasteButtonIsHidden;
    await mutatedReadResultFromContentElement.then(value => {
      is(
        value,
        "Rejected: The user dismissed the 'Paste' button.",
        "`navigator.clipboard.read()` rejected after dismissing the 'Paste' button"
      );
    });
  });
});

add_task(
  async function test_multiple_read_invocations_for_same_user_activation() {
    // Randomized text to avoid overlappings with other tests.
    const clipboardText = await promiseWritingRandomTextToClipboard();

    await BrowserTestUtils.withNewTab(kContentFileUrl, async function(browser) {
      const pasteButtonIsShown = promisePasteButtonIsShown();
      await promiseClickContentToTriggerClipboardRead(browser, true);
      await pasteButtonIsShown;
      const mutatedReadResultFromContentElement = promiseMutatedReadResultFromContentElement(
        browser
      );
      const pasteButtonIsHidden = promisePasteButtonIsHidden();
      await promiseClickPasteButton();
      await mutatedReadResultFromContentElement.then(value => {
        is(
          value,
          "Resolved 1: " + clipboardText + "; Resolved 2: " + clipboardText,
          "Two calls of `navigator.clipboard.read()` both resolved with the expected text."
        );
      });

      // To avoid disturbing subsequent tests.
      await pasteButtonIsHidden;
    });
  }
);

add_task(async function test_new_user_activation_shows_paste_button_again() {
  await BrowserTestUtils.withNewTab(kContentFileUrl, async function(browser) {
    // Ensure there's text on the clipboard.
    await promiseWritingRandomTextToClipboard();

    for (let i = 0; i < 2; ++i) {
      const pasteButtonIsShown = promisePasteButtonIsShown();
      // A click initiates a new user activation.
      await promiseClickContentToTriggerClipboardRead(browser, false);
      await pasteButtonIsShown;

      const pasteButtonIsHidden = promisePasteButtonIsHidden();
      await promiseClickPasteButton();
      await pasteButtonIsHidden;
    }
  });
});
