/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

requestLongerTimeout(3);

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
      ["browser.ai.control.smartWindow", "default"],
      ["browser.smartwindow.enabled", true],
    ],
  });
});

describe("settings ai features", () => {
  describe("managed by policy", () => {
    async function runPolicyTest(doc, name, pref, settingId) {
      try {
        Services.prefs.lockPref(pref);
        doc.documentGlobal.Preferences.getSetting(settingId).emit("change");
        await new Promise(r => doc.documentGlobal.requestAnimationFrame(r));

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

        // Smart Window enterprise policy
        const smartWindowPref = "browser.smartwindow.enabled";
        const defaultBranch = Services.prefs.getDefaultBranch(null);
        const origDefault = defaultBranch.getBoolPref(smartWindowPref, false);
        try {
          defaultBranch.setBoolPref(smartWindowPref, true);
          await runPolicyTest(
            doc,
            "SmartWindow",
            "browser.smartwindow.enabled",
            "aiControlSmartWindowSelect"
          );
        } finally {
          defaultBranch.setBoolPref("browser.smartwindow.enabled", origDefault);
        }
      });
    });
  });
});
