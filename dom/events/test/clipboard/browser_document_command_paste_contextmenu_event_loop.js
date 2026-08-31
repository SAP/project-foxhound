/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const kContentFileUrl = kBaseUrlForContent + "simple_page_ext.html";

function promiseExecCommandPaste(aBrowser) {
  return SpecialPowers.spawn(aBrowser, [], () => {
    let clipboardData = null;
    content.document.addEventListener(
      "paste",
      e => {
        clipboardData = e.clipboardData.getData("text/plain");
      },
      { once: true }
    );

    content.document.notifyUserGestureActivation();
    const execCommandResult = Cu.waiveXrays(content.document).execCommand(
      "paste"
    );

    return { execCommandResult, clipboardData };
  });
}

function execCommandPasteWithoutWait(aBrowser) {
  return SpecialPowers.spawn(aBrowser, [], () => {
    SpecialPowers.executeSoon(() => {
      content.document.notifyUserGestureActivation();
      const execCommandResult = Cu.waiveXrays(content.document).execCommand(
        "paste"
      );
    });
  });
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

// Test for https://bugzilla.mozilla.org/show_bug.cgi?id=2021248.
add_task(async function test_spin_event_loop() {
  info(`Randomized text to avoid overlappings with other tests`);
  const clipboardText = await promiseWritingRandomTextToClipboard();

  await BrowserTestUtils.withNewTab(kContentFileUrl, async function (aBrowser) {
    info("Setup test page for paste command test");
    await SpecialPowers.spawn(aBrowser, [], () => {
      const textarea = content.document.createElement("textarea");
      content.document.body.appendChild(textarea);
      textarea.focus();

      textarea.addEventListener("keydown", e => {
        info(`Got keydown event with key=${e.key}`);
        let timerRan = false;
        content.setTimeout(() => {
          timerRan = true;
        }, 0);
        if (Cu.waiveXrays(content.document).execCommand("paste")) {
          e.preventDefault();
        }
        ok(!timerRan, "timer should not have run yet");
      });
    });

    let pasteButtonIsShown = promisePasteButtonIsShown();

    info(`Synthesize key event to trigger execCommand("paste")`);
    EventUtils.synthesizeKey("v", { accelKey: true });

    info(`Wait for paste context menu is shown`);
    await pasteButtonIsShown;

    info(`Click paste context menu`);
    let pasteButtonIsHidden = promisePasteButtonIsHidden();
    await promiseClickPasteButton();
    await pasteButtonIsHidden;

    info(`Check textarea value`);
    await SpecialPowers.spawn(aBrowser, [clipboardText], clipboardText => {
      const textarea = content.document.querySelector("textarea");
      is(textarea.value, clipboardText, "check <textarea> value");
    });

    pasteButtonIsShown = promisePasteButtonIsShown();

    info(`Synthesize key event to trigger execCommand("paste") again`);
    EventUtils.synthesizeKey("v", { accelKey: true });

    info(`Wait for paste context menu is shown`);
    await pasteButtonIsShown;

    info(`Dismiss paste context menu`);
    pasteButtonIsHidden = promisePasteButtonIsHidden();
    await promiseDismissPasteButton();
    await pasteButtonIsHidden;

    info(`Check textarea value again`);
    await SpecialPowers.spawn(aBrowser, [clipboardText], clipboardText => {
      const textarea = content.document.querySelector("textarea");
      // Dissmissing paste context menu should make the editor handle the paste event,
      // so the clipboard text should be pasted into the textarea again.
      is(
        textarea.value,
        clipboardText + clipboardText,
        "check <textarea> value"
      );
    });
  });
});
