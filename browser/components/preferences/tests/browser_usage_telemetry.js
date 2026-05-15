/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function testSettingGroupTelemetry() {
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
      group.dataset.category = "paneGeneral";
      doc.body.append(group);

      // Ensure all elements have updated.
      await new Promise(r => win.requestAnimationFrame(r));

      let checkbox = doc.getElementById("test-checkbox");
      EventUtils.synthesizeMouseAtCenter(checkbox.inputEl, {}, win);
      EventUtils.synthesizeMouseAtCenter(checkbox.labelEl, {}, win);
      // Check that clicking the description is not counted as a click.
      AccessibilityUtils.setEnv({ mustHaveAccessibleRule: false });
      EventUtils.synthesizeMouseAtCenter(checkbox.descriptionEl, {}, win);
      AccessibilityUtils.resetEnv();

      let button = doc.getElementById("test-button");
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
      let popupShown = BrowserTestUtils.waitForSelectPopupShown(window);
      EventUtils.synthesizeMouseAtCenter(select.inputEl, {}, win);
      let popup = await popupShown;
      let popupHidden = BrowserTestUtils.waitForEvent(popup, "popuphidden");
      EventUtils.synthesizeKey("KEY_ArrowDown", {}, win);
      EventUtils.synthesizeKey("KEY_Enter", {}, win);
      await popupHidden;

      // Focus the visual picker via the keyboard.
      EventUtils.synthesizeKey("KEY_Tab", {}, win);

      let picker = doc.getElementById("test-picker");
      let secondItem = doc.getElementById("test-picker-dark");
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
      TelemetryTestUtils.assertKeyedScalar(
        snapshot,
        "browser.ui.interaction.preferences_paneGeneral",
        "test-checkbox",
        2 // input and label clicked
      );
      TelemetryTestUtils.assertKeyedScalar(
        snapshot,
        "browser.ui.interaction.preferences_paneGeneral",
        "test-radio-two",
        1 // only input clicked
      );
      TelemetryTestUtils.assertKeyedScalar(
        snapshot,
        "browser.ui.interaction.preferences_paneGeneral",
        "test-button",
        1
      );
      TelemetryTestUtils.assertKeyedScalar(
        snapshot,
        "browser.ui.interaction.preferences_paneGeneral",
        "test-select",
        1
      );
      TelemetryTestUtils.assertKeyedScalar(
        snapshot,
        "browser.ui.interaction.preferences_paneGeneral",
        "test-picker-light",
        1
      );
      TelemetryTestUtils.assertKeyedScalar(
        snapshot,
        "browser.ui.interaction.preferences_paneGeneral",
        "test-picker-dark",
        1
      );
    }
  );
});
