/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Borrowed from browser_PanelMultiView_keyboard.js
async function expectFocusAfterKey(aKey, aFocus) {
  let res = aKey.match(/^(Shift\+)?(.+)$/);
  let shift = Boolean(res[1]);
  let key;
  if (res[2].length == 1) {
    key = res[2]; // Character.
  } else {
    key = "KEY_" + res[2]; // Tab, ArrowRight, etc.
  }
  info("Waiting for focus on " + aFocus.id);
  let focused = BrowserTestUtils.waitForEvent(aFocus, "focus");
  EventUtils.synthesizeKey(key, { shiftKey: shift });
  await focused;
  ok(true, aFocus.id + " focused after " + aKey + " pressed");
}

/**
 * Tests that the panel can be navigated with Tab and Arrow keys
 * and that the help button responds to the Enter key
 */
add_task(async function test_keyboard_navigation_in_panel() {
  setupService({
    isSignedIn: true,
    isEnrolledAndEntitled: true,
    canEnroll: true,
    proxyPass: {
      status: 200,
      error: undefined,
      pass: makePass(),
    },
  });
  await IPPEnrollAndEntitleManager.refetchEntitlement();

  const openLinkStub = sinon.stub(window, "openWebLinkIn");
  let content = await openPanel();

  Assert.ok(
    BrowserTestUtils.isVisible(content),
    "ipprotection-content component should be present"
  );

  await expectFocusAfterKey(
    "Tab",
    content.ownerDocument.querySelector(
      `#${IPProtectionPanel.HEADER_BUTTON_ID}`
    )
  );

  await BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.statusCardEl
  );

  let statusCard = content.statusCardEl;
  let turnOnButton = statusCard.actionButtonEl;

  await expectFocusAfterKey("Tab", turnOnButton);

  await expectFocusAfterKey("Tab", content.settingsButtonEl);

  // Loop back around
  await expectFocusAfterKey(
    "Tab",
    content.ownerDocument.querySelector(
      `#${IPProtectionPanel.HEADER_BUTTON_ID}`
    )
  );
  await expectFocusAfterKey("Tab", turnOnButton);

  await expectFocusAfterKey("Tab", content.settingsButtonEl);

  // Loop back around
  await expectFocusAfterKey(
    "ArrowDown",
    content.ownerDocument.querySelector(
      `#${IPProtectionPanel.HEADER_BUTTON_ID}`
    )
  );
  await expectFocusAfterKey("ArrowDown", turnOnButton);

  // Loop backwards
  await expectFocusAfterKey(
    "Shift+Tab",
    content.ownerDocument.querySelector(
      `#${IPProtectionPanel.HEADER_BUTTON_ID}`
    )
  );

  // Check that header button responds to enter key
  let panelHiddenPromise = waitForPanelEvent(document, "popuphidden");
  EventUtils.synthesizeKey("KEY_Enter", {}, window);
  await panelHiddenPromise;
  Assert.ok(openLinkStub.calledOnce, "help button should open a link");
  openLinkStub.restore();
  cleanupService();
});
