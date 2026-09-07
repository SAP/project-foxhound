/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const BASE_INVALID_LINKS = [
  { title: "Missing URI" },
  {
    title: "Valid link. This will be trimmed".repeat(101),
    uri: "https://example.com?" + "a".repeat(4000),
  },
  {
    title: "A string url. Will fail regex match",
    uri: "invalid-url that will be removed by makeValidLink function",
  },
  {
    title: "About link. Will fail regex match",
    uri: "about:robots",
  },
  {
    title: "Will pass regex but fail URL constructor and be removed",
    uri: "https",
  },
  {
    title: "Will pass regex but fail URL constructor and be removed",
    uri: "https://",
  },
];

const INVALID_TABS_SHARE = {
  title: "tabs".repeat(101),
  type: "tabs",
  children: [
    ...BASE_INVALID_LINKS,
    ...Array.from({ length: 30 }, (_, i) => ({
      title: `Example link ${i}`,
      uri: `https://example.com/${i}`,
    })),
  ],
};

const INVALID_TABGROUP_SHARE = {
  title: "tab_group".repeat(101),
  type: "tab_group",
  children: [
    ...BASE_INVALID_LINKS,
    ...Array.from({ length: 30 }, (_, i) => ({
      title: `Example link ${i}`,
      uri: `https://example.com/${i}`,
    })),
  ],
};

const INVALID_BOOKMARKS_SHARE = {
  title: "bookmarks".repeat(101),
  type: "bookmarks",
  children: [
    ...BASE_INVALID_LINKS,
    {
      type: "bookmarks",
      title: "Nested bookmark folder".repeat(101),
      children: [
        ...BASE_INVALID_LINKS,
        {
          type: "bookmarks",
          title: "Doubly Nested bookmark folder".repeat(101),
          children: [
            ...BASE_INVALID_LINKS,
            ...Array.from({ length: 30 }, (_, i) => ({
              title: `Doubly Nested Example link ${i}`,
              uri: `https://doubly-nested-example.com/${i}`,
            })),
          ],
        },
      ],
    },
    ...Array.from({ length: 30 }, (_, i) => ({
      title: `Example link ${i}`,
      uri: `https://example.com/${i}`,
    })),
  ],
};

const INVALID_BOOKMARKS_SHARE_2 = {
  title: "Many nested bookmarks",
  type: "bookmarks",
  children: [],
};

function makeManyNestedBookmarks(depth) {
  if (depth > 35) {
    return [
      {
        title: `Link at depth ${depth}`,
        uri: `https://example.com/${depth}`,
      },
    ];
  }
  const bookmark = {
    type: "bookmarks",
    title: `Nested bookmark folder at depth ${depth}`,
    children: [makeManyNestedBookmarks(depth + 1)],
  };

  return bookmark;
}

const INVALID_BOOKMARKS_SHARE_3 = {
  title: "Many nested bookmarks",
  type: "bookmarks",
  children: [],
};

function makeManyNestedBookmarksWithLink(depth) {
  if (depth > 35) {
    return [
      {
        title: `Link at depth ${depth}`,
        uri: `https://example.com/${depth}`,
      },
    ];
  }
  const bookmark = {
    type: "bookmarks",
    title: `Nested bookmark folder at depth ${depth}`,
    children: [
      {
        title: `Link at depth ${depth}`,
        uri: `https://example.com/${depth}`,
      },
      makeManyNestedBookmarksWithLink(depth + 1),
    ],
  };

  return bookmark;
}

add_task(async function test_makeValid() {
  INVALID_BOOKMARKS_SHARE_2.children.push(makeManyNestedBookmarks(0));
  INVALID_BOOKMARKS_SHARE_3.children.push(makeManyNestedBookmarksWithLink(0));

  for (let [invalidShare, shouldPass] of [
    [INVALID_TABS_SHARE, true],
    [INVALID_TABGROUP_SHARE, true],
    [INVALID_BOOKMARKS_SHARE, true],
    [INVALID_BOOKMARKS_SHARE_2, false],
    [INVALID_BOOKMARKS_SHARE_3, true],
  ]) {
    let shareResult = ContentSharingUtils.buildShare(invalidShare);
    shareResult = await ContentSharingUtils.validateSchema(shareResult);

    if (shouldPass) {
      Assert.equal(
        shareResult.error,
        null,
        "There should be no error in the share result"
      );
    } else {
      Assert.equal(
        shareResult.error,
        ERRORS.INVALID_SCHEMA,
        "ERRORS.INVALID_SCHEMA should be set on the share result"
      );
    }
  }
});
