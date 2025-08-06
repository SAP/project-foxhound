/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_ads_requested_after_enabled() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.shopping.experience2023.ads.enabled", true],
      ["browser.shopping.experience2023.ads.userEnabled", false],
      ["browser.shopping.experience2023.autoOpen.enabled", true],
      ["toolkit.shopping.ohttpRelayURL", ""],
      ["toolkit.shopping.ohttpConfigURL", ""],
    ],
  });
  await BrowserTestUtils.withNewTab(
    {
      url: PRODUCT_TEST_URL,
      gBrowser,
    },
    async browser => {
      let sidebar = gBrowser
        .getPanel(browser)
        .querySelector("shopping-sidebar");
      Assert.ok(sidebar, "Sidebar should exist");
      Assert.ok(
        BrowserTestUtils.isVisible(sidebar),
        "Sidebar should be visible."
      );
      info("Waiting for sidebar to update.");
      await promiseSidebarUpdated(sidebar, PRODUCT_TEST_URL);

      await SpecialPowers.spawn(
        sidebar.querySelector("browser"),
        [],
        async () => {
          let shoppingContainer =
            content.document.querySelector(
              "shopping-container"
            ).wrappedJSObject;
          await shoppingContainer.updateComplete;

          Assert.ok(
            !shoppingContainer.recommendedAdEl,
            "Recommended card should not exist"
          );

          let shoppingSettings = shoppingContainer.settingsEl;
          await shoppingSettings.updateComplete;

          let recommendationsToggle = shoppingSettings.recommendationsToggleEl;
          recommendationsToggle.click();

          await ContentTaskUtils.waitForCondition(() => {
            return shoppingContainer.recommendedAdEl;
          });

          await shoppingContainer.updateComplete;

          let recommendedCard = shoppingContainer.recommendedAdEl;
          await recommendedCard.updateComplete;
          Assert.ok(recommendedCard, "Recommended card should exist");
          Assert.ok(
            ContentTaskUtils.isVisible(recommendedCard),
            "Recommended card is visible"
          );

          let price = recommendedCard.priceEl;
          Assert.ok(price, "Recommendation price is visible");
        }
      );
    }
  );
});

/**
 * Tests that the sponsored label only appears if served sponsored content.
 */
add_task(async function test_sponsored_label_visible() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.shopping.experience2023.ads.enabled", true],
      ["browser.shopping.experience2023.ads.userEnabled", true],
      ["browser.shopping.experience2023.autoOpen.enabled", true],
      ["toolkit.shopping.ohttpRelayURL", ""],
      ["toolkit.shopping.ohttpConfigURL", ""],
    ],
  });
  await BrowserTestUtils.withNewTab(
    {
      url: PRODUCT_TEST_URL,
      gBrowser,
    },
    async browser => {
      let sidebar = gBrowser
        .getPanel(browser)
        .querySelector("shopping-sidebar");
      Assert.ok(sidebar, "Sidebar should exist");
      Assert.ok(
        BrowserTestUtils.isVisible(sidebar),
        "Sidebar should be visible."
      );
      info("Waiting for sidebar to update.");
      await promiseSidebarUpdated(sidebar, PRODUCT_TEST_URL);

      await SpecialPowers.spawn(
        sidebar.querySelector("browser"),
        [],
        async () => {
          let shoppingContainer =
            content.document.querySelector(
              "shopping-container"
            ).wrappedJSObject;

          await ContentTaskUtils.waitForCondition(() => {
            return shoppingContainer.recommendedAdEl;
          });
          await shoppingContainer.updateComplete;

          let recommendedCard = shoppingContainer.recommendedAdEl;

          Assert.ok(recommendedCard, "Recommended card should exist");
          Assert.ok(
            ContentTaskUtils.isVisible(recommendedCard),
            "Recommended card is visible"
          );
          Assert.ok(
            recommendedCard.sponsoredLabelEl,
            "Sponsored label should exist"
          );
        }
      );
    }
  );
});

/**
 * Tests that the sponsored label does not appear if served a recommendation.
 */
add_task(async function test_sponsored_label_hidden() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.shopping.experience2023.ads.enabled", true],
      ["browser.shopping.experience2023.ads.userEnabled", true],
      ["browser.shopping.experience2023.autoOpen.enabled", true],
      ["toolkit.shopping.ohttpRelayURL", ""],
      ["toolkit.shopping.ohttpConfigURL", ""],
    ],
  });
  await BrowserTestUtils.withNewTab(
    {
      url: PRODUCT_TEST_URL_NOT_SPONSORED,
      gBrowser,
    },
    async browser => {
      let sidebar = gBrowser
        .getPanel(browser)
        .querySelector("shopping-sidebar");
      Assert.ok(sidebar, "Sidebar should exist");
      Assert.ok(
        BrowserTestUtils.isVisible(sidebar),
        "Sidebar should be visible."
      );
      info("Waiting for sidebar to update.");
      await promiseSidebarUpdated(sidebar, PRODUCT_TEST_URL_NOT_SPONSORED);

      await SpecialPowers.spawn(
        sidebar.querySelector("browser"),
        [],
        async () => {
          let shoppingContainer =
            content.document.querySelector(
              "shopping-container"
            ).wrappedJSObject;

          await ContentTaskUtils.waitForCondition(() => {
            return shoppingContainer.recommendedAdEl;
          });
          await shoppingContainer.updateComplete;

          let recommendedCard = shoppingContainer.recommendedAdEl;

          Assert.ok(recommendedCard, "Recommended card should exist");
          Assert.ok(
            ContentTaskUtils.isVisible(recommendedCard),
            "Recommended card is visible"
          );
          Assert.ok(
            !recommendedCard.sponsoredLabelEl,
            "Sponsored label should not exist"
          );
        }
      );
    }
  );
});

/**
 * Tests that we don't show the price if there is none for a recommendation.
 */
add_task(async function test_price_hidden() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.shopping.experience2023.ads.enabled", true],
      ["browser.shopping.experience2023.ads.userEnabled", true],
      ["browser.shopping.experience2023.autoOpen.enabled", true],
      ["toolkit.shopping.ohttpRelayURL", ""],
      ["toolkit.shopping.ohttpConfigURL", ""],
    ],
  });
  await BrowserTestUtils.withNewTab(
    {
      url: PRODUCT_WITH_REC_NO_CURRENCY_URL,
      gBrowser,
    },
    async browser => {
      let sidebar = gBrowser
        .getPanel(browser)
        .querySelector("shopping-sidebar");
      Assert.ok(sidebar, "Sidebar should exist");
      Assert.ok(
        BrowserTestUtils.isVisible(sidebar),
        "Sidebar should be visible."
      );
      info("Waiting for sidebar to update.");
      await promiseSidebarUpdated(sidebar, PRODUCT_WITH_REC_NO_CURRENCY_URL);

      await SpecialPowers.spawn(
        sidebar.querySelector("browser"),
        [],
        async () => {
          let shoppingContainer =
            content.document.querySelector(
              "shopping-container"
            ).wrappedJSObject;

          await ContentTaskUtils.waitForCondition(() => {
            return shoppingContainer.recommendedAdEl;
          });
          await shoppingContainer.updateComplete;

          let recommendedCard = shoppingContainer.recommendedAdEl;

          Assert.ok(recommendedCard, "Recommended card should exist");
          Assert.ok(
            ContentTaskUtils.isVisible(recommendedCard),
            "Recommended card is visible"
          );
          Assert.ok(
            !recommendedCard.priceEl,
            "Recommendation price should not exist"
          );
        }
      );
    }
  );
});
