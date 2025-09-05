/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * A Map of themes built in to the browser, alongwith a Map of collections those themes belong to. Params for the objects contained
 * within the map:
 *
 * @param {string} id
 *   The unique identifier for the theme. The map's key.
 * @param {string} version
 *   The theme add-on's semantic version, as defined in its manifest.
 * @param {string} path
 *   Path to the add-on files.
 * @param {string} [expiry]
 *  Date in YYYY-MM-DD format. Optional. If defined, the themes in the collection can no longer be
 *  used after this date, unless the user has permission to retain it.
 * @param {string} [collection]
 *  The collection id that the theme is a part of. Optional.
 */
export const BuiltInThemeConfig = new Map([
  [
    "firefox-compact-light@mozilla.org",
    {
      version: "1.3",
      path: "resource://builtin-themes/light/",
    },
  ],
  [
    "firefox-compact-dark@mozilla.org",
    {
      version: "1.3.2",
      path: "resource://builtin-themes/dark/",
    },
  ],
  [
    "firefox-alpenglow@mozilla.org",
    {
      version: "1.5",
      path: "resource://builtin-themes/alpenglow/",
    },
  ],
  [
    "2022red-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2022red/",
      collection: "true-colors",
    },
  ],
  [
    "2022orange-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2022orange/",
      collection: "true-colors",
    },
  ],
  [
    "2022green-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2022green/",
      collection: "true-colors",
    },
  ],
  [
    "2022yellow-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2022yellow/",
      collection: "true-colors",
    },
  ],
  [
    "2022purple-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2022purple/",
      collection: "true-colors",
    },
  ],
  [
    "2022blue-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2022blue/",
      collection: "true-colors",
    },
  ],
  [
    "lush-soft-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2021lush/soft/",
      collection: "life-in-color",
    },
  ],
  [
    "lush-balanced-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2021lush/balanced/",
      collection: "life-in-color",
    },
  ],
  [
    "lush-bold-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2021lush/bold/",
      collection: "life-in-color",
    },
  ],
  [
    "abstract-soft-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2021abstract/soft/",
      collection: "life-in-color",
    },
  ],
  [
    "abstract-balanced-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2021abstract/balanced/",
      collection: "life-in-color",
    },
  ],
  [
    "abstract-bold-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2021abstract/bold/",
      collection: "life-in-color",
    },
  ],
  [
    "elemental-soft-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2021elemental/soft/",
      collection: "life-in-color",
    },
  ],
  [
    "elemental-balanced-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2021elemental/balanced/",
      collection: "life-in-color",
    },
  ],
  [
    "elemental-bold-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2021elemental/bold/",
      collection: "life-in-color",
    },
  ],
  [
    "cheers-soft-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2021cheers/soft/",
      collection: "life-in-color",
    },
  ],
  [
    "cheers-balanced-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2021cheers/balanced/",
      collection: "life-in-color",
    },
  ],
  [
    "cheers-bold-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2021cheers/bold/",
      collection: "life-in-color",
    },
  ],
  [
    "graffiti-soft-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2021graffiti/soft/",
      collection: "life-in-color",
    },
  ],
  [
    "graffiti-balanced-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2021graffiti/balanced/",
      collection: "life-in-color",
    },
  ],
  [
    "graffiti-bold-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2021graffiti/bold/",
      collection: "life-in-color",
    },
  ],
  [
    "foto-soft-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2021foto/soft/",
      collection: "life-in-color",
    },
  ],
  [
    "foto-balanced-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2021foto/balanced/",
      collection: "life-in-color",
    },
  ],
  [
    "foto-bold-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2021foto/bold/",
      collection: "life-in-color",
    },
  ],
  [
    "playmaker-soft-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2022playmaker/soft/",
      collection: "independent-voices",
      l10nId: {
        description: "playmaker-colorway-description",
        groupName: "playmaker-colorway-name",
      },
    },
  ],
  [
    "playmaker-balanced-colorway@mozilla.org",
    {
      version: "1.1.2",
      path: "resource://builtin-themes/colorways/2022playmaker/balanced/",
      collection: "independent-voices",
      l10nId: {
        description: "playmaker-colorway-description",
        groupName: "playmaker-colorway-name",
      },
    },
  ],
  [
    "playmaker-bold-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2022playmaker/bold/",
      collection: "independent-voices",
      l10nId: {
        description: "playmaker-colorway-description",
        groupName: "playmaker-colorway-name",
      },
    },
  ],
  [
    "expressionist-soft-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2022expressionist/soft/",
      collection: "independent-voices",
      l10nId: {
        description: "expressionist-colorway-description",
        groupName: "expressionist-colorway-name",
      },
    },
  ],
  [
    "expressionist-balanced-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2022expressionist/balanced/",
      collection: "independent-voices",
      l10nId: {
        description: "expressionist-colorway-description",
        groupName: "expressionist-colorway-name",
      },
    },
  ],
  [
    "expressionist-bold-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2022expressionist/bold/",
      collection: "independent-voices",
      l10nId: {
        description: "expressionist-colorway-description",
        groupName: "expressionist-colorway-name",
      },
    },
  ],
  [
    "visionary-soft-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2022visionary/soft/",
      collection: "independent-voices",
      l10nId: {
        description: "visionary-colorway-description",
        groupName: "visionary-colorway-name",
      },
    },
  ],
  [
    "visionary-balanced-colorway@mozilla.org",
    {
      version: "1.1.2",
      path: "resource://builtin-themes/colorways/2022visionary/balanced/",
      collection: "independent-voices",
      l10nId: {
        description: "visionary-colorway-description",
        groupName: "visionary-colorway-name",
      },
    },
  ],
  [
    "visionary-bold-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2022visionary/bold/",
      collection: "independent-voices",
      l10nId: {
        description: "visionary-colorway-description",
        groupName: "visionary-colorway-name",
      },
    },
  ],
  [
    "activist-soft-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2022activist/soft/",
      collection: "independent-voices",
      l10nId: {
        description: "activist-colorway-description",
        groupName: "activist-colorway-name",
      },
    },
  ],
  [
    "activist-balanced-colorway@mozilla.org",
    {
      version: "1.1.2",
      path: "resource://builtin-themes/colorways/2022activist/balanced/",
      collection: "independent-voices",
      l10nId: {
        description: "activist-colorway-description",
        groupName: "activist-colorway-name",
      },
    },
  ],
  [
    "activist-bold-colorway@mozilla.org",
    {
      version: "1.1.2",
      path: "resource://builtin-themes/colorways/2022activist/bold/",
      collection: "independent-voices",
      l10nId: {
        description: "activist-colorway-description",
        groupName: "activist-colorway-name",
      },
    },
  ],
  [
    "dreamer-soft-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2022dreamer/soft/",
      collection: "independent-voices",
      l10nId: {
        description: "dreamer-colorway-description",
        groupName: "dreamer-colorway-name",
      },
    },
  ],
  [
    "dreamer-balanced-colorway@mozilla.org",
    {
      version: "1.1.2",
      path: "resource://builtin-themes/colorways/2022dreamer/balanced/",
      collection: "independent-voices",
      l10nId: {
        description: "dreamer-colorway-description",
        groupName: "dreamer-colorway-name",
      },
    },
  ],
  [
    "dreamer-bold-colorway@mozilla.org",
    {
      version: "1.1.1",
      path: "resource://builtin-themes/colorways/2022dreamer/bold/",
      collection: "independent-voices",
      l10nId: {
        description: "dreamer-colorway-description",
        groupName: "dreamer-colorway-name",
      },
    },
  ],
  [
    "innovator-soft-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2022innovator/soft/",
      collection: "independent-voices",
      l10nId: {
        description: "innovator-colorway-description",
        groupName: "innovator-colorway-name",
      },
    },
  ],
  [
    "innovator-balanced-colorway@mozilla.org",
    {
      version: "1.1.1",
      path: "resource://builtin-themes/colorways/2022innovator/balanced/",
      collection: "independent-voices",
      l10nId: {
        description: "innovator-colorway-description",
        groupName: "innovator-colorway-name",
      },
    },
  ],
  [
    "innovator-bold-colorway@mozilla.org",
    {
      version: "1.1",
      path: "resource://builtin-themes/colorways/2022innovator/bold/",
      collection: "independent-voices",
      l10nId: {
        description: "innovator-colorway-description",
        groupName: "innovator-colorway-name",
      },
    },
  ],
]);

const ColorwayCollections = [
  {
    id: "life-in-color",
    expiry: "2022-02-08",
  },
  {
    id: "true-colors",
    expiry: "2022-05-03",
  },
  {
    id: "independent-voices",
    expiry: "2023-01-17",
  },
];

export function _applyColorwayConfig(collections) {
  const collectionsSorted = collections
    .map(({ expiry, ...rest }) => ({
      expiry: new Date(expiry),
      ...rest,
    }))
    .sort((a, b) => a.expiry - b.expiry);
  const collectionsMap = collectionsSorted.reduce((map, c) => {
    map.set(c.id, c);
    return map;
  }, new Map());
  for (let [key, value] of BuiltInThemeConfig.entries()) {
    if (value.collection) {
      const collectionConfig = collectionsMap.get(value.collection);
      BuiltInThemeConfig.set(key, {
        ...value,
        expiry: collectionConfig.expiry,
      });
    }
  }
}

_applyColorwayConfig(ColorwayCollections);
