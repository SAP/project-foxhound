/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const NativeKeyConstants = {};
Services.scriptloader.loadSubScript(
  "chrome://mochikit/content/tests/SimpleTest/NativeKeyCodes.js",
  NativeKeyConstants
);

add_setup(async function init() {
  registerCleanupFunction(async function () {
    await PlacesUtils.history.clear();
    await UrlbarTestUtils.formHistory.clear();
  });
});

add_task(async function space_to_activate_without_input_value() {
  await PlacesTestUtils.addVisits("https://example.com");
  await doSpaceKeyTest({ input: "example", targetRowIndex: 1 });
  await PlacesUtils.history.clear();
});

add_task(async function space_to_activate_with_input_value() {
  let extension = await SearchTestUtils.installSearchExtension(
    {},
    {
      setAsDefault: true,
      skipUnload: true,
    }
  );
  let engine = SearchService.getEngineByName("Example");
  await SearchService.moveEngine(engine, 0);
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.suggest.searches", true],
      ["browser.urlbar.maxHistoricalSearchSuggestions", 1],
    ],
  });

  await UrlbarTestUtils.formHistory.add(["foobar"]);
  await doSpaceKeyTest({ input: "foo", targetRowIndex: 1 });
  await extension.unload();
  await UrlbarTestUtils.formHistory.clear();
  await SpecialPowers.popPrefEnv();
});

async function doSpaceKeyTest({ input, targetRowIndex }) {
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: input,
  });

  // Select the target row.
  gURLBar.view.selectedRowIndex = targetRowIndex;
  // Focus on the resule menu button.
  EventUtils.synthesizeKey("KEY_Tab");

  // Keep the urlbar value to compare after opening result menu.
  let previousUrlbarValue = gURLBar.value;

  // Open result menu by SPACE key.
  let promiseMenuOpen = BrowserTestUtils.waitForEvent(
    gURLBar.view.resultMenu,
    "popupshown"
  );

  await new Promise(resolve => {
    EventUtils.synthesizeNativeKey(
      EventUtils.KEYBOARD_LAYOUT_EN_US,
      Services.appinfo.OS == "WINNT"
        ? NativeKeyConstants.WIN_VK_SPACE
        : NativeKeyConstants.MAC_VK_Space,
      {},
      " ",
      " ",
      resolve
    );
  });

  await promiseMenuOpen;
  Assert.ok(true, "Menu is opened by space");
  Assert.equal(
    gURLBar.value,
    previousUrlbarValue,
    "The urlbar value should be same"
  );
  gURLBar.view.resultMenu.hidePopup();
}
