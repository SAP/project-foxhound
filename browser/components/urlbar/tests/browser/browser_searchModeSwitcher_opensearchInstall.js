/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const ENGINE_TEST_URL =
  "http://mochi.test:8888/browser/browser/components/search/test/browser/opensearch.html";

add_setup(async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.scotchBonnet.enableOverride", true]],
  });
});

add_task(async () => {
  await testInstallEngine(popup => {
    if (
      AppConstants.platform == "macosx" &&
      Services.prefs.getBoolPref("widget.macos.native-anchored-menus", false)
    ) {
      // Native menus do not support synthesizing key events
      popup.activateItem(popup.querySelector("menuitem[label=engine1]"));
    } else {
      EventUtils.synthesizeKey("KEY_ArrowDown");
      EventUtils.synthesizeKey("KEY_Enter");
    }
  });

  await testInstallEngine(popup => {
    popup.querySelector("menuitem[label=engine1]").click();
  });
});

async function testInstallEngine(installFun) {
  info("Test installing opensearch engine");
  await BrowserTestUtils.loadURIString({
    browser: gBrowser.selectedBrowser,
    uriString: ENGINE_TEST_URL,
  });

  let promiseEngineAdded = SearchTestUtils.promiseEngine("Foo");

  let popup = await UrlbarTestUtils.openSearchModeSwitcher(window);
  await installFun(popup);
  let engine = await promiseEngineAdded;
  Assert.ok(true, "The engine was installed.");

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "",
  });

  await UrlbarTestUtils.assertSearchMode(window, {
    engineName: "Foo",
    entry: "searchbutton",
  });

  await UrlbarTestUtils.exitSearchMode(window, {
    backspace: true,
    waitForSearch: false,
  });

  await UrlbarTestUtils.promisePopupClose(window);

  let promiseEngineRemoved = SearchTestUtils.promiseSearchNotification(
    SearchUtils.MODIFIED_TYPE.REMOVED,
    SearchUtils.TOPIC_ENGINE_MODIFIED
  );
  let settingsWritten = SearchTestUtils.promiseSearchNotification(
    "write-settings-to-disk-complete"
  );
  await Promise.all([
    SearchService.removeEngine(engine),
    promiseEngineRemoved,
    settingsWritten,
  ]);
}
