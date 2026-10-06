/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Verify alerts sent from the confirmation hint framework (used for VPN, Bookmarks,
 * Pinned-Tab, etc.) fire both AXLiveRegion notifications and
 * AXAnnouncementRequested notifications.
 */
addAccessibleTask(``, async () => {
  registerCleanupFunction(() => {
    // The panel will fade after a few seconds, but if the test
    // runs for shorter, we'll need to manually hide it at shutdown.
    ConfirmationHint._panel?.hidePopup();
  });

  let liveRegionChanged = waitForMacEvent(
    "AXLiveRegionChanged",
    "confirmation-hint"
  );

  let announced = waitForMacEventWithInfo(
    "AXAnnouncementRequested",
    (macIface, data) =>
      macIface.getAttributeValue("AXDOMIdentifier") === "confirmation-hint" &&
      data.AXAnnouncementKey &&
      !!data.AXAnnouncementKey.length
  );

  ConfirmationHint.show(gBrowser.selectedTab, "confirmation-hint-pin-tab", {
    descriptionId: "confirmation-hint-pin-tab-description",
  });

  await liveRegionChanged;
  ok(true, "AXLiveRegionChanged fired when ConfirmationHint text is populated");

  let announcementEvt = await announced;
  ok(
    true,
    "AXAnnouncementRequested fired when ConfirmationHint text is populated"
  );
  is(
    announcementEvt.data.AXAnnouncementKey,
    "Pinned! Right-click the tab to unpin it.",
    "announcement contains full confirmation hint text"
  );
});
