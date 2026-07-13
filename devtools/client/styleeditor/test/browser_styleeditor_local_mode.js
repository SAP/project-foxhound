/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

// Test Style Editor content when using Local Mode

const TEST_PATH = getSupportsFile(".").file.path;
const TEST_ORIGIN = "firefox.localhost";
const TEST_URL = `https://${TEST_ORIGIN}/simple.html`;

const { LocalModeMappings } = ChromeUtils.importESModule(
  "resource://devtools/client/framework/LocalModeMappings.sys.mjs"
);

add_task(async function () {
  const prefPrefix = LocalModeMappings.createNewMapping(TEST_ORIGIN, TEST_PATH);
  registerCleanupFunction(() => {
    Services.prefs.deleteBranch(prefPrefix);
  });
  // Test helper first load the tab on the test URL,
  // whereas the Local Mode URL are only available after the toolbox is opened...
  // So open on a blank document and navigate to the local mode url right after
  const { ui } = await openStyleEditorForURL("data:text/html,blank");
  await navigateToAndWaitForStyleSheets(TEST_URL, ui, 2);

  is(ui.editors.length, 2, "Two sheets present after load.");
  const editor = ui.editors.find(e => e.friendlyName === "simple.css");
  ok(editor, "Found the simple stylesheet editor");

  info("Selecting the second editor");
  await ui.selectStyleSheet(editor.styleSheet);
  const styleEditor = await editor.getSourceEditor();
  const text = styleEditor.sourceEditor.getText();
  const originalContent = await (
    await fetch(TEST_BASE_HTTPS + "simple.css")
  ).text();
  is(text, originalContent, "style inspector content is correct");

  info(
    "Change the stylesheet text and see if we can save changes to the local file"
  );
  let dirty = editor.sourceEditor.once("dirty-change");
  const newContent = "* { color: green }";
  editor.sourceEditor.setText(newContent);
  await dirty;

  let onSaved = editor.once("property-change");
  editor.summary.querySelector(".stylesheet-saveButton").click();
  await onSaved;

  let updatedFileContent = await (
    await fetch(TEST_BASE_HTTPS + "simple.css", { cache: "no-store" })
  ).text();
  is(updatedFileContent, newContent);

  info(
    "Revert back to original text content to avoid introducing changes in local repo"
  );
  dirty = editor.sourceEditor.once("dirty-change");
  editor.sourceEditor.setText(originalContent);
  await dirty;

  onSaved = editor.once("property-change");
  editor.summary.querySelector(".stylesheet-saveButton").click();
  await onSaved;

  updatedFileContent = await (
    await fetch(TEST_BASE_HTTPS + "simple.css")
  ).text();
  is(updatedFileContent, originalContent);
});

function getSupportsFile(path) {
  const cr = Cc["@mozilla.org/chrome/chrome-registry;1"].getService(
    Ci.nsIChromeRegistry
  );
  const uri = Services.io.newURI(CHROME_URL_ROOT + path);
  const fileurl = cr.convertChromeURL(uri);
  return fileurl.QueryInterface(Ci.nsIFileURL);
}
