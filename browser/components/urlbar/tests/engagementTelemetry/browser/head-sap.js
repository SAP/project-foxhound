/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/* import-globals-from head.js */

async function doUrlbarNewTabTest({ trigger, assert }) {
  await doTest(async () => {
    await openPopup("x");

    await trigger();
    await assert();
  });
}

async function doUrlbarTest({ trigger, assert }) {
  await doTest(async () => {
    await openPopup("x");
    await doEnter();
    await openPopup("y");

    await trigger();
    await assert();
  });
}

async function doSearchbarTest({ trigger, assert }) {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.search.widget.new", true]],
  });
  let cuiTestUtils = new CustomizableUITestUtils(window);
  await cuiTestUtils.addSearchBar();

  await doTest(async () => {
    await openPopup("x", SearchbarTestUtils);
    await doEnter();
    await openPopup("y", SearchbarTestUtils);

    await trigger();
    await assert();
  });
  await cuiTestUtils.removeSearchBar();
  await SpecialPowers.popPrefEnv();
}

async function doHandoffTest({ trigger, assert }) {
  await doTest(async browser => {
    BrowserTestUtils.startLoadingURIString(browser, "about:newtab");
    await BrowserTestUtils.browserStopped(browser, "about:newtab");
    await SpecialPowers.spawn(browser, [], async function () {
      await ContentTaskUtils.waitForCondition(() =>
        content.document.querySelector("content-search-handoff-ui")
      );
      let handoffUI = content.document.querySelector(
        "content-search-handoff-ui"
      );
      await handoffUI.updateComplete;
      const searchInput = handoffUI.shadowRoot.querySelector(".fake-editable");
      searchInput.click();
    });
    EventUtils.synthesizeKey("x");
    await UrlbarTestUtils.promiseSearchComplete(window);

    await trigger();
    await assert();
  });
}

async function doUrlbarAddonpageTest({ trigger, assert }) {
  const extensionData = {
    files: {
      "page.html": "<!DOCTYPE html>hello",
    },
  };
  const extension = ExtensionTestUtils.loadExtension(extensionData);
  await extension.startup();
  const extensionURL = `moz-extension://${extension.uuid}/page.html`;

  await doTest(async browser => {
    const onLoad = BrowserTestUtils.browserLoaded(browser);
    BrowserTestUtils.startLoadingURIString(browser, extensionURL);
    await onLoad;
    await openPopup("x");

    await trigger();
    await assert();
  });

  await extension.unload();
}
