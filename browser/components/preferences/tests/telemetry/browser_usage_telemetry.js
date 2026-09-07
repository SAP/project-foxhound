/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function testSettingGroupTelemetry() {
  Services.fog.testResetFOG();
  let sessionId;

  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: "about:preferences",
    },
    async () => {
      let win = gBrowser.selectedBrowser.contentWindow;
      let doc = win.document;

      win.Preferences.addSetting({
        id: "test-checkbox",
        get: () => false,
        set: () => {},
      });
      win.Preferences.addSetting({
        id: "test-radio",
        get: () => "one",
        set: () => {},
      });
      win.Preferences.addSetting({
        id: "test-select",
        get: () => "one",
        set: () => {},
      });
      win.Preferences.addSetting({
        id: "test-button",
      });
      win.Preferences.addSetting({
        id: "test-picker",
        get: () => "light",
        set: () => {},
      });

      let group = doc.createElement("setting-group");
      group.groupId = "testing";
      group.config = {
        id: "testingGroup",
        items: [
          {
            id: "test-checkbox",
            l10nId: "httpsonly-radio-disabled3",
          },
          {
            id: "test-radio",
            l10nId: "httpsonly-radio-disabled3",
            control: "moz-radio-group",
            options: [
              {
                id: "test-radio-one",
                l10nId: "httpsonly-radio-disabled3",
                value: "one",
              },
              {
                id: "test-radio-two",
                l10nId: "httpsonly-radio-disabled3",
                value: "two",
                items: [
                  {
                    id: "test-button",
                    l10nId: "httpsonly-radio-enabled-pbm",
                    control: "moz-button",
                  },
                ],
              },
            ],
          },
          {
            id: "test-select",
            l10nId: "httpsonly-radio-disabled3",
            control: "moz-select",
            options: [
              {
                id: "test-select-one",
                l10nId: "httpsonly-radio-enabled-pbm",
                value: "one",
              },
              {
                id: "test-select-two",
                l10nId: "httpsonly-radio-enabled-pbm",
                value: "two",
              },
            ],
          },
          {
            id: "test-picker",
            control: "moz-visual-picker",
            options: [
              {
                value: "light",
                l10nId: "preferences-web-appearance-choice-light2",
                controlAttrs: {
                  id: "test-picker-light",
                  class: "setting-chooser-item",
                  imagesrc:
                    "chrome://browser/content/preferences/web-appearance-light.svg",
                },
              },
              {
                value: "dark",
                l10nId: "preferences-web-appearance-choice-dark2",
                controlAttrs: {
                  id: "test-picker-dark",
                  class: "setting-chooser-item",
                  imagesrc:
                    "chrome://browser/content/preferences/web-appearance-dark.svg",
                },
              },
            ],
          },
        ],
      };
      group.getSetting = win.Preferences.getSetting.bind(win.Preferences);
      group.dataset.category = DEFAULT_PANE;
      doc.getElementById("mainPrefPane").append(group);

      // Ensure all elements have updated.
      await new Promise(r => win.requestAnimationFrame(r));

      let checkbox = doc.getElementById("test-checkbox");
      checkbox.scrollIntoView();
      EventUtils.synthesizeMouseAtCenter(checkbox.inputEl, {}, win);
      EventUtils.synthesizeMouseAtCenter(checkbox.labelEl, {}, win);
      // Check that clicking the description is not counted as a click.
      AccessibilityUtils.setEnv({ mustHaveAccessibleRule: false });
      EventUtils.synthesizeMouseAtCenter(checkbox.descriptionEl, {}, win);
      AccessibilityUtils.resetEnv();

      let button = doc.getElementById("test-button");
      button.scrollIntoView();
      is(button.buttonEl.disabled, true, "button is disabled");
      let radio = doc.getElementById("test-radio-two");
      EventUtils.synthesizeMouseAtCenter(radio.inputEl, {}, win);
      // Check that clicking the description is not counted as a click.
      AccessibilityUtils.setEnv({ mustHaveAccessibleRule: false });
      EventUtils.synthesizeMouseAtCenter(radio.descriptionEl, {}, win);
      AccessibilityUtils.resetEnv();

      // Ensure the button disabled state updated.
      await new Promise(r => win.requestAnimationFrame(r));

      is(button.buttonEl.disabled, false, "button is enabled");
      EventUtils.synthesizeMouseAtCenter(button, {}, win);

      let select = doc.getElementById("test-select");
      select.scrollIntoView();
      let popupShown = BrowserTestUtils.waitForSelectPopupShown(window);
      EventUtils.synthesizeMouseAtCenter(select.inputEl, {}, win);
      let popup = await popupShown;
      let popupHidden = BrowserTestUtils.waitForEvent(popup, "popuphidden");
      if (popup.isNativeMenu) {
        popup.activateItem(popup.childNodes[1]);
      } else {
        EventUtils.synthesizeKey("KEY_ArrowDown", {}, win);
        EventUtils.synthesizeKey("KEY_Enter", {}, win);
      }
      await popupHidden;

      // Focus the visual picker via the keyboard.
      EventUtils.synthesizeKey("KEY_Tab", {}, win);

      let picker = doc.getElementById("test-picker");
      let secondItem = doc.getElementById("test-picker-dark");
      picker.scrollIntoView();
      AccessibilityUtils.setEnv({
        mustHaveAccessibleRule: false,
      });
      EventUtils.synthesizeMouseAtCenter(secondItem.itemEl, {}, win);

      // Ensure the selected state of the picker updated.
      await picker.updateComplete;

      // Navigate to the second picker item and select it via keyboard.
      EventUtils.synthesizeKey("KEY_ArrowRight", {}, win);
      AccessibilityUtils.resetEnv();

      // Check that telemetry appeared:
      const { TelemetryTestUtils } = ChromeUtils.importESModule(
        "resource://testing-common/TelemetryTestUtils.sys.mjs"
      );
      let snapshot = TelemetryTestUtils.getProcessScalars("parent", true, true);
      let changeCounts = {
        "test-checkbox": 2, // input and label clicked
        "test-radio-two": 1, // only input clicked
        "test-button": 1,
        "test-select": 1,
        "test-picker-light": 1,
        "test-picker-dark": 1,
      };
      let totalChanges = Object.values(changeCounts).reduce(
        (total, count) => count + total,
        0
      );

      for (let [id, count] of Object.entries(changeCounts)) {
        info(id, count);
        TelemetryTestUtils.assertKeyedScalar(
          snapshot,
          `browser.ui.interaction.preferences_${DEFAULT_PANE}`,
          id,
          count
        );
      }

      // Verify showInitial has a sessionId
      let showEvents = Glean.aboutpreferences.showInitial.testGetValue();
      Assert.equal(showEvents.length, 1, "One showInitial event recorded");
      sessionId = showEvents[0].extra.session;
      Assert.ok(sessionId, "showInitial has a session ID");

      // Verify same number of change events as the count, includes session and pane.
      let changeEvents = Glean.aboutpreferences.change.testGetValue();
      Assert.equal(
        changeEvents.length,
        totalChanges,
        "Change events were recorded, and count matches"
      );
      for (let event of changeEvents) {
        Assert.equal(
          event.extra.session,
          sessionId,
          "All change events share the same session ID"
        );
        Assert.equal(
          event.extra.pane,
          DEFAULT_PANE,
          `Pane is ${DEFAULT_PANE} for change events`
        );
        Assert.ok(event.extra.setting, "Setting ID is present");
      }

      // Verify no close event has been recorded.
      let closeEvents = Glean.aboutpreferences.close.testGetValue();
      Assert.ok(!closeEvents, "No close event yet");
    }
  );

  // Verify close is recorded on tab close
  let closeEvents = Glean.aboutpreferences.close.testGetValue();
  Assert.equal(closeEvents.length, 1, "One close event recorded");
  Assert.equal(
    closeEvents[0].extra.session,
    sessionId,
    "Close event has the session ID"
  );
});
