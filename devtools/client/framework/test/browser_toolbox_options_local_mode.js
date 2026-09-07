/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests that you can configure local mode mappings from options panel

const TEST_URI = "data:text/html,local mode options";

const l10n = new Localization(["devtools/client/toolbox-options.ftl"], true);
const { LocalModeMappings } = ChromeUtils.importESModule(
  "resource://devtools/client/framework/LocalModeMappings.sys.mjs"
);

add_task(async function () {
  const tab = await addTab(TEST_URI);

  const toolbox = await gDevTools.showToolboxForTab(tab, { toolId: "options" });

  const panel = toolbox.getCurrentPanel();
  const { panelDoc } = panel;

  await createMapping(toolbox, panelDoc, "./local-mode", "firefox.localhost");

  await navigateToMapping(panelDoc, 0);
  is(gBrowser.selectedBrowser.currentURI.spec, "https://firefox.localhost/");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], function () {
    is(
      content.document.documentElement.textContent,
      "Local mode HTML test page\n",
      "The opened page is the local html page"
    );
  });

  await createMapping(toolbox, panelDoc, ".", "firefox1.localhost");
  await navigateToMapping(panelDoc, 1);
  is(gBrowser.selectedBrowser.currentURI.spec, "https://firefox1.localhost/");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], function () {
    Assert.stringContains(
      content.document.documentElement.textContent,
      "browser_toolbox_options_local_mode.js",
      "The html page is a directory listing which includes the current test"
    );
  });

  await editMappingWithConflict(toolbox, panelDoc);

  await disableMapping(toolbox, panelDoc, 1);

  await removeMapping(toolbox, panelDoc, 1);

  await checkBuggyPath(toolbox, panelDoc);

  await checkAutoReloadErrorPage(toolbox, panelDoc);

  await toolbox.destroy();
  gBrowser.removeCurrentTab();
});

function getMappingsCount(doc) {
  return doc.querySelectorAll("#local-mode-mappings li").length;
}

async function createMapping(toolbox, doc, localTestFolder, expectedOrigin) {
  const newMapping = doc.querySelector(`.local-mode-new-mapping`);

  const folderPath = prepareMockFilePicker(localTestFolder);
  ok(folderPath, "Got the current folder path");

  const previousMappingCount = getMappingsCount(doc);
  const onMappingsUpdated = LocalModeMappings.once("updated");
  newMapping.click();

  info("Wait for the mappings to be updated");
  await onMappingsUpdated;

  info("Wait for the new mapping to be displayed");
  await waitFor(() => getMappingsCount(doc) > previousMappingCount);

  // Always expected the new mapping to be displayed last
  const originInput = [
    ...doc.querySelectorAll(`.local-mode-origin-line input`),
  ].at(-1);
  is(
    doc.activeElement,
    originInput,
    "The new mapping's origin input is focused"
  );

  is(originInput.value, expectedOrigin, "The default origin input is correct");
  const folderLink = [...doc.querySelectorAll(`.local-mode-folder-line a`)].at(
    -1
  );
  is(folderLink.textContent, folderPath, "The folder path looks correct");
}

/**
 * Helper to easily find a DOM element via its selector in a given local mode mapping
 */
function queryMappingElementSelector(doc, mappingIndex, selector = "") {
  return doc.querySelector(
    `#local-mode-mappings li:nth-child(${mappingIndex + 1}) ${selector}`
  );
}

async function navigateToMapping(doc, mappingIndex) {
  const openButton = queryMappingElementSelector(
    doc,
    mappingIndex,
    ".local-mode-mapping-navigate-to"
  );

  const waitForDevToolsReload = await watchForDevToolsReload(
    gBrowser.selectedBrowser
  );

  openButton.click();

  info("Wait for navigation to be fully processed by DevTools");
  await waitForDevToolsReload();
}

async function editMappingWithConflict(toolbox, doc) {
  const mappingIndex = 1;
  const originElement = queryMappingElementSelector(
    doc,
    mappingIndex,
    ".local-mode-origin-input"
  );

  info("Update the origin input element with a conflicting origin");
  originElement.focus();
  originElement.value = "";
  EventUtils.sendString("firefox.localhost", doc.defaultView);

  info("Wait for the input to be flagged as invalid");
  await waitFor(() => originElement.matches(":invalid"));
  const originError = queryMappingElementSelector(
    doc,
    mappingIndex,
    ".local-mode-origin-error"
  );
  is(
    originError.textContent,
    l10n.formatValueSync("options-local-mode-origin-conflict")
  );
}

async function disableMapping(toolbox, doc, mappingIndex) {
  const toggleButton = queryMappingElementSelector(
    doc,
    mappingIndex,
    ".local-mode-mapping-toggle"
  );
  ok(
    !queryMappingElementSelector(doc, mappingIndex).classList.contains(
      "disabled"
    ),
    "The mapping is enabled"
  );

  const onMappingsUpdated = LocalModeMappings.once("updated");
  toggleButton.click();

  info("Wait for the mapping to be displayed as disabled");
  await waitFor(() =>
    queryMappingElementSelector(doc, mappingIndex).classList.contains(
      "disabled"
    )
  );
  info("Wait for the mappings to be updated");
  await onMappingsUpdated;
}

async function removeMapping(toolbox, doc, mappingIndex) {
  const removeButton = queryMappingElementSelector(
    doc,
    mappingIndex,
    ".local-mode-mapping-remove"
  );

  const onMappingsUpdated = LocalModeMappings.once("updated");
  const onConfirmAccepted = BrowserTestUtils.promiseAlertDialogOpen("accept");
  removeButton.click();
  await onConfirmAccepted;

  info("Wait for the mapping to be displayed as disabled");
  await waitFor(() => !queryMappingElementSelector(doc, mappingIndex));
  info("Wait for the mappings to be updated");
  await onMappingsUpdated;
}

async function checkBuggyPath(toolbox, doc) {
  const buggyPath = "/buggy-path/foo";
  const mappingIndex = 0;

  ok(
    !doc.querySelector(".local-mode-folder-warning"),
    "There is no warning displayed before hacking the path"
  );

  info("Set the first mapping to a buggy, non-existing path");
  // Use internal preference as the folder picker wouldn't allow us to do that,
  // nor can we easily remove our local test folder
  const onMappingsUpdated = LocalModeMappings.once("updated");
  Services.prefs.setStringPref(
    `${LocalModeMappings.LOCAL_MODE_MAPPINGS_PREF_PREFIX}${mappingIndex}.path`,
    buggyPath
  );
  await onMappingsUpdated;

  const folderLink = queryMappingElementSelector(
    doc,
    mappingIndex,
    ".local-mode-folder-line a"
  );
  is(folderLink.textContent, buggyPath);
  ok(
    doc.querySelector(".local-mode-folder-error"),
    "The warning is now displayed"
  );
}

async function checkAutoReloadErrorPage(toolbox, panelDoc) {
  info("Reload on an origin that is no longer mapped");
  is(gBrowser.selectedBrowser.currentURI.spec, "https://firefox1.localhost/");
  // This will trigger a neterror page
  const onErrorPageLoaded = BrowserTestUtils.waitForErrorPage(
    gBrowser.selectedBrowser
  );
  await reloadSelectedTab({ isErrorPage: true, waitForLoad: false });
  await onErrorPageLoaded;

  info("Re-create a mapping matching the currently loaded URL");
  const loaded = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
  await createMapping(toolbox, panelDoc, "./local-mode/", "firefox1.localhost");
  info("Wait for the page to be reloaded");
  await loaded;
  info("Assert that the reloaded page worked correctly");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], function () {
    is(
      content.document.documentElement.textContent,
      "Local mode HTML test page\n",
      "The opened page is the local html page"
    );
  });
}

function _getSupportsFile(path) {
  const cr = Cc["@mozilla.org/chrome/chrome-registry;1"].getService(
    Ci.nsIChromeRegistry
  );
  const uri = Services.io.newURI(CHROME_URL_ROOT + path);
  const fileurl = cr.convertChromeURL(uri);
  return fileurl.QueryInterface(Ci.nsIFileURL);
}

function prepareMockFilePicker(pathOrFile) {
  const isFile = typeof pathOrFile.isFile === "function" && pathOrFile.isFile();
  const file = isFile ? pathOrFile : _getSupportsFile(pathOrFile).file;

  // Mock the file picker to select a test addon
  const MockFilePicker = SpecialPowers.MockFilePicker;
  MockFilePicker.init();
  MockFilePicker.setFiles([file]);
  return file.path;
}
