/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      // Show the ETP status section in the privacy pane.
      ["browser.settings-redesign.etpStatus.enabled", true],
      // Ensure we start from ETP "standard".
      ["browser.contentblocking.category", "standard"],
    ],
  });
});

/**
 * Helper for waiting for and asserting the ETP status item state.
 * Can be called both when the item already changed or when we need to wait for the change.
 *
 * @param {Document} doc - The preferences document.
 * @param {*} options - The expected ETP status item state.
 * @param {string} options.l10nId - The expected l10nId attribute value.
 * @param {string} options.description - The expected description attribute value.
 */
async function waitForAndAssertEtpStatusItemState(doc, { l10nId }) {
  let etpStatusItem = doc.getElementById("etpStatusItem");
  Assert.ok(
    BrowserTestUtils.isVisible(etpStatusItem),
    "ETP status box item should be visible"
  );

  let condition = () => {
    return etpStatusItem.getAttribute("data-l10n-id") == l10nId;
  };
  if (!condition()) {
    await BrowserTestUtils.waitForMutationCondition(
      etpStatusItem,
      { attributes: true, attributeFilter: ["data-l10n-id", "description"] },
      condition
    );
  }

  Assert.equal(etpStatusItem.getAttribute("data-l10n-id"), l10nId);
}

// Test that the ETP status section updates correctly when changing the ETP category.
add_task(async function test_status_categories() {
  await openPreferencesViaOpenPreferencesAPI("privacy", { leaveOpen: true });
  let doc = gBrowser.contentDocument;

  await waitForAndAssertEtpStatusItemState(doc, {
    l10nId: "preferences-etp-level-standard",
  });

  info("Switch to ETP `strict`");
  Services.prefs.setStringPref("browser.contentblocking.category", "strict");

  await waitForAndAssertEtpStatusItemState(doc, {
    l10nId: "preferences-etp-level-strict",
  });

  info("Switch to ETP `custom`");
  Services.prefs.setStringPref("browser.contentblocking.category", "custom");

  await waitForAndAssertEtpStatusItemState(doc, {
    l10nId: "preferences-etp-level-custom",
  });

  info("Switch back to default ETP `standard`");
  Services.prefs.clearUserPref("browser.contentblocking.category");

  await waitForAndAssertEtpStatusItemState(doc, {
    l10nId: "preferences-etp-level-standard",
  });

  gBrowser.removeCurrentTab();
});

// Test that the protections dashboard link in the ETP status section opens the about:protections page.
add_task(async function test_protections_dashboard_link() {
  await openPreferencesViaOpenPreferencesAPI("privacy", { leaveOpen: true });
  let doc = gBrowser.contentDocument;

  let protectionsDashboardLink = doc.getElementById("protectionsDashboardLink");

  Assert.ok(
    BrowserTestUtils.isVisible(protectionsDashboardLink),
    "Protections dashboard link is visible."
  );

  let linkPromise = BrowserTestUtils.waitForNewTab(
    gBrowser,
    "about:protections"
  );
  await BrowserTestUtils.synthesizeMouseAtCenter(
    "#protectionsDashboardLink",
    {},
    gBrowser.selectedBrowser
  );
  let tab = await linkPromise;

  Assert.equal(
    tab.linkedBrowser.currentURI.spec,
    "about:protections",
    "Protections dashboard link opened the about:protections page."
  );

  // about:protections tab.
  BrowserTestUtils.removeTab(tab);
  // Preferences tab.
  gBrowser.removeCurrentTab();
});
