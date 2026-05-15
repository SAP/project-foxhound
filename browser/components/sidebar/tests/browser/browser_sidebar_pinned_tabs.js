/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["sidebar.verticalTabs", true],
      ["sidebar.verticalTabs.dragToPinPromo.dismissed", false],
      ["sidebar.visibility", "always-show"],
    ],
  });
});

add_task(async function test_promo_card_only_shows_for_expanded_sidebar() {
  const promoCard = document.getElementById("drag-to-pin-promo-card");

  await SidebarController.initializeUIState({ expanded: false });
  ok(
    BrowserTestUtils.isHidden(promoCard),
    "Drag-to-pin promo card is hidden when sidebar is collapsed."
  );

  await SidebarController.initializeUIState({ expanded: true });
  ok(
    BrowserTestUtils.isVisible(promoCard),
    "Drag-to-pin promo card is shown when sidebar is expanded."
  );
});

add_task(async function test_dismiss_promo_card() {
  const promoCard = document.getElementById("drag-to-pin-promo-card");

  info("Dismiss drag-to-pin promo card using close button.");
  EventUtils.synthesizeMouseAtCenter(promoCard.closeButton, {});
  await BrowserTestUtils.waitForMutationCondition(
    promoCard,
    { attributeFilter: ["hidden"] },
    () => BrowserTestUtils.isHidden(promoCard)
  );
});
