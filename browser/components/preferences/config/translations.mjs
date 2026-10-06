/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Preferences } from "chrome://global/content/preferences/Preferences.mjs";
import { SettingGroupManager } from "chrome://browser/content/preferences/config/SettingGroupManager.mjs";

function createNeverTranslateSitesDescription() {
  const description = document.createElement("span");
  description.dataset.l10nId =
    "settings-translations-subpage-never-translate-sites-description";

  for (const [iconName, iconSrc] of [
    ["translations-icon", "chrome://browser/skin/translations.svg"],
    ["settings-icon", "chrome://global/skin/icons/settings.svg"],
  ]) {
    const icon = document.createElement("img");
    icon.src = iconSrc;

    icon.dataset.l10nName = iconName;
    icon.style.verticalAlign = "middle";

    icon.setAttribute("role", "presentation");
    icon.setAttribute("width", "16");
    icon.setAttribute("height", "16");

    description.appendChild(icon);
  }

  return description;
}

Preferences.addSetting({
  id: "translationsDownloadLanguagesGroup",
});

Preferences.addSetting({
  id: "translationsDownloadLanguagesRow",
});

Preferences.addSetting({
  id: "translationsDownloadLanguagesSelect",
});

Preferences.addSetting({
  id: "translationsDownloadLanguagesButton",
});

Preferences.addSetting({
  id: "translationsDownloadLanguagesNoneRow",
});

Preferences.addSetting({
  id: "translationsAlwaysTranslateLanguagesGroup",
});

Preferences.addSetting({
  id: "translationsAlwaysTranslateLanguagesRow",
});

Preferences.addSetting({
  id: "translationsAlwaysTranslateLanguagesSelect",
});

Preferences.addSetting({
  id: "translationsAlwaysTranslateLanguagesNoneRow",
});

Preferences.addSetting({
  id: "translationsAlwaysTranslateLanguagesButton",
});

Preferences.addSetting({
  id: "translationsNeverTranslateLanguagesNoneRow",
});

Preferences.addSetting({
  id: "translationsNeverTranslateLanguagesButton",
});

Preferences.addSetting({
  id: "translationsNeverTranslateLanguagesGroup",
});

Preferences.addSetting({
  id: "translationsNeverTranslateLanguagesRow",
});

Preferences.addSetting({
  id: "translationsNeverTranslateLanguagesSelect",
});

Preferences.addSetting({
  id: "translationsNeverTranslateSitesGroup",
});

Preferences.addSetting({
  id: "translationsNeverTranslateSitesRow",
});

Preferences.addSetting({
  id: "translationsNeverTranslateSitesNoneRow",
});

SettingGroupManager.registerGroups({
  translationsAutomaticTranslation: {
    inProgress: true,
    headingLevel: 2,
    l10nId: "settings-translations-subpage-automatic-translation-header",
    items: [
      {
        id: "translationsAlwaysTranslateLanguagesGroup",
        control: "moz-box-group",
        controlAttrs: {
          type: "list",
        },
        items: [
          {
            id: "translationsAlwaysTranslateLanguagesRow",
            l10nId: "settings-translations-subpage-always-translate-header",
            control: "moz-box-item",
            slot: "header",
            controlAttrs: {
              class: "box-header-bold",
            },
            items: [
              {
                id: "translationsAlwaysTranslateLanguagesSelect",
                slot: "actions",
                control: "moz-select",
                options: [
                  {
                    value: "",
                    l10nId:
                      "settings-translations-subpage-language-select-option",
                  },
                ],
              },
              {
                id: "translationsAlwaysTranslateLanguagesButton",
                l10nId: "settings-translations-subpage-language-add-button",
                control: "moz-button",
                slot: "actions",
                controlAttrs: {
                  type: "icon",
                  iconsrc: "chrome://global/skin/icons/plus.svg",
                },
              },
            ],
          },
          {
            id: "translationsAlwaysTranslateLanguagesNoneRow",
            l10nId: "settings-translations-subpage-no-languages-added",
            control: "moz-box-item",
            controlAttrs: {
              class: "description-deemphasized",
            },
          },
        ],
      },
      {
        id: "translationsNeverTranslateLanguagesGroup",
        control: "moz-box-group",
        controlAttrs: {
          type: "list",
        },
        items: [
          {
            id: "translationsNeverTranslateLanguagesRow",
            l10nId: "settings-translations-subpage-never-translate-header",
            control: "moz-box-item",
            slot: "header",
            controlAttrs: {
              class: "box-header-bold",
            },
            items: [
              {
                id: "translationsNeverTranslateLanguagesSelect",
                slot: "actions",
                control: "moz-select",
                options: [
                  {
                    value: "",
                    l10nId:
                      "settings-translations-subpage-language-select-option",
                  },
                ],
              },
              {
                id: "translationsNeverTranslateLanguagesButton",
                l10nId: "settings-translations-subpage-language-add-button",
                control: "moz-button",
                slot: "actions",
                controlAttrs: {
                  type: "icon",
                  iconsrc: "chrome://global/skin/icons/plus.svg",
                },
              },
            ],
          },
          {
            id: "translationsNeverTranslateLanguagesNoneRow",
            l10nId: "settings-translations-subpage-no-languages-added",
            control: "moz-box-item",
            controlAttrs: {
              class: "description-deemphasized",
            },
          },
        ],
      },
      {
        id: "translationsNeverTranslateSitesGroup",
        control: "moz-box-group",
        controlAttrs: {
          type: "list",
        },
        items: [
          {
            id: "translationsNeverTranslateSitesRow",
            l10nId:
              "settings-translations-subpage-never-translate-sites-header",
            control: "moz-box-item",
            controlAttrs: {
              class: "box-header-bold",
              ".description": createNeverTranslateSitesDescription(),
            },
          },
          {
            id: "translationsNeverTranslateSitesNoneRow",
            l10nId: "settings-translations-subpage-no-sites-added",
            control: "moz-box-item",
            controlAttrs: {
              class: "description-deemphasized",
            },
          },
        ],
      },
    ],
  },
  translationsDownloadLanguages: {
    inProgress: true,
    headingLevel: 2,
    l10nId: "settings-translations-subpage-speed-up-translation-header",
    items: [
      {
        id: "translationsDownloadLanguagesGroup",
        control: "moz-box-group",
        controlAttrs: {
          type: "list",
        },
        items: [
          {
            id: "translationsDownloadLanguagesRow",
            l10nId: "settings-translations-subpage-download-languages-header",
            control: "moz-box-item",
            slot: "header",
            controlAttrs: {
              class: "box-header-bold",
            },
            items: [
              {
                id: "translationsDownloadLanguagesSelect",
                slot: "actions",
                control: "moz-select",
                options: [
                  {
                    value: "",
                    l10nId:
                      "settings-translations-subpage-download-languages-select-option",
                  },
                ],
              },
              {
                id: "translationsDownloadLanguagesButton",
                l10nId:
                  "settings-translations-subpage-download-languages-button",
                control: "moz-button",
                slot: "actions",
                controlAttrs: {
                  type: "icon",
                  iconsrc: "chrome://browser/skin/downloads/downloads.svg",
                },
              },
            ],
          },
          {
            id: "translationsDownloadLanguagesNoneRow",
            l10nId: "settings-translations-subpage-no-languages-downloaded",
            control: "moz-box-item",
            controlAttrs: {
              class: "description-deemphasized",
            },
          },
        ],
      },
    ],
  },
});
