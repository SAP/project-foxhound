/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
/* import-globals-from helper_inplace_editor.js */

"use strict";

const AutocompletePopup = require("resource://devtools/client/shared/autocomplete-popup.js");
const {
  InplaceEditor,
} = require("resource://devtools/client/shared/inplace-editor.js");
loadHelperScript("helper_inplace_editor.js");

// Test the inplace-editor autocomplete popup for the different gradient functions.

const MOCK_COLORS = ["indigo", "wheat", "white", "yellow"];

add_task(async function testLinearGradient() {
  await addTab(
    "data:text/html;charset=utf-8,inplace editor CSS linear-gradient() autocomplete"
  );
  const { host, doc } = await createHost();

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(",
    inputValueAfterSuggest: "linear-gradient(in",
    popupItems: ["in", "to", ...MOCK_COLORS].sort(),
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(t",
    inputValueAfterSuggest: "linear-gradient(to",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(to",
    inputValueAfterSuggest: "linear-gradient(to",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(to ",
    inputValueAfterSuggest: "linear-gradient(to bottom",
    popupItems: ["bottom", "left", "right", "top"],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(to bo",
    inputValueAfterSuggest: "linear-gradient(to bottom",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(to bottom ",
    inputValueAfterSuggest: "linear-gradient(to bottom in",
    popupItems: ["in", "left", "right"],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(to left ",
    inputValueAfterSuggest: "linear-gradient(to left bottom",
    popupItems: ["bottom", "in", "top"],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(to left,",
    inputValueAfterSuggest: "linear-gradient(to left,indigo",
    // expecting colors after a comma (without any space after it)
    popupItems: MOCK_COLORS,
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(to left t",
    inputValueAfterSuggest: "linear-gradient(to left top",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(to left top ",
    inputValueAfterSuggest: "linear-gradient(to left top in",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(to left top in ",
    inputValueAfterSuggest: "linear-gradient(to left top in a98-rgb",
    popupItems: [
      "a98-rgb",
      "display-p3",
      "hsl",
      "hwb",
      "lch",
      "oklch",
      "prophoto-rgb",
      "rec2020",
      "srgb",
      "srgb-linear",
      "xyz",
      "xyz-d50",
      "xyz-d65",
    ],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(to left top in x",
    inputValueAfterSuggest: "linear-gradient(to left top in xyz",
    popupItems: ["xyz", "xyz-d50", "xyz-d65"],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(to left top in hsl ",
    inputValueAfterSuggest: "linear-gradient(to left top in hsl decreasing",
    popupItems: ["decreasing", "increasing", "longer", "shorter"],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(to left top in hsl l",
    inputValueAfterSuggest: "linear-gradient(to left top in hsl longer",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(to left top in hsl longer ",
    inputValueAfterSuggest: "linear-gradient(to left top in hsl longer hue",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(to left top in hsl longer hue ",
    inputValueAfterSuggest: "linear-gradient(to left top in hsl longer hue ",
    // We shouldn't have any suggestions here, we're waiting for the comma before setting
    // the color stops
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(to left top in hsl longer hue, ",
    inputValueAfterSuggest:
      "linear-gradient(to left top in hsl longer hue, indigo",
    popupItems: MOCK_COLORS,
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(to left top in hsl longer hue, indigo ",
    inputValueAfterSuggest:
      "linear-gradient(to left top in hsl longer hue, indigo ",
    // We shouldn't have any suggestions here as we already have a color
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(to left top in hsl longer hue, #abc ",
    inputValueAfterSuggest:
      "linear-gradient(to left top in hsl longer hue, #abc ",
    // We shouldn't have any suggestions here as we already have a color
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(to left top in hsl longer hue, indigo 10% ",
    inputValueAfterSuggest:
      "linear-gradient(to left top in hsl longer hue, indigo 10% ",
    // We shouldn't have any suggestions here as we already have a color,
    // even if we have a <color-stop-length>
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(in ",
    inputValueAfterSuggest: "linear-gradient(in a98-rgb",
    popupItems: [
      "a98-rgb",
      "display-p3",
      "hsl",
      "hwb",
      "lch",
      "oklch",
      "prophoto-rgb",
      "rec2020",
      "srgb",
      "srgb-linear",
      "xyz",
      "xyz-d50",
      "xyz-d65",
    ],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(in hsl ",
    inputValueAfterSuggest: "linear-gradient(in hsl decreasing",
    popupItems: ["decreasing", "increasing", "longer", "shorter", "to"],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(in hsl l",
    inputValueAfterSuggest: "linear-gradient(in hsl longer",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(in hsl longer ",
    inputValueAfterSuggest: "linear-gradient(in hsl longer hue",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(in hsl longer hue ",
    inputValueAfterSuggest: "linear-gradient(in hsl longer hue to",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(in hsl longer hue to ",
    inputValueAfterSuggest: "linear-gradient(in hsl longer hue to bottom",
    popupItems: ["bottom", "left", "right", "top"],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(in hsl longer hue to right ",
    inputValueAfterSuggest: "linear-gradient(in hsl longer hue to right bottom",
    popupItems: ["bottom", "top"],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(in hsl to ",
    inputValueAfterSuggest: "linear-gradient(in hsl to bottom",
    popupItems: ["bottom", "left", "right", "top"],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(in hsl to left ",
    inputValueAfterSuggest: "linear-gradient(in hsl to left bottom",
    popupItems: ["bottom", "top"],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(in hsl to left bottom ",
    inputValueAfterSuggest: "linear-gradient(in hsl to left bottom ",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(in hsl to left bottom, ",
    inputValueAfterSuggest: "linear-gradient(in hsl to left bottom, indigo",
    popupItems: MOCK_COLORS,
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(w",
    inputValueAfterSuggest: "linear-gradient(wheat",
    popupItems: ["wheat", "white"],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(wh",
    inputValueAfterSuggest: "linear-gradient(wheat",
    popupItems: ["wheat", "white"],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(whi",
    inputValueAfterSuggest: "linear-gradient(white",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(wheat ",
    inputValueAfterSuggest: "linear-gradient(wheat ",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(wheat 10%",
    inputValueAfterSuggest: "linear-gradient(wheat 10%",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(wheat 10%, ",
    inputValueAfterSuggest: "linear-gradient(wheat 10%, indigo",
    popupItems: MOCK_COLORS,
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(#abc ",
    inputValueAfterSuggest: "linear-gradient(#abc ",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(#abc 20%",
    inputValueAfterSuggest: "linear-gradient(#abc 20%",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(#abc 20%, ",
    inputValueAfterSuggest: "linear-gradient(#abc 20%, indigo",
    popupItems: MOCK_COLORS,
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(#abc 20%, to ",
    inputValueAfterSuggest: "linear-gradient(#abc 20%, to ",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(#abc 20%, in ",
    inputValueAfterSuggest: "linear-gradient(#abc 20%, in ",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(0 ",
    inputValueAfterSuggest: "linear-gradient(0 in",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "linear-gradient(15deg ",
    inputValueAfterSuggest: "linear-gradient(15deg in",
    popupItems: [],
  });

  host.destroy();
  gBrowser.removeCurrentTab();
});

add_task(async function testRepeatingLinearGradient() {
  await addTab(
    "data:text/html;charset=utf-8,inplace editor CSS repeating-linear-gradient() autocomplete"
  );
  const { host, doc } = await createHost();

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(",
    inputValueAfterSuggest: "repeating-linear-gradient(in",
    popupItems: ["in", "to", ...MOCK_COLORS].sort(),
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(t",
    inputValueAfterSuggest: "repeating-linear-gradient(to",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(to",
    inputValueAfterSuggest: "repeating-linear-gradient(to",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(to ",
    inputValueAfterSuggest: "repeating-linear-gradient(to bottom",
    popupItems: ["bottom", "left", "right", "top"],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(to bo",
    inputValueAfterSuggest: "repeating-linear-gradient(to bottom",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(to bottom ",
    inputValueAfterSuggest: "repeating-linear-gradient(to bottom in",
    popupItems: ["in", "left", "right"],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(to left ",
    inputValueAfterSuggest: "repeating-linear-gradient(to left bottom",
    popupItems: ["bottom", "in", "top"],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(to left,",
    inputValueAfterSuggest: "repeating-linear-gradient(to left,indigo",
    // expecting colors after a comma (without any space after it)
    popupItems: MOCK_COLORS,
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(to left t",
    inputValueAfterSuggest: "repeating-linear-gradient(to left top",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(to left top ",
    inputValueAfterSuggest: "repeating-linear-gradient(to left top in",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(to left top in ",
    inputValueAfterSuggest: "repeating-linear-gradient(to left top in a98-rgb",
    popupItems: [
      "a98-rgb",
      "display-p3",
      "hsl",
      "hwb",
      "lch",
      "oklch",
      "prophoto-rgb",
      "rec2020",
      "srgb",
      "srgb-linear",
      "xyz",
      "xyz-d50",
      "xyz-d65",
    ],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(to left top in x",
    inputValueAfterSuggest: "repeating-linear-gradient(to left top in xyz",
    popupItems: ["xyz", "xyz-d50", "xyz-d65"],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(to left top in hsl ",
    inputValueAfterSuggest:
      "repeating-linear-gradient(to left top in hsl decreasing",
    popupItems: ["decreasing", "increasing", "longer", "shorter"],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(to left top in hsl l",
    inputValueAfterSuggest:
      "repeating-linear-gradient(to left top in hsl longer",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(to left top in hsl longer ",
    inputValueAfterSuggest:
      "repeating-linear-gradient(to left top in hsl longer hue",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(to left top in hsl longer hue ",
    inputValueAfterSuggest:
      "repeating-linear-gradient(to left top in hsl longer hue ",
    // We shouldn't have any suggestions here, we're waiting for the comma before setting
    // the color stops
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(to left top in hsl longer hue, ",
    inputValueAfterSuggest:
      "repeating-linear-gradient(to left top in hsl longer hue, indigo",
    popupItems: MOCK_COLORS,
  });

  await checkAutocomplete({
    doc,
    initialText:
      "repeating-linear-gradient(to left top in hsl longer hue, indigo ",
    inputValueAfterSuggest:
      "repeating-linear-gradient(to left top in hsl longer hue, indigo ",
    // We shouldn't have any suggestions here as we already have a color
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText:
      "repeating-linear-gradient(to left top in hsl longer hue, #abc ",
    inputValueAfterSuggest:
      "repeating-linear-gradient(to left top in hsl longer hue, #abc ",
    // We shouldn't have any suggestions here as we already have a color
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText:
      "repeating-linear-gradient(to left top in hsl longer hue, indigo 10% ",
    inputValueAfterSuggest:
      "repeating-linear-gradient(to left top in hsl longer hue, indigo 10% ",
    // We shouldn't have any suggestions here as we already have a color,
    // even if we have a <color-stop-length>
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(in ",
    inputValueAfterSuggest: "repeating-linear-gradient(in a98-rgb",
    popupItems: [
      "a98-rgb",
      "display-p3",
      "hsl",
      "hwb",
      "lch",
      "oklch",
      "prophoto-rgb",
      "rec2020",
      "srgb",
      "srgb-linear",
      "xyz",
      "xyz-d50",
      "xyz-d65",
    ],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(in hsl ",
    inputValueAfterSuggest: "repeating-linear-gradient(in hsl decreasing",
    popupItems: ["decreasing", "increasing", "longer", "shorter", "to"],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(in hsl l",
    inputValueAfterSuggest: "repeating-linear-gradient(in hsl longer",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(in hsl longer ",
    inputValueAfterSuggest: "repeating-linear-gradient(in hsl longer hue",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(in hsl longer hue ",
    inputValueAfterSuggest: "repeating-linear-gradient(in hsl longer hue to",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(in hsl longer hue to ",
    inputValueAfterSuggest:
      "repeating-linear-gradient(in hsl longer hue to bottom",
    popupItems: ["bottom", "left", "right", "top"],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(in hsl longer hue to right ",
    inputValueAfterSuggest:
      "repeating-linear-gradient(in hsl longer hue to right bottom",
    popupItems: ["bottom", "top"],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(in hsl to ",
    inputValueAfterSuggest: "repeating-linear-gradient(in hsl to bottom",
    popupItems: ["bottom", "left", "right", "top"],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(in hsl to left ",
    inputValueAfterSuggest: "repeating-linear-gradient(in hsl to left bottom",
    popupItems: ["bottom", "top"],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(in hsl to left bottom ",
    inputValueAfterSuggest: "repeating-linear-gradient(in hsl to left bottom ",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(in hsl to left bottom, ",
    inputValueAfterSuggest:
      "repeating-linear-gradient(in hsl to left bottom, indigo",
    popupItems: MOCK_COLORS,
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(w",
    inputValueAfterSuggest: "repeating-linear-gradient(wheat",
    popupItems: ["wheat", "white"],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(wh",
    inputValueAfterSuggest: "repeating-linear-gradient(wheat",
    popupItems: ["wheat", "white"],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(whi",
    inputValueAfterSuggest: "repeating-linear-gradient(white",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(wheat ",
    inputValueAfterSuggest: "repeating-linear-gradient(wheat ",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(wheat 10%",
    inputValueAfterSuggest: "repeating-linear-gradient(wheat 10%",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(wheat 10%, ",
    inputValueAfterSuggest: "repeating-linear-gradient(wheat 10%, indigo",
    popupItems: MOCK_COLORS,
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(#abc ",
    inputValueAfterSuggest: "repeating-linear-gradient(#abc ",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(#abc 20%",
    inputValueAfterSuggest: "repeating-linear-gradient(#abc 20%",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(#abc 20%, ",
    inputValueAfterSuggest: "repeating-linear-gradient(#abc 20%, indigo",
    popupItems: MOCK_COLORS,
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(#abc 20%, to ",
    inputValueAfterSuggest: "repeating-linear-gradient(#abc 20%, to ",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(#abc 20%, in ",
    inputValueAfterSuggest: "repeating-linear-gradient(#abc 20%, in ",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(0 ",
    inputValueAfterSuggest: "repeating-linear-gradient(0 in",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "repeating-linear-gradient(15deg ",
    inputValueAfterSuggest: "repeating-linear-gradient(15deg in",
    popupItems: [],
  });

  host.destroy();
  gBrowser.removeCurrentTab();
});

async function checkAutocomplete({
  doc,
  initialText,
  inputValueAfterSuggest,
  popupItems,
}) {
  const popup = new AutocompletePopup(doc, { autoSelect: true });

  const mockValues = { color: MOCK_COLORS };

  await new Promise(resolve => {
    createInplaceEditorAndClick(
      {
        initial: initialText,
        start: async editor => {
          const global = editor.input.defaultView;

          // The content is selected at first, hit the Right key so the cursor is at
          // the end of the input
          EventUtils.synthesizeKey("VK_RIGHT", {}, global);

          // Check the suggestion
          await testCompletion(
            [
              // Hit Ctrl+Space to trigger suggestion
              {
                key: " ",
                ctrlKey: true,
              },
              inputValueAfterSuggest,
              popupItems.length ? 0 : -1,
              popupItems,
            ],
            editor
          );
          EventUtils.synthesizeKey("VK_RETURN", {}, global);
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
