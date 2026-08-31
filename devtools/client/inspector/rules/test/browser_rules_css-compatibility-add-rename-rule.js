/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test - Add and rename rules
// Test the correctness of the compatibility
// status when the incompatible rules are added
// or renamed to another universally compatible
// rule

const TEST_URI = `
<style>
  body {
    user-select: none;
    stroke-color: red;
    clip: auto;
  }
</style>
<body>
</body>`;

const TEST_DATA_INITIAL = [
  {
    selector: "body",
    rules: [
      {},
      {
        "user-select": {
          value: "none",
          expected: COMPATIBILITY_TOOLTIP_MESSAGE.default,
        },
        "stroke-color": {
          value: "red",
          expected: COMPATIBILITY_TOOLTIP_MESSAGE.experimental,
        },
        clip: {
          value: "auto",
          expected: COMPATIBILITY_TOOLTIP_MESSAGE["deprecated-supported"],
        },
      },
    ],
  },
];

const TEST_DATA_ADD_RULE = [
  {
    selector: "body",
    rules: [
      {
        "-moz-float-edge": {
          value: "content-box",
          expected: COMPATIBILITY_TOOLTIP_MESSAGE.deprecated,
        },
      },
      {
        "user-select": {
          value: "none",
          expected: COMPATIBILITY_TOOLTIP_MESSAGE.default,
        },
        "stroke-color": {
          value: "red",
          expected: COMPATIBILITY_TOOLTIP_MESSAGE.experimental,
        },
        clip: {
          value: "auto",
          expected: COMPATIBILITY_TOOLTIP_MESSAGE["deprecated-supported"],
        },
      },
    ],
  },
];

const TEST_DATA_RENAME_RULE = [
  {
    selector: "body",
    rules: [
      {
        "-moz-float-edge": {
          value: "content-box",
          expected: COMPATIBILITY_TOOLTIP_MESSAGE.deprecated,
        },
      },
      {
        "background-color": {
          value: "green",
        },
        "stroke-color": {
          value: "red",
          expected: COMPATIBILITY_TOOLTIP_MESSAGE.experimental,
        },
        clip: {
          value: "auto",
          expected: COMPATIBILITY_TOOLTIP_MESSAGE["deprecated-supported"],
        },
      },
    ],
  },
];

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();

  const userSelect = { "user-select": "none" };
  const backgroundColor = { "background-color": "green" };

  info("Check initial compatibility issues");
  await runCSSCompatibilityTests(view, inspector, TEST_DATA_INITIAL);

  info(
    "Add an inheritable incompatible rule and check the compatibility status"
  );
  await addProperty(view, 0, "-moz-float-edge", "content-box");
  await runCSSCompatibilityTests(view, inspector, TEST_DATA_ADD_RULE);

  info("Rename user-select to color and check the compatibility status");
  await updateDeclaration(view, 1, userSelect, backgroundColor);
  await runCSSCompatibilityTests(view, inspector, TEST_DATA_RENAME_RULE);
});
