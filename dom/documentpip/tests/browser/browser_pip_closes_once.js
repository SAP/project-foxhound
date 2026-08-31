/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * See https://wicg.github.io/document-picture-in-picture/
 * When the PiP document is destroyed, we should run
 * #close-any-associated-document-picture-in-picture-windows.
 * But that usually means the PiP is going away, so if we aren't careful
 * we might dispatch DOMWindowClose twice.
 */
add_task(async function closing_pip_sends_exactly_one_DOMWindowClosed() {
  const [tab, chromePiP] = await newTabWithPiP();

  // Note: Counting DOMWindowClose in the parent process isn't the same.
  // - The parent might have multiple, i.e. for closing tab and native window
  // - Sending the second event up to the parent might fail if closing has progressed far enough
  await SpecialPowers.spawn(chromePiP.gBrowser.selectedBrowser, [], () => {
    content.opener.closeCount = 0;
    SpecialPowers.addChromeEventListener(
      "DOMWindowClose",
      () => content.opener.closeCount++,
      true,
      false
    );
  });

  // close PiP
  info("Closing PiP window");
  const closedPromise = BrowserTestUtils.windowClosed(chromePiP);
  await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    content.documentPictureInPicture.window.close();
  });
  await closedPromise;

  info("Querying close count");
  const closeCount = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    () => content.closeCount
  );
  is(closeCount, 1, "Received a single DOMWindowClosed");

  BrowserTestUtils.removeTab(tab);
});
