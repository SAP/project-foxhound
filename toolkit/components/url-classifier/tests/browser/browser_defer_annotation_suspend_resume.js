/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let { UrlClassifierTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/UrlClassifierTestUtils.sys.mjs"
);

const ANNOTATION_TRACKER_DOMAIN = "https://tracking.example.org/";
const ANNOTATION_TRACKER_IMAGE =
  ANNOTATION_TRACKER_DOMAIN + TEST_PATH + "raptor.jpg";

const ANY_TRACKING =
  Ci.nsIClassifiedChannel.CLASSIFIED_ANY_BASIC_TRACKING |
  Ci.nsIClassifiedChannel.CLASSIFIED_ANY_STRICT_TRACKING;

function recordChannelLifecycle(expectedURLPrePath) {
  let events = [];
  let topics = [
    "http-on-modify-request",
    "http-on-examine-response",
    "http-on-stop-request",
  ];
  let observers = topics.map(topic => {
    let observer = subject => {
      let httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
      if (!httpChannel.URI.spec.startsWith(expectedURLPrePath)) {
        return;
      }
      let classified = subject.QueryInterface(Ci.nsIClassifiedChannel);
      events.push({
        topic,
        time: Date.now(),
        flags: classified.classificationFlags,
      });
    };
    Services.obs.addObserver(observer, topic);
    return { topic, observer };
  });
  return {
    events,
    cleanup() {
      for (let { topic, observer } of observers) {
        try {
          Services.obs.removeObserver(observer, topic);
        } catch (e) {
          // already removed
        }
      }
    },
  };
}

add_setup(async function () {
  await UrlClassifierTestUtils.addTestTrackers();

  registerCleanupFunction(function () {
    UrlClassifierTestUtils.cleanupTestTrackers();
  });

  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.trackingprotection.enabled", true],
      ["privacy.trackingprotection.annotate_channels", true],
      ["privacy.trackingprotection.fingerprinting.enabled", false],
      ["privacy.trackingprotection.cryptomining.enabled", false],
      ["privacy.trackingprotection.emailtracking.enabled", false],
      ["privacy.trackingprotection.socialtracking.enabled", false],
      ["privacy.trackingprotection.antifraud.annotate_channels", false],
      ["privacy.trackingprotection.consentmanager.annotate_channels", false],
      ["privacy.trackingprotection.defer_annotation.enabled", true],
    ],
  });
});

add_task(async function test_third_party_annotation_lifecycle() {
  // Pref ON, third-party annotation tracker: the channel must suspend after
  // examine-response if classification hasn't finished yet, then resume when
  // the annotation phase callback fires. We can't deterministically force the
  // race ordering, so we assert invariants that hold for both orderings:
  //   - the load completes (page receives the image),
  //   - by the time onStopRequest fires, the annotation flag is set.
  let lifecycle = recordChannelLifecycle(ANNOTATION_TRACKER_DOMAIN);
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_PAGE);

  let loaded = await loadImage(tab.linkedBrowser, ANNOTATION_TRACKER_IMAGE);
  ok(loaded, "Annotation tracker image loads after suspend/resume");

  // Wait for the stop event to be recorded (loadImage resolves on image
  // onload, which is delivered after onStopRequest, but be defensive).
  await TestUtils.waitForCondition(
    () => lifecycle.events.some(e => e.topic === "http-on-stop-request"),
    "http-on-stop-request fired for the annotation tracker"
  );

  let modify = lifecycle.events.find(e => e.topic === "http-on-modify-request");
  let examine = lifecycle.events.find(
    e => e.topic === "http-on-examine-response"
  );
  let stop = lifecycle.events.find(e => e.topic === "http-on-stop-request");

  ok(modify, "http-on-modify-request observed");
  ok(examine, "http-on-examine-response observed");
  ok(stop, "http-on-stop-request observed");

  Assert.lessOrEqual(
    modify.time,
    examine.time,
    "modify-request precedes examine-response"
  );
  Assert.lessOrEqual(
    examine.time,
    stop.time,
    "examine-response precedes stop-request"
  );

  is(
    modify.flags & ANY_TRACKING,
    0,
    "Annotation flag is NOT set at http-on-modify-request (pref ON)"
  );
  ok(
    stop.flags & ANY_TRACKING,
    "Annotation flag IS set by http-on-stop-request (pref ON)"
  );

  lifecycle.cleanup();
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_first_party_top_level_no_hang() {
  // Pref ON, top-level navigation to a tracker domain. The load is
  // first-party, so the deferred annotation phase has an effectively-empty
  // feature set for AntiFraud/ConsentManager, and the part-6 fixup
  // (CheckChannelHelper returning NS_OK without dispatching a worker task)
  // must still fire the resume callback. The load must complete.
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    ANNOTATION_TRACKER_DOMAIN + TEST_PATH + "page.html"
  );
  // If the resume callback didn't fire, BrowserTestUtils.openNewForegroundTab
  // would time out waiting for the load to finish. Reaching this line is the
  // assertion.
  ok(true, "Top-level tracker-domain page loaded with defer pref ON");
  await BrowserTestUtils.removeTab(tab);
});
