/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const SECTION_CONFIGS = {
  "7-double-row-2-ad": {
    name: "7-double-row-2-ad",
    responsiveLayouts: [
      {
        columnCount: 4,
        tiles: [
          {
            size: "large",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 2,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: false,
          },
          {
            size: "medium",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "medium",
            position: 5,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 4,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 6,
            hasAd: false,
            hasExcerpt: true,
          },
        ],
      },
      {
        columnCount: 3,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 2,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "medium",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "medium",
            position: 5,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 4,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 6,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
      {
        columnCount: 2,
        tiles: [
          {
            size: "large",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "medium",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "medium",
            position: 4,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 5,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 6,
            hasAd: false,
            hasExcerpt: true,
          },
        ],
      },
      {
        columnCount: 1,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "medium",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "medium",
            position: 4,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 5,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 6,
            hasAd: false,
            hasExcerpt: true,
          },
        ],
      },
    ],
  },
  "daily-briefing": {
    name: "daily-briefing",
    responsiveLayouts: [
      {
        columnCount: 4,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: true,
          },
          {
            size: "small",
            position: 1,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: false,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: false,
          },
          {
            size: "medium",
            position: 3,
            hasAd: true,
            hasExcerpt: false,
            allowsWidget: false,
          },
          {
            size: "small",
            position: 4,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: false,
          },
          {
            size: "small",
            position: 5,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: false,
          },
        ],
      },
      {
        columnCount: 3,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: true,
          },
          {
            size: "small",
            position: 1,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: false,
          },
          {
            size: "medium",
            position: 3,
            hasAd: true,
            hasExcerpt: false,
            allowsWidget: false,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: false,
          },
          {
            size: "large",
            position: 4,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: false,
          },
          {
            size: "medium",
            position: 5,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: false,
          },
        ],
      },
      {
        columnCount: 2,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: true,
          },
          {
            size: "medium",
            position: 3,
            hasAd: true,
            hasExcerpt: false,
            allowsWidget: false,
          },
          {
            size: "small",
            position: 1,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: false,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: false,
          },
          {
            size: "small",
            position: 4,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: false,
          },
          {
            size: "small",
            position: 5,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: false,
          },
        ],
      },
      {
        columnCount: 1,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: true,
          },
          {
            size: "medium",
            position: 3,
            hasAd: true,
            hasExcerpt: false,
            allowsWidget: false,
          },
          {
            size: "small",
            position: 1,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: false,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: false,
          },
          {
            size: "small",
            position: 4,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: false,
          },
          {
            size: "small",
            position: 5,
            hasAd: false,
            hasExcerpt: false,
            allowsWidget: false,
          },
        ],
      },
    ],
  },
};

const DEFAULT_SECTION_LAYOUT = [
  {
    name: "6-small-medium-1-ad",
    responsiveLayouts: [
      {
        columnCount: 4,
        tiles: [
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 4,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 5,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
      {
        columnCount: 3,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 2,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 3,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 4,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 5,
            hasAd: false,
            hasExcerpt: true,
          },
        ],
      },
      {
        columnCount: 2,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 4,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 5,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
      {
        columnCount: 1,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 4,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 5,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
    ],
  },
  {
    name: "4-large-small-medium-1-ad",
    responsiveLayouts: [
      {
        columnCount: 4,
        tiles: [
          {
            size: "large",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
      {
        columnCount: 3,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
      {
        columnCount: 2,
        tiles: [
          {
            size: "large",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
      {
        columnCount: 1,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
    ],
  },
  {
    name: "4-medium-small-1-ad",
    responsiveLayouts: [
      {
        columnCount: 4,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 2,
            hasAd: false,
            hasExcerpt: true,
          },
          { size: "medium", position: 3, hasAd: true, hasExcerpt: true },
        ],
      },
      {
        columnCount: 3,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
      {
        columnCount: 2,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
      {
        columnCount: 1,
        tiles: [
          {
            size: "medium",
            position: 0,
            hasAd: false,
            hasExcerpt: true,
          },
          {
            size: "medium",
            position: 1,
            hasAd: true,
            hasExcerpt: true,
          },
          {
            size: "small",
            position: 2,
            hasAd: false,
            hasExcerpt: false,
          },
          {
            size: "small",
            position: 3,
            hasAd: false,
            hasExcerpt: false,
          },
        ],
      },
    ],
  },
];

export const SectionsLayoutManager = {
  SECTION_CONFIGS,
  DEFAULT_SECTION_LAYOUT,
};
