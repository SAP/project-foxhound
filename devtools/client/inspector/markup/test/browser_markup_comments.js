/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test inspector markup view handling display of comments.

const TEST_URI = `
  <style>
    div::before {
      content: "before";
    }
  </style>
  <div>Text</div>
  <!-- First comment -->
  <video></video>
  <!-- Second comment -->
`;
const MARKUP_TREE_WITH_COMMENTS = `
  html
    head!ignore-children
    body
      div
        ::before
        Text
      <!-- First comment -->
      video
      <!-- Second comment -->
`.trim();
const MARKUP_TREE_WITHOUT_COMMENTS = `
  html
    head!ignore-children
    body
      div
        ::before
        Text
      video
`.trim();
const SHOW_COMMENTS_PREF = "devtools.markup.showComments";

add_task(async function testMarkupViewWithComments() {
  const { inspector } = await openInspectorForURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI)
  );

  info("Check that both comments and pseudo-elements are displayed by default");
  await assertMarkupViewAsTree(MARKUP_TREE_WITH_COMMENTS, "html", inspector);

  info("Check that comments are hidden when showComments is false");
  Services.prefs.setBoolPref(SHOW_COMMENTS_PREF, false);
  await reloadSelectedTab();
  await assertMarkupViewAsTree(MARKUP_TREE_WITHOUT_COMMENTS, "html", inspector);

  info("Check that comments are displayed again when showComments is true");
  Services.prefs.setBoolPref(SHOW_COMMENTS_PREF, true);
  await reloadSelectedTab();
  await assertMarkupViewAsTree(MARKUP_TREE_WITH_COMMENTS, "html", inspector);
});
