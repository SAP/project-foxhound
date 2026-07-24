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

      Assert.ok(
        netErrorCard.certErrorBodyTitle,
        "The error page title should exist."
      );

      const shortDesc = netErrorCard.certErrorIntro;
      const advancedButton = netErrorCard.advancedButton;
      Assert.ok(advancedButton, "The advanced button should exist.");

      Assert.equal(
        advancedButton.dataset.l10nId,
        "fp-certerror-advanced-button",
        "Button should have the 'advanced' l10n ID."
      );

      // Perform user button click interaction
      EventUtils.synthesizeMouseAtCenter(advancedButton, {}, content);

      // Wait for the exception button to be enabled
      // This ensures that the advanced section is fully loaded
      await ContentTaskUtils.waitForCondition(
        () =>
          netErrorCard.exceptionButton &&
          !netErrorCard.exceptionButton.disabled,
        "Wait for the exception button to be created."
      );

      const whatCanYouDo = netErrorCard.whatCanYouDo;
      Assert.equal(
        whatCanYouDo.dataset.l10nId,
        "fp-certerror-expired-what-can-you-do-body",
        "What can you do section should have fp-certerror-expired-what-can-you-do-body l10n ID."
      );

      const whatCanYouDoArgs = JSON.parse(whatCanYouDo.dataset.l10nArgs);
      Assert.ok(
        whatCanYouDoArgs.date,
        "What can you do section should have timestamp."
      );

      return {
        divDisplay: content.getComputedStyle(shortDesc).display,
        text: shortDesc.textContent,
        learnMoreLink: netErrorCard.learnMoreLink.href,
        whatCanYouDoText: whatCanYouDo.textContent,
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
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(localDate);

  info("Loading a bad cert page with a skewed clock");
  let contentData = await setUpPage();

  Assert.notEqual(
    contentData.divDisplay,
    "none",
    "Wrong time message information is visible"
  );

  Assert.ok(
    contentData.text.includes("expired.example.com"),
    "URL found in error message"
  );

  Assert.ok(
    contentData.whatCanYouDoText.includes(localDateFmt),
    "Correct local date displayed"
  );
  Assert.ok(
    contentData.learnMoreLink.includes("time-errors"),
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
