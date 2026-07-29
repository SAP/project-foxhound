/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Because the redesign hasn't fully launched, there are legacy panes
 * that we know won't show the promo. So this is set to one that we know does.
 *
 * @type {string}
 */
const KNOWN_PANE_WITH_VISIBLE_PROMO = "home";

describe("setting-pane redesign promo", () => {
  /**
   * @param {HTMLDocument} doc
   * @param {boolean} shouldExist - Whether the promo should exist
   */
  function assertPromosExistence(doc, shouldExist) {
    const panes = [...doc.querySelectorAll("setting-pane")];
    ok(panes.length, "setting panes exist");
    for (const pane of panes) {
      const promo = pane.querySelector(".settings-redesign-promo");
      if (shouldExist) {
        ok(promo, "promo exists");
      } else {
        is(promo, null, "promo does NOT exist");
      }
    }
  }

  it("when redesign is not enabled", async () => {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.settings-redesign.enabled", false],
        ["browser.settings-redesign.promo.dismissed", false],
      ],
    });
    await openPreferencesViaOpenPreferencesAPI(KNOWN_PANE_WITH_VISIBLE_PROMO, {
      leaveOpen: true,
    });
    const doc = gBrowser.selectedBrowser.contentDocument;
    assertPromosExistence(doc, false);
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  });

  it("when redesign is enabled", async () => {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.settings-redesign.enabled", true],
        ["browser.settings-redesign.promo.dismissed", false],
      ],
    });
    await openPreferencesViaOpenPreferencesAPI(KNOWN_PANE_WITH_VISIBLE_PROMO, {
      leaveOpen: true,
    });
    const doc = gBrowser.selectedBrowser.contentDocument;
    const win = doc.documentGlobal;
    assertPromosExistence(doc, true);
    const currentPane = doc.querySelector(
      'setting-pane[data-category="paneHome"]'
    );
    const promo = currentPane.querySelector(".settings-redesign-promo");

    is(
      SpecialPowers.getBoolPref(
        "browser.settings-redesign.promo.dismissed",
        false
      ),
      false,
      "dismissed pref should be false"
    );

    is_element_visible(promo, "Promo is visible");

    is(promo.dataset.l10nId, "settings-redesign-promo", "promo has its l10nId");
    let dismissButton = promo.querySelector("moz-button");
    ok(dismissButton, "There is a dismiss button");

    EventUtils.synthesizeMouseAtCenter(dismissButton, {}, win);
    await promo.updateComplete;

    is_element_hidden(
      promo,
      "Promo is dismissed after clicking dismiss button"
    );
    is(
      SpecialPowers.getBoolPref(
        "browser.settings-redesign.promo.dismissed",
        false
      ),
      true,
      "dismissed pref should be set to true"
    );
    // Waiting an animation frame confirms all the other promos are dismissed too
    await new Promise(r => requestAnimationFrame(r));
    assertPromosExistence(doc, false);

    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  });

  it("when redesign is enabled but promo dismissed pref is set", async () => {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.settings-redesign.enabled", true],
        ["browser.settings-redesign.promo.dismissed", true],
      ],
    });
    await openPreferencesViaOpenPreferencesAPI(KNOWN_PANE_WITH_VISIBLE_PROMO, {
      leaveOpen: true,
    });
    const doc = gBrowser.selectedBrowser.contentDocument;
    assertPromosExistence(doc, false);
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  });
});
