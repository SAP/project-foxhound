/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

requestLongerTimeout(3);

async function withPrefsPane(pane, testFn) {
  await openPreferencesViaOpenPreferencesAPI(pane, { leaveOpen: true });
  let doc = gBrowser.selectedBrowser.contentDocument;
  try {
    await testFn(doc);
  } finally {
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }
}

add_setup(async function setupPrefs() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.preferences.aiControls", true],
      ["browser.ai.control.default", "available"],
      ["browser.ai.control.translations", "default"],
      ["browser.ai.control.pdfjsAltText", "default"],
      ["browser.ai.control.smartTabGroups", "default"],
      ["browser.ai.control.linkPreviewKeyPoints", "default"],
      ["browser.ai.control.sidebarChatbot", "default"],
    ],
  });
});

describe("settings ai features", () => {
  it("shows Smart Window activate when preferences enabled and user has not given consent", async () => {
    await SpecialPowers.pushPrefEnv({
      set: [["browser.smartwindow.enabled", true]],
    });

    await withPrefsPane("ai", async doc => {
      const smartWindowActivateLink = doc.getElementById(
        "activateSmartWindowLink"
      );

      Assert.ok(
        BrowserTestUtils.isVisible(smartWindowActivateLink),
        "smartWindowActivateLink is visible"
      );
    });

    await SpecialPowers.popPrefEnv();
  });

  it("hides Smart Window activate and show personalize button when feature enabled and has conset", async () => {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.smartwindow.enabled", true],
        ["browser.smartwindow.tos.consentTime", 1770830464],
      ],
    });

    await withPrefsPane("ai", async doc => {
      const smartWindowActivateLink = doc.getElementById(
        "activateSmartWindowLink"
      );
      const smartWindowPersonalizeButton = doc.getElementById(
        "personalizeSmartWindowButton"
      );

      Assert.ok(
        !BrowserTestUtils.isVisible(smartWindowActivateLink) &&
          BrowserTestUtils.isVisible(smartWindowPersonalizeButton),
        "smartWindowActivateLink is hidden and smartWindowPersonalizeButton is visible"
      );
    });

    await SpecialPowers.popPrefEnv();
  });

  describe("managed by policy", () => {
    async function runPolicyTest(doc, name, pref, settingId) {
      try {
        Services.prefs.lockPref(pref);
        doc.ownerGlobal.Preferences.getSetting(settingId).emit("change");
        await new Promise(r => doc.ownerGlobal.requestAnimationFrame(r));

        const control = doc.getElementById(settingId);
        Assert.ok(control, `${name} control exists`);
        Assert.ok(
          BrowserTestUtils.isVisible(control),
          `${name} control is visible when locked`
        );
        Assert.ok(
          control.disabled,
          `${name} control is disabled when pref is locked`
        );
      } finally {
        Services.prefs.unlockPref(pref);
      }
    }

    it("disables based on enterprise policies", async () => {
      await withPrefsPane("ai", async doc => {
        await runPolicyTest(
          doc,
          "Smart Tab Groups",
          "browser.tabs.groups.smart.userEnabled",
          "aiControlSmartTabGroupsSelect"
        );
        await runPolicyTest(
          doc,
          "Link Preview",
          "browser.ml.linkPreview.optin",
          "aiControlLinkPreviewKeyPointsSelect"
        );
        await runPolicyTest(
          doc,
          "Sidebar Chatbot",
          "browser.ml.chat.enabled",
          "aiControlSidebarChatbotSelect"
        );
        await runPolicyTest(
          doc,
          "Translations",
          "browser.translations.enable",
          "aiControlTranslationsSelect"
        );
      });
    });
  });
});
