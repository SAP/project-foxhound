/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let { UrlClassifierTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/UrlClassifierTestUtils.sys.mjs"
);

// itisatracker.org is in mochitest2-track-simple (blocking) and is third-party
// to TEST_PAGE (https://example.com/...), so it gets cancelled by ETP.
const BLOCKING_TRACKER_DOMAIN = "https://itisatracker.org/";
const BLOCKING_TRACKER_IMAGE =
  BLOCKING_TRACKER_DOMAIN + TEST_PATH + "raptor.jpg";

// tracking.example.org is in mochitest1-track-simple (annotation only) and is
// third-party to TEST_PAGE.
const ANNOTATION_TRACKER_DOMAIN = "https://tracking.example.org/";
const ANNOTATION_TRACKER_IMAGE =
  ANNOTATION_TRACKER_DOMAIN + TEST_PATH + "raptor.jpg";

const ANY_TRACKING =
  Ci.nsIClassifiedChannel.CLASSIFIED_ANY_BASIC_TRACKING |
  Ci.nsIClassifiedChannel.CLASSIFIED_ANY_STRICT_TRACKING;

function captureFlagsAt(topic, expectedURL) {
  return new Promise(resolve => {
    function observer(subject) {
      let httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
      if (!httpChannel.URI.spec.startsWith(expectedURL)) {
        return;
      }
      let classified = subject.QueryInterface(Ci.nsIClassifiedChannel);
      Services.obs.removeObserver(observer, topic);
      resolve(classified.classificationFlags);
    }
    Services.obs.addObserver(observer, topic);
  });
}

function watchExamineResponse(expectedURL) {
  let observed = false;
  function observer(subject) {
    let httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
    if (!httpChannel.URI.spec.startsWith(expectedURL)) {
      return;
    }
    observed = true;
    Services.obs.removeObserver(observer, "http-on-examine-response");
  }
  Services.obs.addObserver(observer, "http-on-examine-response");
  return {
    didFire() {
      return observed;
    },
    cancel() {
      try {
        Services.obs.removeObserver(observer, "http-on-examine-response");
      } catch (e) {
        // already removed
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
    ],
  });
});

async function runScenario({ deferAnnotations }) {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.trackingprotection.defer_annotation.enabled", deferAnnotations],
    ],
  });

  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_PAGE);

  // 1. Blocking tracker: cancelled regardless of pref. Blocking is in the
  //    pre-connect phase under both pref values.
  let blockingLoaded = await loadImage(
    tab.linkedBrowser,
    BLOCKING_TRACKER_IMAGE
  );
  ok(
    !blockingLoaded,
    `Blocking tracker is cancelled (deferAnnotations=${deferAnnotations})`
  );

  // 2. Annotation-only tracker: loads under both prefs. Flag visibility on
  //    http-on-modify-request differs by pref.
  let examineWatch = watchExamineResponse(ANNOTATION_TRACKER_DOMAIN);
  let modifyFlagsPromise = captureFlagsAt(
    "http-on-modify-request",
    ANNOTATION_TRACKER_DOMAIN
  );
  let stopFlagsPromise = captureFlagsAt(
    "http-on-stop-request",
    ANNOTATION_TRACKER_DOMAIN
  );

  let annotationLoaded = await loadImage(
    tab.linkedBrowser,
    ANNOTATION_TRACKER_IMAGE
  );
  ok(annotationLoaded, "Annotation-only tracker loads regardless of pref");

  let modifyFlags = await modifyFlagsPromise;
  let stopFlags = await stopFlagsPromise;

  if (deferAnnotations) {
    is(
      modifyFlags & ANY_TRACKING,
      0,
      "Pref ON: annotation flag NOT set at http-on-modify-request"
    );
    ok(
      stopFlags & ANY_TRACKING,
      "Pref ON: annotation flag set by http-on-stop-request"
    );
    ok(
      examineWatch.didFire(),
      "Pref ON: http-on-examine-response observed for annotation tracker"
    );
  } else {
    ok(
      modifyFlags & ANY_TRACKING,
      "Pref OFF: annotation flag set at http-on-modify-request"
    );
    ok(
      stopFlags & ANY_TRACKING,
      "Pref OFF: annotation flag still set by http-on-stop-request"
    );
  }
  examineWatch.cancel();

  // 3. Content blocking log captures both events irrespective of pref.
  let log = JSON.parse(tab.linkedBrowser.getContentBlockingLog());
  ok(log, "Content blocking log readable");
  ok(
    Object.keys(log).some(origin =>
      origin.startsWith("https://itisatracker.org")
    ),
    "Content blocking log includes the blocking tracker origin"
  );
  ok(
    Object.keys(log).some(origin =>
      origin.startsWith("https://tracking.example.org")
    ),
    "Content blocking log includes the annotation tracker origin"
  );

  await BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
}

add_task(async function test_defer_annotation_pref_off() {
  await runScenario({ deferAnnotations: false });
});

add_task(async function test_defer_annotation_pref_on() {
  await runScenario({ deferAnnotations: true });
});
