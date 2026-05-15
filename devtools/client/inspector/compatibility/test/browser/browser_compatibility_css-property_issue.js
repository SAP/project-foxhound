/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that unsupported CSS properties are correctly reported as issues.

const {
  COMPATIBILITY_ISSUE_TYPE,
} = require("resource://devtools/shared/constants.js");

const TEST_URI = `
  <style>
  body {
    color: blue;
    text-box-edge: text;
    user-modify: read-only;
    background-repeat-x: repeat;
  }
  div {
    overflow-anchor: auto;
  }
  </style>
  <body>
    <div>test</div>
  </body>
`;

const TEST_DATA_SELECTED = [
  {
    type: COMPATIBILITY_ISSUE_TYPE.CSS_PROPERTY,
    property: "text-box-edge",
    url: "https://developer.mozilla.org/docs/Web/CSS/Reference/Properties/text-box-edge",
    deprecated: false,
    experimental: false,
  },
  {
    type: COMPATIBILITY_ISSUE_TYPE.CSS_PROPERTY_ALIASES,
    property: "user-modify",
    url: "https://developer.mozilla.org/docs/Web/CSS/Reference/Properties/user-modify",
    aliases: ["user-modify"],
    deprecated: true,
    experimental: false,
  },
  {
    type: COMPATIBILITY_ISSUE_TYPE.CSS_PROPERTY,
    property: "background-repeat-x",
    // No MDN url, but a spec one
    specUrl:
      "https://drafts.csswg.org/css-backgrounds-4/#background-repeat-longhands",
    deprecated: false,
    experimental: true,
  },
  // TODO: Write a test for it when we have a property with no MDN url nor spec url Bug 1840910
];

const TEST_DATA_ALL = [
  ...TEST_DATA_SELECTED,
  {
    type: COMPATIBILITY_ISSUE_TYPE.CSS_PROPERTY,
    property: "overflow-anchor",
    url: "https://developer.mozilla.org/docs/Web/CSS/Reference/Properties/overflow-anchor",
    deprecated: false,
    experimental: false,
  },
];

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));

  const { allElementsPane, selectedElementPane } =
    await openCompatibilityView();

  // If the test fail because the properties used are no longer in the dataset, or they
  // now have mdn/spec url although we expected them not to, uncomment the next line
  // to get all the properties in the dataset that don't have a MDN url.
  // logCssCompatDataPropertiesWithoutMDNUrl()

  info("Check the content of the issue list on the selected element");
  await assertIssueList(selectedElementPane, TEST_DATA_SELECTED);

  info("Check the content of the issue list on all elements");
  await assertIssueList(allElementsPane, TEST_DATA_ALL);
});
