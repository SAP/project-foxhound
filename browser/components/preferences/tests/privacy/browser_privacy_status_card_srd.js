/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const CARD_NAME = "security-privacy-card";
const ISSUE_CONTROL_ID = "securityWarningsGroup";

// Some things are set dangerously in the test environment.
// We can suppress these errors!
const RESET_PROBLEMATIC_TEST_DEFAULTS = [
  [
    "browser.preferences.config_warning.warningAllowFingerprinters.dismissed",
    true,
  ],
  [
    "browser.preferences.config_warning.warningThirdPartyCookies.dismissed",
    true,
  ],
  ["browser.preferences.config_warning.warningPasswordManager.dismissed", true],
  ["browser.preferences.config_warning.warningPopupBlocker.dismissed", true],
  [
    "browser.preferences.config_warning.warningExtensionInstall.dismissed",
    true,
  ],
  ["browser.preferences.config_warning.warningSafeBrowsing.dismissed", true],
  ["browser.preferences.config_warning.warningDoH.dismissed", true],
  ["browser.preferences.config_warning.warningECH.dismissed", true],
  ["browser.preferences.config_warning.warningCT.dismissed", true],
  ["browser.preferences.config_warning.warningCRLite.dismissed", true],
  [
    "browser.preferences.config_warning.warningCertificatePinning.dismissed",
    true,
  ],
  ["browser.preferences.config_warning.warningTLSMin.dismissed", true],
  ["browser.preferences.config_warning.warningTLSMax.dismissed", true],
  [
    "browser.preferences.config_warning.warningProxyAutodetection.dismissed",
    true,
  ],
  [
    "browser.preferences.config_warning.warningContentResourceURI.dismissed",
    true,
  ],
  ["browser.preferences.config_warning.warningWorkerMIME.dismissed", true],
  ["browser.preferences.config_warning.warningTopLevelDataURI.dismissed", true],
  [
    "browser.preferences.config_warning.warningActiveMixedContent.dismissed",
    true,
  ],
  ["browser.preferences.config_warning.warningInnerHTMLltgt.dismissed", true],
  ["browser.preferences.config_warning.warningFileURIOrigin.dismissed", true],
  [
    "browser.preferences.config_warning.warningPrivelegedConstraint.dismissed",
    true,
  ],
  ["browser.preferences.config_warning.warningProcessSandbox.dismissed", true],
];

function getCardAndCheckHeader(document, expectedHeaderL10n) {
  let elements = document.getElementsByTagName(CARD_NAME);
  Assert.equal(elements.length, 1, "Card present in preferences");
  let card = elements[0];
  let header = card.shadowRoot.getElementById("heading");
  Assert.equal(
    header.attributes.getNamedItem("data-l10n-id").value,
    expectedHeaderL10n
  );
  return card;
}

function assertHappyBullets(card) {
  let bullets = card.shadowRoot.querySelectorAll("li");
  Assert.equal(bullets.length, 2);
  for (const bullet of bullets) {
    Assert.equal(
      bullet.classList.contains("status-ok"),
      true,
      "All bullets must be happy!"
    );
  }
}

// Returns a promise that resolves once `element` intersects the viewport.
// Resolves immediately if it is already in view at call time; otherwise waits
// for IntersectionObserver to report intersection. The synchronous check
// avoids a race where the observer's initial callback (which is dispatched
// async) can fire with isIntersecting:false if the element's state changes
// between observe() and the queued callback, causing the promise to hang.
function waitForInViewport(element, win) {
  let rect = element.getBoundingClientRect();
  if (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < win.innerHeight &&
    rect.left < win.innerWidth
  ) {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    let observer = new win.IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(element);
  });
}

add_task(async function test_scroll_issue_link_brings_warning_card_into_view() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.ui.status_card.testing.show_issue", true],
      ["general.smoothScroll", false],
    ].concat(RESET_PROBLEMATIC_TEST_STATUSES),
  });

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:preferences#privacy" },
    async function (browser) {
      let doc = browser.contentDocument;
      let win = browser.contentWindow;
      let card = getCardAndCheckHeader(
        doc,
        "security-privacy-status-problem-header"
      );

      let warningCard = doc.getElementById("warningCard");
      Assert.notEqual(warningCard, null, "warningCard exists in the document");
      warningCard.expanded = false;

      let alertBullet = card.shadowRoot.querySelector("li.status-alert");
      let issueLink = alertBullet.querySelector("a");
      Assert.notEqual(issueLink, null, "Issue link is present");
      // The link has href="" which would otherwise navigate the page.
      issueLink.addEventListener("click", e => e.preventDefault(), {
        once: true,
      });

      let inView = waitForInViewport(warningCard, win);
      issueLink.click();
      await inView;

      Assert.ok(
        doc.location.hash.startsWith("#privacy"),
        "Hash remains on #privacy when clicking from #privacy"
      );
      Assert.ok(warningCard.expanded, "Warning card accordion is expanded");
      ok(true, "warningCard intersected the viewport after the click");
    }
  );

  await SpecialPowers.popPrefEnv();
});

add_task(
  async function test_scroll_strict_label_brings_etp_advanced_into_view() {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.contentblocking.category", "strict"],
        ["general.smoothScroll", false],
      ].concat(RESET_PROBLEMATIC_TEST_STATUSES),
    });

    await BrowserTestUtils.withNewTab(
      { gBrowser, url: "about:preferences#privacy" },
      async function (browser) {
        let doc = browser.contentDocument;
        let win = browser.contentWindow;
        let card = getCardAndCheckHeader(
          doc,
          "security-privacy-status-ok-header"
        );

        let strictLabel = card.shadowRoot.getElementById("strictEnabled");
        Assert.notEqual(strictLabel, null, "Strict label is present");
        let strictLink = strictLabel.querySelector("a");
        Assert.notEqual(strictLink, null, "Strict link is present");
        // The link has href="" which would otherwise navigate the page; the
        // click handler is on the <small> ancestor and the link is the
        // a11y-accessible target for clicks.
        strictLink.addEventListener("click", e => e.preventDefault(), {
          once: true,
        });

        let paneShown = BrowserTestUtils.waitForEvent(doc, "paneshown");
        strictLink.click();
        await paneShown;

        Assert.equal(
          doc.location.hash,
          "#etp",
          "Hash is updated to the #etp panel"
        );

        let radioGroup = doc.getElementById(
          "contentBlockingCategoryRadioGroup"
        );
        Assert.notEqual(
          radioGroup,
          null,
          "contentBlockingCategoryRadioGroup exists"
        );
        await waitForInViewport(radioGroup, win);
        ok(
          true,
          "contentBlockingCategoryRadioGroup intersected the viewport after clicking strict label"
        );
      }
    );

    await SpecialPowers.popPrefEnv();
  }
);

add_task(
  async function test_scroll_custom_label_brings_etp_advanced_into_view() {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.contentblocking.category", "custom"],
        ["general.smoothScroll", false],
      ].concat(RESET_PROBLEMATIC_TEST_STATUSES),
    });

    await BrowserTestUtils.withNewTab(
      { gBrowser, url: "about:preferences#privacy" },
      async function (browser) {
        let doc = browser.contentDocument;
        let win = browser.contentWindow;
        let card = getCardAndCheckHeader(
          doc,
          "security-privacy-status-ok-header"
        );

        let customLabel = card.shadowRoot.getElementById("customEnabled");
        Assert.notEqual(customLabel, null, "Custom label is present");
        let customLink = customLabel.querySelector("a");
        Assert.notEqual(customLink, null, "Custom link is present");
        // The link has href="" which would otherwise navigate the page; the
        // click handler is on the <small> ancestor and the link is the
        // a11y-accessible target for clicks.
        customLink.addEventListener("click", e => e.preventDefault(), {
          once: true,
        });

        let paneShown = BrowserTestUtils.waitForEvent(doc, "paneshown");
        customLink.click();
        await paneShown;

        Assert.equal(
          doc.location.hash,
          "#etp",
          "Hash is updated to the #etp panel"
        );

        let radioGroup = doc.getElementById(
          "contentBlockingCategoryRadioGroup"
        );
        Assert.notEqual(
          radioGroup,
          null,
          "contentBlockingCategoryRadioGroup exists"
        );
        await waitForInViewport(radioGroup, win);
        ok(
          true,
          "contentBlockingCategoryRadioGroup intersected the viewport after clicking custom label"
        );
      }
    );

    await SpecialPowers.popPrefEnv();
  }
);

add_task(async function test_scroll_update_button_switches_panel_and_scrolls() {
  if (!AppConstants.MOZ_UPDATER) {
    info("Skipping update button scroll test: MOZ_UPDATER is not enabled");
    return;
  }

  await SpecialPowers.pushPrefEnv({
    set: [["general.smoothScroll", false]].concat(
      RESET_PROBLEMATIC_TEST_STATUSES
    ),
  });

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:preferences#privacy" },
    async function (browser) {
      let doc = browser.contentDocument;
      let win = browser.contentWindow;
      let card = doc.getElementsByTagName(CARD_NAME)[0];
      Assert.notEqual(card, null, "Card present in preferences");

      // STATUS.MANUAL_UPDATE = 5 -> renders the "update needed" branch whose
      // moz-box-link is bound to scrollToTargetOnPanel("#about", "updateApp").
      card.appUpdateStatus = 5;
      await card.updateComplete;

      let updateLink = card.shadowRoot.querySelector(
        'li.status-alert moz-box-link[data-l10n-id="security-privacy-status-update-button-label"]'
      );
      Assert.notEqual(updateLink, null, "Update box-link is present");

      Assert.equal(
        doc.location.hash,
        "#privacy",
        "Sanity check: starting on #privacy panel"
      );

      let paneShown = BrowserTestUtils.waitForEvent(doc, "paneshown");
      updateLink.click();
      await paneShown;

      Assert.equal(
        doc.location.hash,
        "#about",
        "Hash is updated to the target panel hash"
      );

      let updateApp = doc.querySelector(
        '[data-subcategory="update-state"] moz-fieldset'
      );
      Assert.notEqual(updateApp, null, "updateApp exists in document");
      Assert.ok(updateApp.checkVisibility(), "update element is visible");
      await waitForInViewport(updateApp, win);
      ok(true, "updateApp intersected the viewport after pane switch");
    }
  );

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_section_default_state() {
  await SpecialPowers.pushPrefEnv({
    set: RESET_PROBLEMATIC_TEST_DEFAULTS,
  });

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:preferences#privacy" },
    async function (browser) {
      let card = getCardAndCheckHeader(
        browser.contentDocument,
        "security-privacy-status-ok-header"
      );
      assertHappyBullets(card);
      let strictLabel = card.shadowRoot.getElementById("strictEnabled");
      Assert.equal(strictLabel, null, "Strict mustn't be enabled");
    }
  );

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_section_strict_indicator() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.contentblocking.category", "strict"]].concat(
      RESET_PROBLEMATIC_TEST_DEFAULTS
    ),
  });

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:preferences#privacy" },
    async function (browser) {
      let card = getCardAndCheckHeader(
        browser.contentDocument,
        "security-privacy-status-ok-header"
      );
      assertHappyBullets(card);
      let strictLabel = card.shadowRoot.getElementById("strictEnabled");
      Assert.notEqual(strictLabel, null, "Strict must be indicated");
    }
  );

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_issue_present() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.contentblocking.category", "strict"],
      ["privacy.ui.status_card.testing.show_issue", true],
    ].concat(RESET_PROBLEMATIC_TEST_DEFAULTS),
  });

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:preferences#privacy" },
    async function (browser) {
      let card = getCardAndCheckHeader(
        browser.contentDocument,
        "security-privacy-status-problem-header"
      );
      let bulletIcons = card.shadowRoot.querySelectorAll("li");
      Assert.equal(bulletIcons.length, 2);
      let problemsBulletIcon = bulletIcons[0];
      Assert.ok(problemsBulletIcon.classList.contains("status-alert"));
      Assert.notEqual(
        problemsBulletIcon.querySelector("a"),
        null,
        "Link to issues is present"
      );

      // config card
      let configCard = browser.contentDocument.getElementById(ISSUE_CONTROL_ID);
      Assert.notEqual(configCard, null, "Issue card is present");
      let issues = configCard.listItems;
      Assert.equal(issues.length, 1, "One issue present");
    }
  );

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_issue_fix() {
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.ui.status_card.testing.show_issue", true]].concat(
      RESET_PROBLEMATIC_TEST_DEFAULTS
    ),
  });
  Services.fog.testResetFOG();

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:preferences#privacy" },
    async function (browser) {
      // config card
      let configCard = browser.contentDocument.getElementById(ISSUE_CONTROL_ID);
      Assert.notEqual(configCard, null, "Issue card is present");
      let issues = configCard.listItems;
      Assert.equal(issues.length, 1, "One issue present");
      let issue = issues[0];
      let fixButton = issue.querySelector(
        'moz-button[data-l10n-id="issue-card-reset-button"]'
      );
      let prefChange = TestUtils.waitForPrefChange(
        "privacy.ui.status_card.testing.show_issue"
      );
      fixButton.click();
      await prefChange;
      await configCard.updateComplete;
      let afterIssues = configCard.listItems;
      Assert.equal(
        afterIssues.length,
        0,
        "Issues are gone after the pref is fixed"
      );
      Assert.ok(
        !Services.prefs.prefHasUserValue(
          "privacy.ui.status_card.testing.show_issue"
        ),
        "Pref has no user value after clicking the fix button"
      );
      let events =
        Glean.securityPreferencesWarnings.warningFixed.testGetValue();
      Assert.equal(events.length, 1, "One telemetry event was recorded");
      Assert.equal(
        events[0].category,
        "security.preferences.warnings",
        "Category is correct"
      );
      Assert.equal(events[0].name, "warning_fixed", "Event name is correct");

      let warningsShownEvents =
        Glean.securityPreferencesWarnings.warningsShown.testGetValue();
      Assert.equal(
        warningsShownEvents.length,
        1,
        "warningsShown telemetry was recorded exactly once"
      );
      Assert.equal(
        warningsShownEvents[0].extra.count,
        "1",
        "Count of warnings shown is correct"
      );
    }
  );

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_issue_dismiss() {
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.ui.status_card.testing.show_issue", true]].concat(
      RESET_PROBLEMATIC_TEST_DEFAULTS
    ),
  });
  Services.fog.testResetFOG();

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:preferences#privacy" },
    async function (browser) {
      // config card
      let configCard = browser.contentDocument.getElementById(ISSUE_CONTROL_ID);
      Assert.notEqual(configCard, null, "Issue card is present");
      let issues = configCard.listItems;
      Assert.equal(issues.length, 1, "One issue present");
      let issue = issues[0];
      let dismissButton = issue.querySelector(
        'moz-button[data-l10n-id="issue-card-dismiss-button"]'
      );
      let prefChange = TestUtils.waitForPrefChange(
        "browser.preferences.config_warning.warningTest.dismissed"
      );
      dismissButton.click();
      await prefChange;
      await configCard.updateComplete;
      let afterIssues = configCard.listItems;
      Assert.equal(
        afterIssues.length,
        0,
        "Issues are gone after the setting is dismissed"
      );
      Assert.ok(
        Services.prefs.prefHasUserValue(
          "browser.preferences.config_warning.warningTest.dismissed"
        ),
        "Pref has no user value after clicking the fix button"
      );
      let events =
        Glean.securityPreferencesWarnings.warningDismissed.testGetValue();
      Assert.equal(events.length, 1, "One telemetry event was recorded");
      Assert.equal(
        events[0].category,
        "security.preferences.warnings",
        "Category is correct"
      );
      Assert.equal(
        events[0].name,
        "warning_dismissed",
        "Event name is correct"
      );
      let warningsShownEvents =
        Glean.securityPreferencesWarnings.warningsShown.testGetValue();
      Assert.equal(
        warningsShownEvents.length,
        1,
        "warningsShown telemetry was recorded exactly once"
      );
      Assert.equal(
        warningsShownEvents[0].extra.count,
        "1",
        "Count of warnings shown is correct"
      );
      Services.prefs.clearUserPref(
        "browser.preferences.config_warning.warningTest.dismissed"
      );
    }
  );

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_dismiss_all_hides_issues() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.ui.status_card.testing.show_issue", true],
      ["browser.preferences.config_warning.dismissAll", true],
    ].concat(RESET_PROBLEMATIC_TEST_DEFAULTS),
  });

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:preferences#privacy" },
    async function (browser) {
      let card = getCardAndCheckHeader(
        browser.contentDocument,
        "security-privacy-status-ok-header"
      );
      assertHappyBullets(card);

      let configCard = browser.contentDocument.getElementById(ISSUE_CONTROL_ID);
      Assert.ok(
        BrowserTestUtils.isHidden(configCard),
        "Issue card is not present when dismissAll is true"
      );
    }
  );

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_update_status_indicator() {
  await SpecialPowers.pushPrefEnv({
    set: RESET_PROBLEMATIC_TEST_DEFAULTS,
  });

  // Define testers for each UI state.
  let absent = card => {
    let label = card.shadowRoot.querySelector("li:nth-child(3) p");
    Assert.equal(label, null, "No install status label is present");
  };
  let issue = card => {
    let label = card.shadowRoot.querySelector("li:nth-child(3) p");
    Assert.equal(
      label.attributes.getNamedItem("data-l10n-id").value,
      "security-privacy-status-update-error-label",
      "Label correctly identifies an issue"
    );
  };
  let needed = card => {
    let label = card.shadowRoot.querySelector("li:nth-child(3) p");
    Assert.equal(
      label.attributes.getNamedItem("data-l10n-id").value,
      "security-privacy-status-update-needed-label",
      "Label correctly identifies an update is needed"
    );
  };
  let ok = card => {
    let label = card.shadowRoot.querySelector("li:nth-child(3) p");
    Assert.equal(
      label.attributes.getNamedItem("data-l10n-id").value,
      "security-privacy-status-up-to-date-label",
      "Label correctly identifies software up to date"
    );
  };
  let checking = card => {
    let label = card.shadowRoot.querySelector("li:nth-child(3) p");
    Assert.equal(
      label.attributes.getNamedItem("data-l10n-id").value,
      "security-privacy-status-update-checking-label",
      "Label correctly identifies software update checking now"
    );
  };

  // Define the expected result for each different test case.
  // The keys are different AppUpdater.STATUS values.
  let cases = {};
  cases[0] = issue;
  cases[1] = absent;
  cases[2] = absent;
  cases[3] = absent;
  cases[4] = issue;
  cases[5] = needed;
  cases[6] = checking;
  cases[7] = ok;
  cases[8] = needed;
  cases[9] = issue;
  cases[10] = needed;
  cases[11] = needed;
  cases[12] = needed;
  cases[13] = issue;
  cases[14] = issue;

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:preferences#privacy" },
    async function (browser) {
      let elements = browser.contentDocument.getElementsByTagName(CARD_NAME);
      Assert.equal(elements.length, 1, "Card present in preferences");
      let card = elements[0];
      for (const status in cases) {
        info(`testing AppUpdateStatus ${status}`);
        card.appUpdateStatus = parseInt(status);
        await card.updateComplete;
        cases[status](card);
      }
    }
  );

  await SpecialPowers.popPrefEnv();
});
