/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

ChromeUtils.defineESModuleGetters(this, {
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
});

add_setup(async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.scotchBonnet.enableOverride", true]],
  });
});

/**
 * Test we can open the SearchModeSwitcher with various keys
 *
 * @param {string} openKey - The keyboard character used to open the popup.
 */
async function test_open_switcher(openKey) {
  let popup = UrlbarTestUtils.searchModeSwitcherPopup(window);
  let promiseMenuOpen = BrowserTestUtils.waitForEvent(popup, "popupshown");

  info(`Open the urlbar and open the switcher via keyboard (${openKey})`);
  await focusSwitcher();
  EventUtils.synthesizeKey(openKey);
  await promiseMenuOpen;

  EventUtils.synthesizeKey("KEY_Escape");
}

/**
 * Test that not all characters will open the SearchModeSwitcher
 *
 * @param {string} dontOpenKey - The keyboard character we will ignore.
 */
async function test_dont_open_switcher(dontOpenKey) {
  let popup = UrlbarTestUtils.searchModeSwitcherPopup(window);

  let popupOpened = false;
  let opened = () => {
    popupOpened = true;
  };
  info("Pressing key that should not open the switcher");
  popup.addEventListener("popupshown", opened);
  await focusSwitcher();
  EventUtils.synthesizeKey(dontOpenKey);

  /* eslint-disable mozilla/no-arbitrary-setTimeout */
  await new Promise(r => setTimeout(r, 50));
  Assert.ok(!popupOpened, "The popup was not opened");
  popup.removeEventListener("popupshown", opened);
}

/**
 * Test we can navigate the SearchModeSwitcher with various keys
 *
 * @param {string} navKey - The keyboard character used to navigate.
 * @param {Int} navTimes - The number of times we press that key.
 * @param {object} searchMode - The searchMode that we expect to select.
 */
async function test_navigate_switcher(navKey, navTimes, searchMode) {
  let popup = UrlbarTestUtils.searchModeSwitcherPopup(window);
  let promiseMenuOpen = BrowserTestUtils.waitForEvent(popup, "popupshown");

  info("Open the urlbar and open the switcher via Enter key");
  await focusSwitcher();
  EventUtils.synthesizeKey("KEY_Enter");
  await promiseMenuOpen;

  info("Select first result and enter search mode");
  for (let i = 0; i < navTimes; i++) {
    EventUtils.synthesizeKey(navKey);
  }
  EventUtils.synthesizeKey("KEY_Enter");
  await UrlbarTestUtils.promiseSearchComplete(window);

  await UrlbarTestUtils.assertSearchMode(window, searchMode);

  info("Exit the search mode");
  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });
  EventUtils.synthesizeKey("KEY_Escape");
  await UrlbarTestUtils.assertSearchMode(window, null);
}

// TODO: Don't let tests depend on the actual search config.
let amazonSearchMode = {
  engineName: "Amazon.com",
  entry: "searchbutton",
  isPreview: false,
  isGeneralPurposeEngine: true,
};
let bingSearchMode = {
  engineName: "Bing",
  isGeneralPurposeEngine: true,
  source: 3,
  isPreview: false,
  entry: "searchbutton",
};

add_task(async function test_keyboard_nav() {
  await test_open_switcher("KEY_Enter");
  await test_open_switcher("KEY_ArrowDown");
  await test_open_switcher(" ");

  await test_dont_open_switcher("a");
  await test_dont_open_switcher("KEY_ArrowUp");
  await test_dont_open_switcher("x");

  await test_navigate_switcher("KEY_Tab", 1, amazonSearchMode);
  await test_navigate_switcher("KEY_ArrowDown", 1, amazonSearchMode);
  await test_navigate_switcher("KEY_Tab", 2, bingSearchMode);
  await test_navigate_switcher("KEY_ArrowDown", 2, bingSearchMode);
});

add_task(async function test_focus_on_switcher_by_tab() {
  const input = "abc";
  info(`Open urlbar view with query [${input}]`);
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: input,
  });

  info("Focus on Dedicated Search by tab");
  EventUtils.synthesizeKey("KEY_Tab", { shiftKey: true });

  await TestUtils.waitForCondition(
    () => document.activeElement.id == "urlbar-searchmode-switcher"
  );
  Assert.ok(true, "Dedicated Search button gets the focus");
  let popup = UrlbarTestUtils.searchModeSwitcherPopup(window);
  Assert.equal(popup.state, "closed", "Switcher popup should not be opened");
  Assert.ok(gURLBar.view.isOpen, "Urlbar view panel has been opening");
  Assert.equal(gURLBar.value, input, "Inputted value still be on urlbar");

  info("Open the switcher popup by key");
  let promiseMenuOpen = BrowserTestUtils.waitForEvent(popup, "popupshown");
  EventUtils.synthesizeKey("KEY_Enter");
  await promiseMenuOpen;
  Assert.notEqual(
    document.activeElement.id,
    "urlbar-searchmode-switcher",
    "Dedicated Search button loses the focus"
  );
  Assert.equal(
    gURLBar.view.panel.hasAttribute("hide-temporarily"),
    true,
    "Urlbar view panel is closed"
  );
  Assert.equal(gURLBar.value, input, "Inputted value still be on urlbar");

  info("Close the switcher popup by Escape");
  let promiseMenuClose = BrowserTestUtils.waitForEvent(popup, "popuphidden");
  EventUtils.synthesizeKey("KEY_Escape");
  await promiseMenuClose;
  Assert.equal(
    document.activeElement.id,
    "urlbar-input",
    "Urlbar gets the focus"
  );
  Assert.equal(
    gURLBar.view.panel.hasAttribute("hide-temporarily"),
    false,
    "Urlbar view panel is opened"
  );
  Assert.equal(gURLBar.value, input, "Inputted value still be on urlbar");
});

add_task(async function test_focus_order_by_tab() {
  await PlacesTestUtils.addBookmarkWithDetails({
    uri: "https://example.com/",
    title: "abc",
  });

  const FOCUS_ORDER_ASSERTIONS = [
    () =>
      Assert.equal(
        gURLBar.view.selectedElement,
        gURLBar.view.getLastSelectableElement()
      ),
    () =>
      Assert.equal(
        document.activeElement,
        document.getElementById("urlbar-searchmode-switcher")
      ),
    () =>
      Assert.equal(
        gURLBar.view.selectedElement,
        gURLBar.view.getFirstSelectableElement()
      ),
    () =>
      Assert.equal(
        gURLBar.view.selectedElement,
        gURLBar.view.getLastSelectableElement()
      ),
    () =>
      Assert.equal(
        document.activeElement,
        document.getElementById("urlbar-searchmode-switcher")
      ),
  ];

  for (const shiftKey of [false, true]) {
    info("Open urlbar view");
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: "abc",
    });
    Assert.equal(document.activeElement, gURLBar.inputField);
    Assert.equal(
      gURLBar.view.selectedElement,
      gURLBar.view.getFirstSelectableElement()
    );

    await BrowserTestUtils.waitForCondition(
      () => UrlbarTestUtils.getResultCount(window) == 2
    );
    Assert.ok(true, "This test needs exact 2 results");

    for (const assert of shiftKey
      ? [...FOCUS_ORDER_ASSERTIONS].reverse()
      : FOCUS_ORDER_ASSERTIONS) {
      EventUtils.synthesizeKey("KEY_Tab", { shiftKey });
      assert();
    }

    gURLBar.handleRevert();
  }

  await PlacesUtils.bookmarks.eraseEverything();
});

add_task(async function test_focus_order_by_tab_with_no_results() {
  for (const scotchBonnetEnabled of [true, false]) {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.urlbar.scotchBonnet.enableOverride", scotchBonnetEnabled],
      ],
    });

    await test_focus_order_with_no_results({ input: "", shiftKey: false });
    await test_focus_order_with_no_results({ input: "", shiftKey: true });
    await test_focus_order_with_no_results({ input: "test", shiftKey: false });
    await test_focus_order_with_no_results({ input: "test", shiftKey: true });

    await SpecialPowers.popPrefEnv();
  }
});

async function test_focus_order_with_no_results({ input, shiftKey }) {
  const scotchBonnetEnabled = UrlbarPrefs.get("scotchBonnet.enableOverride");
  info(`Test for ${JSON.stringify({ scotchBonnetEnabled, input, shiftKey })}`);

  info("Open urlbar results");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "",
  });

  info("Enter Tabs mode");
  const keywordToEnterTabsMode = scotchBonnetEnabled ? "@tabs " : "% ";
  keywordToEnterTabsMode.split("").forEach(c => EventUtils.synthesizeKey(c));
  await BrowserTestUtils.waitForCondition(
    () => UrlbarTestUtils.getResultCount(window) == 0,
    "Wait until updating the results"
  );
  Assert.equal(document.activeElement.id, "urlbar-input");

  info("Enter extra value");
  input.split("").forEach(c => EventUtils.synthesizeKey(c));

  let ok = false;
  for (let i = 0; i < 10; i++) {
    EventUtils.synthesizeKey("KEY_Tab", { shiftKey });

    ok =
      document.activeElement.id != "urlbar-input" &&
      document.activeElement.id != "urlbar-searchmode-switcher";
    if (ok) {
      break;
    }
  }
  Assert.ok(ok, "Focus was moved to a component other than the urlbar");

  info("Clean up");
  gURLBar.searchMode = null;
}

add_task(async function test_focus_order_by_tab_with_no_selected_element() {
  for (const shiftKey of [false, true]) {
    info(`Test for shifrKey:${shiftKey}`);

    info("Open urlbar results");
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: "",
    });
    Assert.equal(document.activeElement.id, "urlbar-input");
    Assert.ok(gURLBar.view.isOpen);
    Assert.ok(!gURLBar.view.selectedElement);

    let ok = false;
    for (let i = 0; i < 10; i++) {
      EventUtils.synthesizeKey("KEY_Tab", { shiftKey });

      ok =
        document.activeElement.id != "urlbar-input" &&
        document.activeElement.id != "urlbar-searchmode-switcher";
      if (ok) {
        break;
      }
    }
    Assert.ok(ok, "Focus was moved to a component other than the urlbar");
  }
});
