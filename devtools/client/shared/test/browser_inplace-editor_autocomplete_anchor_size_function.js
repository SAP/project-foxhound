/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
/* import-globals-from helper_inplace_editor.js */

"use strict";

const AutocompletePopup = require("resource://devtools/client/shared/autocomplete-popup.js");
const {
  InplaceEditor,
} = require("resource://devtools/client/shared/inplace-editor.js");
loadHelperScript("helper_inplace_editor.js");

// Test the inplace-editor autocomplete popup for the `anchor-size()` function.

const MOCK_ANCHORS = ["--a", "--b", "--my-anchor", "--my-other-anchor"];
const ANCHOR_SIDES = [
  "block",
  "height",
  "inline",
  "self-block",
  "self-inline",
  "width",
];

add_task(async function testAutocompleteAnchorFunction() {
  await addTab(
    "data:text/html;charset=utf-8,inplace editor CSS anchor-size() autocomplete"
  );
  const { host, doc } = await createHost();

  await checkAutocomplete({
    doc,
    initialText: "anchor-size(",
    inputValueAfterSuggest: "anchor-size(--a",
    popupItems: [...MOCK_ANCHORS, ...ANCHOR_SIDES],
  });

  await checkAutocomplete({
    doc,
    initialText: "anchor-size(--",
    inputValueAfterSuggest: "anchor-size(--a",
    popupItems: MOCK_ANCHORS,
  });

  await checkAutocomplete({
    doc,
    initialText: "anchor-size(--m",
    inputValueAfterSuggest: "anchor-size(--my-anchor",
    popupItems: ["--my-anchor", "--my-other-anchor"],
  });

  await checkAutocomplete({
    doc,
    initialText: "anchor-size(--a",
    inputValueAfterSuggest: "anchor-size(--a",
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "anchor-size(--a ",
    inputValueAfterSuggest: "anchor-size(--a block",
    popupItems: ANCHOR_SIDES,
  });

  await checkAutocomplete({
    doc,
    initialText: "anchor-size(--a s",
    inputValueAfterSuggest: "anchor-size(--a self-block",
    popupItems: ["self-block", "self-inline"],
  });

  await checkAutocomplete({
    doc,
    initialText: "anchor-size(s",
    inputValueAfterSuggest: "anchor-size(self-block",
    popupItems: ["self-block", "self-inline"],
  });

  await checkAutocomplete({
    doc,
    initialText: "anchor-size(self-block ",
    inputValueAfterSuggest: "anchor-size(self-block --a",
    popupItems: MOCK_ANCHORS,
  });

  await checkAutocomplete({
    doc,
    initialText: "anchor-size(self-block --my",
    inputValueAfterSuggest: "anchor-size(self-block --my-anchor",
    popupItems: ["--my-anchor", "--my-other-anchor"],
  });

  await checkAutocomplete({
    doc,
    initialText: "anchor-size(self-block --my-anchor,",
    inputValueAfterSuggest: "anchor-size(self-block --my-anchor,",
    // no more autocomplete after the comma
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "anchor-size(self-block --my-anchor, ",
    inputValueAfterSuggest: "anchor-size(self-block --my-anchor, ",
    // no more autocomplete after the comma
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "anchor-size(self-block,",
    inputValueAfterSuggest: "anchor-size(self-block,",
    // no more autocomplete after the comma
    popupItems: [],
  });

  await checkAutocomplete({
    doc,
    initialText: "anchor-size(self-block, ",
    inputValueAfterSuggest: "anchor-size(self-block, ",
    // no more autocomplete after the comma
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

  await new Promise(resolve => {
    createInplaceEditorAndClick(
      {
        initial: initialText,
        start: async editor => {
          await waitFor(() => editor.anchorNames);
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
          name: "width",
        },
        getCssAnchors: () => MOCK_ANCHORS,
        done: resolve,
        popup,
      },
      doc
    );
  });

  popup.destroy();
}
