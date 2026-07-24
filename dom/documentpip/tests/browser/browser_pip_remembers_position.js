/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Some position that is unlikely to be where the PiP
// would be initially (i.e. not some corner)
const testPos = { x: 234, y: 345 };
// Some size that is unlikely to be clipped by the API
const testSize = { width: 300, height: 300 };

add_task(async function sanity_check_position_size_fit() {
  const { availLeft, availTop, availHeight, availWidth } = screen;
  const xMost = availLeft + availWidth;
  const yMost = availTop + availHeight;

  // If these don't hold, Gecko won't place it at the desired position
  // due to going out of screen otherwise
  Assert.less(
    testPos.x + testSize.width,
    xMost,
    "Popup x+width must fit to screen"
  );
  Assert.less(
    testPos.y + testSize.height,
    yMost,
    "Popup y+height must fit to screen"
  );
});

add_task(async function sanity_check_popup_sizing() {
  // Document PiP is quite similar to a popup. So in case the PiP
  // position is incorrect on some platforms or configurations, first
  // check that this isn't a more general bug.
  const tab = await BrowserTestUtils.openNewForegroundTab({ gBrowser });
  const browser = tab.linkedBrowser;

  const chromePopupPromise = BrowserTestUtils.waitForNewWindow();
  await SpecialPowers.spawn(browser, [testPos, testSize], async (pos, size) => {
    content.open(
      "",
      "_blank",
      `top=${pos.y},left=${pos.x},width=${size.width},height=${size.height}`
    );
  });
  const chromePopup = await chromePopupPromise;

  is(chromePopup.screenX, testPos.x, "Expected popup screenX");
  is(chromePopup.screenY, testPos.y, "Expected popup screenY");

  await BrowserTestUtils.closeWindow(chromePopup);
  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_PiP_remembers_position() {
  const [tab, chromePiP] = await newTabWithPiP(testSize);

  Assert.notEqual(
    chromePiP.screenX,
    testPos.x,
    "PiP not initially at test position"
  );
  Assert.notEqual(
    chromePiP.screenY,
    testPos.y,
    "PiP not initially at test position"
  );

  await movePiP(chromePiP, testPos);

  // Reopen
  info("Re-opening PiP window");
  await BrowserTestUtils.closeWindow(chromePiP);
  const chromePiP2Promise = BrowserTestUtils.waitForNewWindow();
  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    content.document.notifyUserGestureActivation();
    await content.documentPictureInPicture.requestWindow();
  });
  const chromePiP2 = await chromePiP2Promise;

  // Check position was remembered
  is(chromePiP2.screenX, testPos.x, "Expected PiP screenX");
  is(chromePiP2.screenY, testPos.y, "Expected PiP screenY");

  await BrowserTestUtils.closeWindow(chromePiP2);
  BrowserTestUtils.removeTab(tab);
});
