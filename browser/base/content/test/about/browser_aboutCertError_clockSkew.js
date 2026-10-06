/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const PREF_SERVICES_SETTINGS_CLOCK_SKEW_SECONDS =
  "services.settings.clock_skew_seconds";
const PREF_SERVICES_SETTINGS_LAST_FETCHED =
  "services.settings.last_update_seconds";

// Security CertError Felt Privacy set to false
add_task(async function checkWrongSystemTimeWarning_feltPrivacyToFalse() {
  await setSecurityCertErrorsFeltPrivacyToFalse();
  async function setUpPage() {
    let browser;
    let certErrorLoaded;
    await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      () => {
        gBrowser.selectedTab = BrowserTestUtils.addTab(
          gBrowser,
          "https://expired.example.com/"
        );
        browser = gBrowser.selectedBrowser;
        certErrorLoaded = BrowserTestUtils.waitForErrorPage(browser);
      },
      false
    );

    info("Loading and waiting for the cert error");
    await certErrorLoaded;

    return SpecialPowers.spawn(browser, [], async function () {
      let doc = content.document;
      let div = doc.getElementById("errorShortDesc");
      let learnMoreLink = doc.getElementById("learnMoreLink");

      await ContentTaskUtils.waitForCondition(
        () => div.textContent.includes("update your computer clock"),
        "Correct error message found"
      );

      return {
        divDisplay: content.getComputedStyle(div).display,
        text: div.textContent,
        learnMoreLink: learnMoreLink.href,
      };
    });
  }

  // Pretend that we recently updated our kinto clock skew pref
  Services.prefs.setIntPref(
    PREF_SERVICES_SETTINGS_LAST_FETCHED,
    Math.floor(Date.now() / 1000)
  );

  // For this test, we want to trick Firefox into believing that
  // the local system time (as returned by Date.now()) is wrong.
  // Because we don't want to actually change the local system time,
  // we will do the following:

  // Take the validity date of our test page (expired.example.com).
  let expiredDate = new Date("2010/01/05 12:00");
  let localDate = Date.now();

  // Compute the difference between the server date and the correct
  // local system date.
  let skew = Math.floor((localDate - expiredDate) / 1000);

  // Make it seem like our reference server agrees that the certificate
  // date is correct by recording the difference as clock skew.
  Services.prefs.setIntPref(PREF_SERVICES_SETTINGS_CLOCK_SKEW_SECONDS, skew);

  let localDateFmt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(localDate);

  info("Loading a bad cert page with a skewed clock");
  let message = await setUpPage();

  isnot(
    message.divDisplay,
    "none",
    "Wrong time message information is visible"
  );
  ok(
    message.text.includes("update your computer clock"),
    "Correct error message found"
  );
  ok(
    message.text.includes("expired.example.com"),
    "URL found in error message"
  );
  ok(message.text.includes(localDateFmt), "Correct local date displayed");
  ok(
    message.learnMoreLink.includes("time-errors"),
    "time-errors in the Learn More URL"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);

  Services.prefs.clearUserPref(PREF_SERVICES_SETTINGS_LAST_FETCHED);
  Services.prefs.clearUserPref(PREF_SERVICES_SETTINGS_CLOCK_SKEW_SECONDS);
});

add_task(async function checkCertError_feltPrivacyToFalse() {
  await setSecurityCertErrorsFeltPrivacyToFalse();
  async function setUpPage() {
    gBrowser.selectedTab = BrowserTestUtils.addTab(
      gBrowser,
      "https://expired.example.com/"
    );
    let browser = gBrowser.selectedBrowser;
    let certErrorLoaded = BrowserTestUtils.waitForErrorPage(browser);

    info("Loading and waiting for the cert error");
    await certErrorLoaded;

    return SpecialPowers.spawn(browser, [], async function () {
      let doc = content.document;
      let el = doc.getElementById("errorWhatToDoText");
      await ContentTaskUtils.waitForCondition(() => el.textContent);
      return el.textContent;
    });
  }

  // The particular error message will be displayed only when clock_skew_seconds is
  // less or equal to a day and the difference between date.now() and last_fetched is less than
  // or equal to 5 days. Setting the prefs accordingly.

  Services.prefs.setIntPref(
    PREF_SERVICES_SETTINGS_LAST_FETCHED,
    Math.floor(Date.now() / 1000)
  );

  let skew = 60 * 60 * 24;
  Services.prefs.setIntPref(PREF_SERVICES_SETTINGS_CLOCK_SKEW_SECONDS, skew);

  info("Loading a bad cert page");
  let message = await setUpPage();

  ok(
    message.includes(
      "The issue is most likely with the website, and there is nothing you can do" +
        " to resolve it. You can notify the website’s administrator about the problem."
    ),
    "Correct error message found"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);

  Services.prefs.clearUserPref(PREF_SERVICES_SETTINGS_LAST_FETCHED);
  Services.prefs.clearUserPref(PREF_SERVICES_SETTINGS_CLOCK_SKEW_SECONDS);
});

// Security CertError Felt Privacy set to true
add_task(async function checkWrongSystemTimeWarning_feltPrivacyToTrue() {
  await setSecurityCertErrorsFeltPrivacyToTrue();
  async function setUpPage() {
    let browser;
    let certErrorLoaded;
    await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      () => {
        gBrowser.selectedTab = BrowserTestUtils.addTab(
          gBrowser,
          "https://expired.example.com/"
        );
        browser = gBrowser.selectedBrowser;
        certErrorLoaded = BrowserTestUtils.waitForErrorPage(browser);
      },
      false
    );

    info("Loading and waiting for the cert error");
    await certErrorLoaded;

    return SpecialPowers.spawn(browser, [], async function () {
      const netErrorCard =
        content.document.querySelector("net-error-card").wrappedJSObject;
      await netErrorCard.getUpdateComplete();

      const title = netErrorCard.errorTitle;
      Assert.ok(title, "The error page title should exist.");
      Assert.equal(
        title.dataset.l10nId,
        "clockSkewError-title",
        "Should show the clock skew error title"
      );

      const introEl = netErrorCard.errorIntro;
      Assert.equal(
        introEl.dataset.l10nId,
        "fp-certerror-clock-skew-intro",
        "Should show the clock skew intro text"
      );

      const tryAgainButton = netErrorCard.tryAgainButton;
      Assert.ok(tryAgainButton, "Try Again button should be present");

      const advancedButton = netErrorCard.advancedButton;
      Assert.ok(!advancedButton, "Advanced button should not be present");

      const learnMoreLink = netErrorCard.learnMoreLink;

      const whatCanYouDo = netErrorCard.whatCanYouDo;
      Assert.ok(whatCanYouDo, "What can you do section should be present");
      Assert.equal(
        whatCanYouDo.dataset.l10nId,
        "fp-certerror-clock-skew-what-can-you-do-body",
        "What can you do section should have clock skew l10n ID"
      );
      const whatCanYouDoArgs = JSON.parse(whatCanYouDo.dataset.l10nArgs);
      Assert.ok(
        whatCanYouDoArgs.now,
        "What can you do section should have a 'now' timestamp"
      );

      return {
        introDisplay: content.getComputedStyle(introEl).display,
        introText: introEl.textContent,
        learnMoreHref: learnMoreLink.href,
      };
    });
  }

  // Pretend that we recently updated our kinto clock skew pref
  SpecialPowers.pushPrefEnv({
    set: [[PREF_SERVICES_SETTINGS_LAST_FETCHED, Math.floor(Date.now() / 1000)]],
  });

  // For this test, we want to trick Firefox into believing that
  // the local system time (as returned by Date.now()) is wrong.
  // Because we don't want to actually change the local system time,
  // we will do the following:

  // Take the validity date of our test page (expired.example.com).
  let expiredDate = new Date("2010/01/05 12:00");
  let localDate = Date.now();

  // Compute the difference between the server date and the correct
  // local system date.
  let skew = Math.floor((localDate - expiredDate) / 1000);

  // Make it seem like our reference server agrees that the certificate
  // date is correct by recording the difference as clock skew.
  SpecialPowers.pushPrefEnv({
    set: [[PREF_SERVICES_SETTINGS_CLOCK_SKEW_SECONDS, skew]],
  });

  let localDateFmt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(localDate);

  info("Loading a bad cert page with a skewed clock");
  let contentData = await setUpPage();

  Assert.notEqual(
    contentData.introDisplay,
    "none",
    "Clock skew intro should be visible"
  );

  Assert.ok(
    contentData.introText.includes("expired.example.com"),
    "URL found in clock skew intro"
  );

  Assert.ok(
    contentData.introText.includes(localDateFmt),
    "Correct local date displayed in clock skew intro"
  );

  Assert.ok(
    contentData.learnMoreHref.includes("time-errors"),
    "time-errors in the Learn More URL"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function checkCertError_feltPrivacyToTrue() {
  await setSecurityCertErrorsFeltPrivacyToTrue();

  async function setUpPage() {
    gBrowser.selectedTab = BrowserTestUtils.addTab(
      gBrowser,
      "https://expired.example.com/"
    );
    let browser = gBrowser.selectedBrowser;
    let certErrorLoaded = BrowserTestUtils.waitForErrorPage(browser);

    info("Loading and waiting for the cert error");
    await certErrorLoaded;

    return SpecialPowers.spawn(browser, [], async function () {
      const netErrorCard =
        content.document.querySelector("net-error-card").wrappedJSObject;
      await netErrorCard.getUpdateComplete();

      // Get the advanced container
      // Perform user button click interaction
      EventUtils.synthesizeMouseAtCenter(
        netErrorCard.advancedButton,
        {},
        content
      );

      await ContentTaskUtils.waitForCondition(
        () =>
          netErrorCard.exceptionButton &&
          !netErrorCard.exceptionButton.disabled,
        "Wait for the exception button to be created."
      );

      const whatCanYouDo = netErrorCard.whatCanYouDo;
      await ContentTaskUtils.waitForCondition(() => whatCanYouDo.textContent);
      Assert.equal(
        whatCanYouDo.dataset.l10nId,
        "fp-certerror-expired-what-can-you-do-body",
        "Should have the fp-certerror-expired-what-can-you-do-body l10n ID."
      );
      return whatCanYouDo.textContent;
    });
  }

  // The particular error message will be displayed only when clock_skew_seconds is
  // less or equal to a day and the difference between date.now() and last_fetched is less than
  // or equal to 5 days. Setting the prefs accordingly.

  let skew = 60 * 60 * 24;
  SpecialPowers.pushPrefEnv({
    set: [
      [PREF_SERVICES_SETTINGS_LAST_FETCHED, Math.floor(Date.now() / 1000)],
      [PREF_SERVICES_SETTINGS_CLOCK_SKEW_SECONDS, skew],
    ],
  });

  info("Loading a bad cert page");
  let message = await setUpPage();

  let localDate = Date.now();
  let localDateFmt = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(localDate);

  Assert.ok(message.includes(localDateFmt), "Message has local date displayed");

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

// Load expired.example.com with the given prefs set, wait for the error page,
// and return whether the page rendered a clock skew error.
async function loadExpiredAndCheckClockSkew(prefs) {
  await SpecialPowers.pushPrefEnv({ set: prefs });

  let browser;
  let certErrorLoaded;
  await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    () => {
      gBrowser.selectedTab = BrowserTestUtils.addTab(
        gBrowser,
        "https://expired.example.com/"
      );
      browser = gBrowser.selectedBrowser;
      certErrorLoaded = BrowserTestUtils.waitForErrorPage(browser);
    },
    false
  );
  await certErrorLoaded;

  const hasClockSkew = await SpecialPowers.spawn(
    browser,
    [],
    async function () {
      const div = content.document.getElementById("errorShortDesc");
      await ContentTaskUtils.waitForCondition(
        () => div.textContent.length,
        "Error page rendered"
      );
      return content.document.body.classList.contains("clockSkewError");
    }
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  return hasClockSkew;
}

add_task(async function test_detectClockSkew() {
  await setSecurityCertErrorsFeltPrivacyToFalse();

  // expired.example.com has a cert valid only Jan 5-6, 2010. Compute a skew
  // that places (Date.now() - skew) inside that validity window.
  const certMidpointMs = new Date("2010-01-05T12:00:00Z").getTime();
  const skewSeconds = Math.floor((Date.now() - certMidpointMs) / 1000);
  const nowSec = Math.floor(Date.now() / 1000);

  for (const { prefs, expectSkew, description } of [
    {
      prefs: [
        [PREF_SERVICES_SETTINGS_CLOCK_SKEW_SECONDS, skewSeconds],
        [PREF_SERVICES_SETTINGS_LAST_FETCHED, nowSec - 60],
      ],
      expectSkew: true,
      description:
        "Should detect clock skew via remote-settings when skew > 24h, " +
        "recent fetch, and adjusted date falls within cert validity",
    },
    {
      prefs: [
        [PREF_SERVICES_SETTINGS_CLOCK_SKEW_SECONDS, skewSeconds],
        [PREF_SERVICES_SETTINGS_LAST_FETCHED, nowSec - 7 * 86400],
      ],
      expectSkew: false,
      description:
        "Should not detect clock skew via remote-settings when fetch is stale",
    },
    {
      prefs: [
        [PREF_SERVICES_SETTINGS_CLOCK_SKEW_SECONDS, 3600],
        [PREF_SERVICES_SETTINGS_LAST_FETCHED, nowSec - 60],
      ],
      expectSkew: false,
      description:
        "Should not detect clock skew when difference is under 24 hours",
    },
    {
      prefs: [
        [PREF_SERVICES_SETTINGS_CLOCK_SKEW_SECONDS, 0],
        [PREF_SERVICES_SETTINGS_LAST_FETCHED, 0],
      ],
      expectSkew: false,
      description:
        "Should not detect clock skew when system clock is after the build date",
    },
    {
      prefs: [
        [PREF_SERVICES_SETTINGS_CLOCK_SKEW_SECONDS, 0],
        [PREF_SERVICES_SETTINGS_LAST_FETCHED, nowSec - 60],
      ],
      expectSkew: false,
      description: "Should not detect clock skew under normal conditions",
    },
  ]) {
    Assert.equal(
      await loadExpiredAndCheckClockSkew(prefs),
      expectSkew,
      description
    );
  }
});
