/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { NimbusTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/NimbusTestUtils.sys.mjs"
);
const { ExperimentAPI } = ChromeUtils.importESModule(
  "resource://nimbus/ExperimentAPI.sys.mjs"
);

// Our test helpers normally place the button on the nav-bar. That default placement and behavior
// is under test here so don't do that.
gPlaceButtonOnToolbar = false;

registerCleanupFunction(() => {
  Services.prefs.clearUserPref(
    "screenshots.browser.component.buttonOnToolbarByDefault.handled"
  );
});

add_task(async function testDefaultScrenshotButtonPlacement() {
  let area = CustomizableUI.getPlacementOfWidget("screenshot-button")?.area;
  Assert.ok(!area, "The button is not placed in a toolbar");
});

add_task(async function testNimbusDefaultScrenshotButtonPlacementEnrollment() {
  await ExperimentAPI.ready();
  let doNimbusCleanup = await NimbusTestUtils.enrollWithFeatureConfig({
    featureId: "screenshots",
    value: { buttonOnToolbarByDefault: true },
  });
  const { ScreenshotsCustomizableWidget } = ChromeUtils.importESModule(
    "moz-src:///browser/components/screenshots/ScreenshotsUtils.sys.mjs"
  );
  // re-initialize, this is normally done during browser startup
  ScreenshotsCustomizableWidget.uninit();
  ScreenshotsCustomizableWidget.init();

  let area = CustomizableUI.getPlacementOfWidget("screenshot-button")?.area;
  Assert.equal(
    area,
    "nav-bar",
    "When enrolled, the button gets placed in the nav-bar toolbar"
  );
  let placements = CustomizableUI.getWidgetIdsInArea("nav-bar");
  Assert.greater(
    placements.indexOf("screenshot-button"),
    placements.indexOf("urlbar-container"),
    "The button was placed after the urlbar"
  );
  await doNimbusCleanup();
  await cleanup();
});

add_task(async function testButtonPlacementLateEnrollment() {
  // make sure Nimbus experiment enrollment does not result in moving the button if the
  // user previously placed it somewhere
  CustomizableUI.addWidgetToArea(
    "screenshot-button",
    CustomizableUI.AREA_TABSTRIP
  );

  await ExperimentAPI.ready();
  let doNimbusCleanup = await NimbusTestUtils.enrollWithFeatureConfig({
    featureId: "screenshots",
    value: { buttonOnToolbarByDefault: true },
  });
  const { ScreenshotsCustomizableWidget } = ChromeUtils.importESModule(
    "moz-src:///browser/components/screenshots/ScreenshotsUtils.sys.mjs"
  );
  // re-initialize, this is normally done during browser startup
  ScreenshotsCustomizableWidget.uninit();
  ScreenshotsCustomizableWidget.init();

  let area = CustomizableUI.getPlacementOfWidget("screenshot-button")?.area;
  Assert.equal(
    area,
    CustomizableUI.AREA_TABSTRIP,
    "When enrolled, the button doesnt get moved when already placed on a toolbar"
  );
  await doNimbusCleanup();
  await cleanup();
});

add_task(async function testScreenshotButtonDisabled() {
  info("Test the Screenshots button state in the toolbar");
  ensureButtonOnToolbar();

  const screenshotBtn = document.getElementById("screenshot-button");
  await BrowserTestUtils.withNewTab("https://example.com/", () => {
    Assert.equal(
      screenshotBtn.disabled,
      false,
      "Screenshots button is enabled"
    );
  });
  await BrowserTestUtils.withNewTab("about:home", () => {
    Assert.equal(
      screenshotBtn.disabled,
      false,
      "Screenshots button is still enabled on about pages"
    );
  });
});
