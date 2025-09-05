/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/* import-globals-from head.js */

add_task(async function test_close_button() {
  await BrowserTestUtils.withNewTab(
    {
      url: "about:shoppingsidebar",
      gBrowser,
    },
    async browser => {
      // Call SpecialPowers.spawn to make RPMSetPref available on the content window.
      await SpecialPowers.spawn(
        browser,
        [MOCK_ANALYZED_PRODUCT_RESPONSE],
        async () => {
          let { sinon } = ChromeUtils.importESModule(
            "resource://testing-common/Sinon.sys.mjs"
          );

          let xrayWindow = ChromeUtils.waiveXrays(content);
          let setPrefSpy = sinon.spy(xrayWindow, "RPMSetPref");

          let closeButton = content.document
            .querySelector("shopping-container")
            .shadowRoot.querySelector("#close-button");
          closeButton.click();

          ok(
            setPrefSpy.calledOnceWith(
              "browser.shopping.experience2023.active",
              false
            )
          );
          setPrefSpy.restore();
        }
      );
    }
  );
});

add_task(async function test_double_header() {
  SpecialPowers.pushPrefEnv({
    set: [
      ["sidebar.revamp", false],
      ["browser.shopping.experience2023.integratedSidebar", true],
    ],
  });

  await BrowserTestUtils.withNewTab(
    {
      url: "about:shoppingsidebar",
      gBrowser,
    },
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        let secondHeader = content.document.querySelector("#shopping-header");
        Assert.ok(!secondHeader);
      });
    }
  );
  await SpecialPowers.popPrefEnv();
});
