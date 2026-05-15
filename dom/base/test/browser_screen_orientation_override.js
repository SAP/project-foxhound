/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const PAGE_URL =
  "https://example.com/document-builder.sjs?html=<h1>Test orientation simulation</h1>";

add_task(async function test_set_orientation_override() {
  const tab = BrowserTestUtils.addTab(gBrowser, PAGE_URL);
  const browser = gBrowser.getBrowserForTab(tab);

  await BrowserTestUtils.browserLoaded(browser);

  info("Get default orientation values");
  const defaultOrientationAngle = await getOrientationAngle(browser);
  const defaultOrientationType = await getOrientationType(browser);

  info("Set orientation override");
  const orientationAngleOverride1 = 180;
  const orientationTypeOverride1 = "portrait-primary";
  browser.browsingContext.setOrientationOverride(
    orientationTypeOverride1,
    orientationAngleOverride1
  );

  await assertOrientationOverride(
    browser,
    orientationAngleOverride1,
    orientationTypeOverride1
  );

  info("Set another orientation override");
  const orientationAngleOverride2 = 90;
  const orientationTypeOverride2 = "landscape-secondary";
  browser.browsingContext.setOrientationOverride(
    orientationTypeOverride2,
    orientationAngleOverride2
  );

  await assertOrientationOverride(
    browser,
    orientationAngleOverride2,
    orientationTypeOverride2
  );

  info("Reset orientation override");
  browser.browsingContext.resetOrientationOverride();

  await assertOrientationOverride(
    browser,
    defaultOrientationAngle,
    defaultOrientationType
  );

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_set_orientation_override_in_different_contexts() {
  const tab1 = BrowserTestUtils.addTab(gBrowser, PAGE_URL);
  const browser1 = gBrowser.getBrowserForTab(tab1);

  await BrowserTestUtils.browserLoaded(browser1);

  const tab2 = BrowserTestUtils.addTab(gBrowser, PAGE_URL);
  const browser2 = gBrowser.getBrowserForTab(tab2);

  await BrowserTestUtils.browserLoaded(browser2);

  info("Get default orientation values");
  const defaultOrientationAngle = await getOrientationAngle(browser1);
  const defaultOrientationType = await getOrientationType(browser1);

  info("Set orientation override to the first tab");
  const orientationAngleOverride = 180;
  const orientationTypeOverride = "portrait-primary";
  browser1.browsingContext.setOrientationOverride(
    orientationTypeOverride,
    orientationAngleOverride
  );

  await assertOrientationOverride(
    browser1,
    orientationAngleOverride,
    orientationTypeOverride
  );

  info("Make sure that in the second tab orientation is not overridden");
  await assertOrientationOverride(
    browser2,
    defaultOrientationAngle,
    defaultOrientationType
  );

  info("Reset orientation override in the first tab");
  browser1.browsingContext.resetOrientationOverride();
  await assertOrientationOverride(
    browser1,
    defaultOrientationAngle,
    defaultOrientationType
  );

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
});

async function assertOrientationOverride(
  browser,
  expectedAngleValue,
  expectedTypeValue
) {
  is(
    await getOrientationAngle(browser),
    expectedAngleValue,
    "screen.orientation.angle has expected value"
  );
  is(
    await getOrientationType(browser),
    expectedTypeValue,
    "screen.orientation.type has expected value"
  );
}

async function getOrientationAngle(browser) {
  return await SpecialPowers.spawn(
    browser,
    [],
    () => content.screen.orientation.angle
  );
}

async function getOrientationType(browser) {
  return await SpecialPowers.spawn(
    browser,
    [],
    () => content.screen.orientation.type
  );
}
