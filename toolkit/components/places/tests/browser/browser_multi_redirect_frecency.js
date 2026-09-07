/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const ROOT_URI =
  "https://example.org/tests/toolkit/components/places/tests/browser/";
const REDIRECT_URI = Services.io.newURI(ROOT_URI + "redirect_thrice.sjs");
const INTERMEDIATE_URI_1 = Services.io.newURI(
  ROOT_URI + "redirect_twice_perma.sjs"
);
const INTERMEDIATE_URI_2 = Services.io.newURI(ROOT_URI + "redirect_once.sjs");
const TARGET_URI = Services.io.newURI(
  "https://test1.example.com/tests/toolkit/components/places/tests/browser/final.html"
);

// Ensure that decay frecency doesn't kick in during tests (as a result
// of idle-daily).
Services.prefs.setCharPref("places.frecency.decayRate", "1.0");

registerCleanupFunction(async function () {
  Services.prefs.clearUserPref("places.frecency.decayRate");
  await PlacesUtils.history.clear();
});

async function check_uri(uri, frecency, hidden) {
  is(
    await PlacesTestUtils.getDatabaseValue("moz_places", "frecency", {
      url: uri,
    }),
    frecency,
    "Frecency of the page is the expected one"
  );
  is(
    await PlacesTestUtils.getDatabaseValue("moz_places", "hidden", {
      url: uri,
    }),
    hidden,
    "Hidden value of the page is the expected one"
  );
}

async function waitVisitedNotifications() {
  let redirectNotified = false;
  await PlacesTestUtils.waitForNotification("page-visited", visits => {
    is(visits.length, 1, "Was notified for the right number of visits.");
    let { url } = visits[0];
    info("Received 'page-visited': " + url);
    if (url == REDIRECT_URI.spec) {
      redirectNotified = true;
    }
    return url == TARGET_URI.spec;
  });
  return redirectNotified;
}

let firstRedirectBonus = 0;
let nextRedirectBonus = 0;
let targetBonus = 0;

/**
 * A non-typed redirect source should have the same values as intermediate
 * URLs and be lower than the target URL.
 */
add_task(async function test_multiple_redirect() {
  // The redirect source bonus overrides the link bonus.
  let visitedPromise = waitVisitedNotifications();
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: REDIRECT_URI.spec,
    },
    async function () {
      info("Waiting for onVisits");
      let redirectNotified = await visitedPromise;
      ok(redirectNotified, "The redirect should have been notified");

      await checkRedirect(
        REDIRECT_URI.spec,
        TARGET_URI.spec,
        [INTERMEDIATE_URI_1.spec, INTERMEDIATE_URI_2.spec],
        false
      );
    }
  );

  await PlacesUtils.history.clear();
});

add_task(async function test_multiple_redirect_typed() {
  // The typed bonus wins because the redirect is permanent.
  PlacesUtils.history.markPageAsTyped(REDIRECT_URI);
  let visitedPromise = waitVisitedNotifications();
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: REDIRECT_URI.spec,
    },
    async function () {
      info("Waiting for onVisits");
      let redirectNotified = await visitedPromise;
      ok(redirectNotified, "The redirect should have been notified");

      await checkRedirect(
        REDIRECT_URI.spec,
        TARGET_URI.spec,
        [INTERMEDIATE_URI_1.spec, INTERMEDIATE_URI_2.spec],
        true
      );
    }
  );

  await PlacesUtils.history.clear();
});

/**
 * Without any history, a typed redirect URL should consistently have a higher
 * value than the target URL.
 */
add_task(async function test_multiple_typed_visit() {
  // The typed bonus wins because the redirect is permanent.
  PlacesUtils.history.markPageAsTyped(REDIRECT_URI);
  let visitedPromise = waitVisitedNotifications();
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: REDIRECT_URI.spec,
    },
    async function () {
      info("Waiting for onVisits");
      let redirectNotified = await visitedPromise;
      ok(redirectNotified, "The redirect should have been notified");
    }
  );

  PlacesUtils.history.markPageAsTyped(REDIRECT_URI);
  visitedPromise = waitVisitedNotifications();
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: REDIRECT_URI.spec,
    },
    async function () {
      info("Waiting for onVisits");
      let redirectNotified = await visitedPromise;
      ok(redirectNotified, "The redirect should have been notified");

      await checkRedirect(
        REDIRECT_URI.spec,
        TARGET_URI.spec,
        [INTERMEDIATE_URI_1.spec, INTERMEDIATE_URI_2.spec],
        true
      );
    }
  );

  await PlacesUtils.history.clear();
});

/**
 * Assume the user first typed a source re-direct. Then later visited the
 * re-direct without typing.
 */
add_task(async function test_typed_then_redirect_visit() {
  PlacesUtils.history.markPageAsTyped(REDIRECT_URI);
  let visitedPromise = waitVisitedNotifications();
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: REDIRECT_URI.spec,
    },
    async function () {
      info("Waiting for onVisits");
      let redirectNotified = await visitedPromise;
      ok(redirectNotified, "The redirect should have been notified");
    }
  );

  visitedPromise = waitVisitedNotifications();
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: REDIRECT_URI.spec,
    },
    async function () {
      info("Waiting for onVisits");
      let redirectNotified = await visitedPromise;
      ok(redirectNotified, "The redirect should have been notified");

      await checkRedirect(
        REDIRECT_URI.spec,
        TARGET_URI.spec,
        [INTERMEDIATE_URI_1.spec, INTERMEDIATE_URI_2.spec],
        false
      );
    }
  );

  await PlacesUtils.history.clear();
});
