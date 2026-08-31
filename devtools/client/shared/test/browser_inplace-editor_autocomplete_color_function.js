/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
/* import-globals-from helper_inplace_editor.js */

"use strict";

const AutocompletePopup = require("resource://devtools/client/shared/autocomplete-popup.js");
const {
  InplaceEditor,
} = require("resource://devtools/client/shared/inplace-editor.js");
loadHelperScript("helper_inplace_editor.js");

// Test the inplace-editor autocomplete popup for `color()` suggestions.
// Using a mocked list of CSS properties to avoid autocompletion when
// typing in "color"

// Used for representing the expectation of a visible color swatch
const COLORSWATCH = true;
// format :
//  [
//    what key to press,
//    expected input box value after keypress,
//    selected suggestion index (-1 if popup is hidden),
//    suggestions in the popup,
//    expected post label corresponding with the input box value,
//    boolean representing if there should be a colour swatch visible,
//  ]
const ABSOLUTE_TEST_DATA = [
  ["c", "c", -1, []],
  ["o", "co", -1, []],
  ["l", "col", -1, []],
  ["o", "colo", -1, []],
  ["r", "color", -1, []],
  [
    "(",
    "color(a98-rgb)",
    0,
    [
      "a98-rgb",
      "display-p3",
      "from",
      "prophoto-rgb",
      "rec2020",
      "srgb",
      "srgb-linear",
      "xyz",
      "xyz-d50",
      "xyz-d65",
    ],
    null,
    !COLORSWATCH,
  ],
  ["x", "color(xyz)", 0, ["xyz", "xyz-d50", "xyz-d65"]],
  ["VK_RIGHT", "color(xyz)", -1, []],
  // no autocomplete after the color space
  [" ", "color(xyz )", -1, []],
];

const MOCK_COLORS = ["wheat", "white", "yellow"];

const RELATIVE_TEST_DATA = [
  ["c", "c", -1, []],
  ["o", "co", -1, []],
  ["l", "col", -1, []],
  ["o", "colo", -1, []],
  ["r", "color", -1, []],
  [
    "(",
    "color(a98-rgb)",
    0,
    [
      "a98-rgb",
      "display-p3",
      "from",
      "prophoto-rgb",
      "rec2020",
      "srgb",
      "srgb-linear",
      "xyz",
      "xyz-d50",
      "xyz-d65",
    ],
  ],
  ["f", "color(from)", -1, []],
  ["VK_RIGHT", "color(from)", -1, []],
  [" ", "color(from wheat)", 0, MOCK_COLORS],
  ["VK_RIGHT", "color(from wheat)", -1, []],
  [
    " ",
    "color(from wheat a98-rgb)",
    0,
    [
      "a98-rgb",
      "display-p3",
      "prophoto-rgb",
      "rec2020",
      "srgb",
      "srgb-linear",
      "xyz",
      "xyz-d50",
      "xyz-d65",
    ],
  ],
  ["s", "color(from wheat srgb)", 0, ["srgb", "srgb-linear"]],
  ["VK_RIGHT", "color(from wheat srgb)", -1, []],
  [
    " ",
    "color(from wheat srgb )",
    -1,
    // no autocomplete after color space
    [],
  ],
];

add_task(async function () {
  await addTab(
    "data:text/html;charset=utf-8,inplace editor CSS variable autocomplete"
  );
  const { host, doc } = await createHost();

  info("Test absolute color() completion");
  await createEditorAndRunCompletionTest(doc, ABSOLUTE_TEST_DATA);

  info("Test relative color() completion");
  await createEditorAndRunCompletionTest(doc, RELATIVE_TEST_DATA, {
    color: MOCK_COLORS,
  });

  host.destroy();
  gBrowser.removeCurrentTab();
});

async function createEditorAndRunCompletionTest(
  doc,
  testData,
  mockValues = {}
) {
  const popup = new AutocompletePopup(doc, { autoSelect: true });

  await new Promise(resolve => {
    createInplaceEditorAndClick(
      {
        start: async editor => {
          for (const data of testData) {
            await testCompletion(data, editor);
          }

          EventUtils.synthesizeKey("VK_RETURN", {}, editor.input.defaultView);
        },
        contentType: InplaceEditor.CONTENT_TYPES.CSS_VALUE,
        property: {
          name: "color",
        },
        cssProperties: {
          getNames: () => Object.keys(mockValues),
          getValues: propertyName => mockValues[propertyName] || [],
        },
        getCssVariables: () => new Map(),
        done: resolve,
        popup,
      },
      doc
    );
  });

  popup.destroy();
}
