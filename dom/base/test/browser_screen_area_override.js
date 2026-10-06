/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const PAGE_URL =
  "https://example.com/document-builder.sjs?html=<h1>Test screen dimensions</h1>";

add_task(async function test_set_screen_area_override() {
  const tab = BrowserTestUtils.addTab(gBrowser, PAGE_URL);
  const browser = gBrowser.getBrowserForTab(tab);

  await BrowserTestUtils.browserLoaded(browser);

  info("Get default screen dimensions");
  const defaultScreenWidth = await getScreenWidth(browser);
  const defaultScreenAvailWidth = await getScreenAvailWidth(browser);
  const defaultScreenHeight = await getScreenHeight(browser);
  const defaultScreenAvailHeight = await getScreenAvailHeight(browser);

  info("Set screen dimensions");
  const screenWidthOverride1 = 200;
  const screenHeightOverride1 = 100;
  browser.browsingContext.setScreenAreaOverride(
    screenWidthOverride1,
    screenHeightOverride1
  );

  await assertOrientationOverride(
    browser,
    screenWidthOverride1,
    screenHeightOverride1,
    screenWidthOverride1,
    screenHeightOverride1
  );

  info("Set screen dimensions override");
  const screenWidthOverride2 = 250;
  const screenHeightOverride2 = 200;
  browser.browsingContext.setScreenAreaOverride(
    screenWidthOverride2,
    screenHeightOverride2
  );

  await assertOrientationOverride(
    browser,
    screenWidthOverride2,
    screenHeightOverride2,
    screenWidthOverride2,
    screenHeightOverride2
  );

  info("Reset screen dimensions override");
  browser.browsingContext.resetScreenAreaOverride();

  await assertOrientationOverride(
    browser,
    defaultScreenWidth,
    defaultScreenHeight,
    defaultScreenAvailWidth,
    defaultScreenAvailHeight
  );

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_set_screen_area_override_in_different_contexts() {
  const tab1 = BrowserTestUtils.addTab(gBrowser, PAGE_URL);
  const browser1 = gBrowser.getBrowserForTab(tab1);

  await BrowserTestUtils.browserLoaded(browser1);

  const tab2 = BrowserTestUtils.addTab(gBrowser, PAGE_URL);
  const browser2 = gBrowser.getBrowserForTab(tab2);

  await BrowserTestUtils.browserLoaded(browser2);

  info("Get default screen dimensions");
  const defaultScreenWidth = await getScreenWidth(browser1);
  const defaultScreenAvailWidth = await getScreenAvailWidth(browser1);
  const defaultScreenHeight = await getScreenHeight(browser1);
  const defaultScreenAvailHeight = await getScreenAvailHeight(browser1);

  info("Set screen dimensions to the first tab");
  const screenWidthOverride1 = 200;
  const screenHeightOverride1 = 100;
  browser1.browsingContext.setScreenAreaOverride(
    screenWidthOverride1,
    screenHeightOverride1
  );

  await assertOrientationOverride(
    browser1,
    screenWidthOverride1,
    screenHeightOverride1,
    screenWidthOverride1,
    screenHeightOverride1
  );

  info("Make sure that in the second tab screen dimensions are not overridden");
  await assertOrientationOverride(
    browser2,
    defaultScreenWidth,
    defaultScreenHeight,
    defaultScreenAvailWidth,
    defaultScreenAvailHeight
  );

  info("Reset screen dimensions override");
  browser1.browsingContext.resetScreenAreaOverride();

  await assertOrientationOverride(
    browser1,
    defaultScreenWidth,
    defaultScreenHeight,
    defaultScreenAvailWidth,
    defaultScreenAvailHeight
  );

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
});

async function assertOrientationOverride(
  browser,
  expectedWidthValue,
  expectedHeightValue,
  expectedAvailWidthValue,
  expectedAvailHeightValue
) {
  is(
    await getScreenWidth(browser),
    expectedWidthValue,
    "screen.width has expected value"
  );
  is(
    await getScreenAvailWidth(browser),
    expectedAvailWidthValue,
    "screen.availWidth has expected value"
  );
  is(
    await getScreenHeight(browser),
    expectedHeightValue,
    "screen.height has expected value"
  );
  is(
    await getScreenAvailHeight(browser),
    expectedAvailHeightValue,
    "screen.availHeight has expected value"
  );

  const valueBiggerThanWidth = expectedWidthValue + 1;
  is(
    await matchMediaQuery(browser, valueBiggerThanWidth),
    false,
    `matches "(min-device-width: ${valueBiggerThanWidth}px)" queries correctly`
  );

  const valueSmallerThanWidth = expectedWidthValue - 1;
  is(
    await matchMediaQuery(browser, valueSmallerThanWidth),
    true,
    `matches "(min-device-width: ${valueSmallerThanWidth}px)" queries correctly`
  );
}

async function getScreenHeight(browser) {
  return SpecialPowers.spawn(browser, [], () => content.screen.height);
}

async function getScreenAvailHeight(browser) {
  return SpecialPowers.spawn(browser, [], () => content.screen.availHeight);
}

async function getScreenWidth(browser) {
  return SpecialPowers.spawn(browser, [], () => content.screen.width);
}

async function getScreenAvailWidth(browser) {
  return SpecialPowers.spawn(browser, [], () => content.screen.availWidth);
}

async function matchMediaQuery(browser, value) {
  return SpecialPowers.spawn(
    browser,
    [value],
    value => content.matchMedia(`(min-device-width: ${value}px)`).matches
  );
}
