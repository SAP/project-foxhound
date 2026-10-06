/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// From AppKit.framework/Headers/NSAccessibilityConstants.h
const NSAccessibilityPriorityMedium = 50;
const NSAccessibilityPriorityHigh = 90;

/**
 * Test ariaNotify.
 */
addAccessibleTask(`<p id="p">p</p>`, async function testAriaNotify(browser) {
  info("p.ariaNotify a normal");
  let announced = waitForMacEventWithInfo("AXAnnouncementRequested", "p");
  await invokeContentTask(browser, [], () => {
    content.p = content.document.getElementById("p");
    content.p.ariaNotify("a");
  });
  let evt = await announced;
  ok(true, "Got AXAnnouncementRequested event");
  is(evt.data.AXAnnouncementKey, "a", "AXAnnouncementKey correct");
  is(
    evt.data.AXPriorityKey,
    NSAccessibilityPriorityMedium,
    "AXPriorityKey correct"
  );

  info("p.ariaNotify b normal");
  announced = waitForMacEventWithInfo("AXAnnouncementRequested", "p");
  await invokeContentTask(browser, [], () => {
    content.p.ariaNotify("b", { priority: "high" });
  });
  evt = await announced;
  ok(true, "Got AXAnnouncementRequested event");
  is(evt.data.AXAnnouncementKey, "b", "AXAnnouncementKey correct");
  is(
    evt.data.AXPriorityKey,
    NSAccessibilityPriorityHigh,
    "AXPriorityKey correct"
  );

  info("doc.ariaNotify c");
  announced = waitForMacEventWithInfo(
    "AXAnnouncementRequested",
    DEFAULT_CONTENT_DOC_BODY_ID
  );
  await invokeContentTask(browser, [], () => {
    content.document.ariaNotify("c");
  });
  evt = await announced;
  ok(true, "Got AXAnnouncementRequested event");
  is(evt.data.AXAnnouncementKey, "c", "AXAnnouncementKey correct");
  is(
    evt.data.AXPriorityKey,
    NSAccessibilityPriorityMedium,
    "AXPriorityKey correct"
  );
});
