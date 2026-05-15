/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

requestLongerTimeout(2);

describe("settings ai features", () => {
  let doc, win;

  beforeEach(async function setup() {
    await SpecialPowers.pushPrefEnv({
      set: [["browser.preferences.aiControls", true]],
    });
    await openPreferencesViaOpenPreferencesAPI("general", { leaveOpen: true });
    doc = gBrowser.selectedBrowser.contentDocument;
    win = doc.ownerGlobal;
  });

  afterEach(() => {
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  });

  function waitForAnimationFrame() {
    return new Promise(r => win.requestAnimationFrame(r));
  }

  async function openAiFeaturePanel() {
    const paneLoaded = waitForPaneChange("ai");
    const categoryButton = doc.getElementById("category-ai-features");
    categoryButton.scrollIntoView();
    EventUtils.synthesizeMouseAtCenter(categoryButton, {}, win);
    await paneLoaded;
  }

  describe("block AI confirmation dialog", () => {
    it("closes dialog and does nothing on cancel", async () => {
      await SpecialPowers.pushPrefEnv({
        set: [
          ["browser.ai.control.default", "available"],
          ["extensions.ml.enabled", true],
        ],
      });

      await openAiFeaturePanel();

      const toggle = doc.getElementById("aiControlDefaultToggle");
      const dialogEl = doc.querySelector("block-ai-confirmation-dialog");
      await dialogEl.updateComplete;

      let dialogShown = BrowserTestUtils.waitForEvent(
        dialogEl.dialog,
        "toggle"
      );
      EventUtils.synthesizeMouseAtCenter(toggle.buttonEl, {}, win);
      await dialogShown;
      Assert.ok(dialogEl.dialog.open, "Dialog is open");
      Assert.equal(
        Services.prefs.getStringPref("browser.ai.control.default"),
        "available",
        "Pref unchanged after clicking toggle"
      );

      EventUtils.synthesizeMouseAtCenter(dialogEl.cancelButton, {}, win);

      Assert.ok(!dialogEl.dialog.open, "Dialog is closed after cancel");
      Assert.equal(
        Services.prefs.getStringPref("browser.ai.control.default"),
        "available",
        "Pref unchanged after cancel"
      );
      Assert.ok(
        Services.prefs.getBoolPref("extensions.ml.enabled"),
        "ML enabled pref unchanged after cancel"
      );
    });

    it("blocks AI features on confirm, unblocks on toggle off", async () => {
      await SpecialPowers.pushPrefEnv({
        set: [
          ["browser.ai.control.default", "available"],
          ["extensions.ml.enabled", true],
        ],
      });
      Services.fog.testResetFOG();

      await openAiFeaturePanel();

      // Flip the toggle to show confirmation dialog.
      const toggle = doc.getElementById("aiControlDefaultToggle");
      const dialogEl = doc.querySelector("block-ai-confirmation-dialog");
      await dialogEl.updateComplete;
      let dialogShown = BrowserTestUtils.waitForEvent(
        dialogEl.dialog,
        "toggle"
      );
      EventUtils.synthesizeMouseAtCenter(toggle.buttonEl, {}, win);
      await dialogShown;
      Assert.ok(dialogEl.dialog.open, "Dialog is open");
      Assert.ok(!toggle.pressed, "Toggle is unpressed during confirmation");
      Assert.equal(
        Services.prefs.getStringPref("browser.ai.control.default"),
        "available",
        "Pref unchanged after clicking toggle"
      );
      Assert.ok(
        !Glean.browser.globalAiControlToggled.testGetValue(),
        "No telemetry recorded before confirmation"
      );

      // Confirm the dialog to block
      let defaultSetting = win.Preferences.getSetting("aiControlDefaultToggle");
      let translationsSetting = win.Preferences.getSetting(
        "aiControlTranslationsSelect"
      );
      Assert.equal(
        translationsSetting.value,
        "available",
        "Translations are enabled"
      );
      await waitForSettingChange(defaultSetting, () =>
        EventUtils.synthesizeMouseAtCenter(dialogEl.confirmButton, {}, win)
      );
      Assert.ok(toggle.pressed, "Toggle is pressed after block");
      Assert.ok(!dialogEl.dialog.open, "Dialog is closed after confirm");
      Assert.equal(
        Services.prefs.getStringPref("browser.ai.control.default"),
        "blocked",
        "Pref set to blocked after confirm"
      );
      Assert.ok(
        !Services.prefs.getBoolPref("extensions.ml.enabled"),
        "ML enabled pref set to false after confirm"
      );
      Assert.equal(
        translationsSetting.value,
        "blocked",
        "Translations are now blocked"
      );
      let telemetryEvents = Glean.browser.globalAiControlToggled.testGetValue();
      Assert.equal(telemetryEvents.length, 1, "One telemetry event recorded");
      Assert.equal(
        telemetryEvents[0].extra.blocked,
        "true",
        "Telemetry recorded blocked=true"
      );

      // Enable STG to confirm it stays enabled on un-block
      let stgSetting = win.Preferences.getSetting(
        "aiControlSmartTabGroupsSelect"
      );
      Assert.equal(
        stgSetting.value,
        "blocked",
        "STG is blocked after global block"
      );
      await waitForAnimationFrame();
      const stgControl = doc.getElementById("aiControlSmartTabGroupsSelect");
      stgControl.focus();
      let pickerOpened = BrowserTestUtils.waitForSelectPopupShown(
        win.docShell.chromeEventHandler.ownerGlobal
      );
      EventUtils.sendKey("space");
      await pickerOpened;
      await waitForSettingChange(stgSetting, () => {
        EventUtils.sendKey("up");
        EventUtils.sendKey("return");
      });
      Assert.equal(stgSetting.value, "enabled", "STG is now enabled");

      // Unblock to confirm reset to available and STG is still enabled
      toggle.buttonEl.scrollIntoView();
      await waitForAnimationFrame();
      await waitForSettingChange(defaultSetting, () =>
        EventUtils.synthesizeMouseAtCenter(toggle.buttonEl, {}, win)
      );
      Assert.ok(!toggle.pressed, "Toggle is not pressed after unblocking");
      Assert.equal(
        Services.prefs.getStringPref("browser.ai.control.default"),
        "available",
        "Pref set to available after unblocking"
      );
      Assert.ok(
        Services.prefs.getBoolPref("extensions.ml.enabled"),
        "ML enabled pref set to true after unblocking"
      );
      Assert.equal(
        translationsSetting.value,
        "available",
        "Translations are now available"
      );
      Assert.equal(stgSetting.value, "enabled", "STG stayed enabled");
      telemetryEvents = Glean.browser.globalAiControlToggled.testGetValue();
      Assert.equal(telemetryEvents.length, 2, "Two telemetry events recorded");
      Assert.equal(
        telemetryEvents[1].extra.blocked,
        "false",
        "Telemetry recorded blocked=false"
      );
    });
  });
});
