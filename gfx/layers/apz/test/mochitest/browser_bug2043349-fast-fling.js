/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/gfx/layers/apz/test/mochitest/apz_test_utils.js",
  this
);

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/gfx/layers/apz/test/mochitest/apz_test_native_event_utils.js",
  this
);

async function runTest() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ...getPrefs("TOUCH_EVENTS:PAN"),
      ["apz.test.logging_enabled", true],
      // This test needs a fling animation which is triggered by the initial
      // touch gesture.
      ["apz.fling_min_velocity_threshold", "0.0"],
      ["apz.fling_friction", "0.0001"],
      ["apz_fling_stop_on_tap_threshold", "0.0"],
      ["apz.velocity_relevance_time_ms", 1000],
      ["apz.content_response_timeout", 5000],
    ],
  });

  const URL_ROOT = getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content/",
    "http://mochi.test:8888/"
  );

  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    URL_ROOT + "helper_bug2043349_browser.html"
  );
  const browser = tab.linkedBrowser;

  const scrollEventPromise = SpecialPowers.spawn(browser, [], () => {
    return new Promise(resolve => {
      content.window.addEventListener("scroll", () => resolve(), {
        once: true,
      });
    });
  });

  // Flush above spawned tasks.
  await SpecialPowers.spawn(browser, [], () => {});

  // Do a fast fling.
  await synthesizeNativeTouchForFastFling(
    browser,
    100,
    200,
    SpecialPowers.DOMWindowUtils.TOUCH_CONTACT
  );
  synthesizeNativeTouchForFastFling(
    browser,
    100,
    190,
    SpecialPowers.DOMWindowUtils.TOUCH_CONTACT
  );
  synthesizeNativeTouchForFastFling(
    browser,
    100,
    180,
    SpecialPowers.DOMWindowUtils.TOUCH_CONTACT
  );
  synthesizeNativeTouchForFastFling(
    browser,
    100,
    170,
    SpecialPowers.DOMWindowUtils.TOUCH_CONTACT
  );
  await synthesizeNativeTouchForFastFling(
    browser,
    100,
    10,
    SpecialPowers.DOMWindowUtils.TOUCH_REMOVE
  );

  await scrollEventPromise;

  // Setup an active touchmove event listener it will be notified to APZ via the
  // fast-path, but the event listener should never be invoked during fast fling.
  await SpecialPowers.spawn(browser, [], () => {
    content.wrappedJSObject.touchmoveObserved = false;
    content.wrappedJSObject.reverseScrolls = [];
    content.addEventListener(
      "touchmove",
      () => {
        content.wrappedJSObject.touchmoveObserved = true;
      },
      { passive: false }
    );
    let lastScrollPosition = content.scrollY;
    content.addEventListener("scroll", () => {
      if (content.scrollY < lastScrollPosition) {
        content.wrappedJSObject.reverseScrolls.push(content.scrollY);
      }
      lastScrollPosition = content.scrollY;
    });
  });

  // Start a new up and down touch gesture while the fast fling animation is running.
  // This touch-start will cancel the fling animation.
  await synthesizeNativeTouchForFastFling(
    browser,
    100,
    100,
    SpecialPowers.DOMWindowUtils.TOUCH_CONTACT
  );

  await synthesizeNativeTouchForFastFling(
    browser,
    100,
    150,
    SpecialPowers.DOMWindowUtils.TOUCH_CONTACT
  );
  await synthesizeNativeTouchForFastFling(
    browser,
    100,
    200,
    SpecialPowers.DOMWindowUtils.TOUCH_CONTACT
  );
  await synthesizeNativeTouchForFastFling(
    browser,
    100,
    50,
    SpecialPowers.DOMWindowUtils.TOUCH_CONTACT
  );
  await synthesizeNativeTouchForFastFling(
    browser,
    100,
    10,
    SpecialPowers.DOMWindowUtils.TOUCH_REMOVE
  );

  const touchmoveObserved = await SpecialPowers.spawn(browser, [], () => {
    return content.wrappedJSObject.touchmoveObserved;
  });
  ok(
    !touchmoveObserved,
    "No touchmove event was dispatched in content during fast fling"
  );

  const reverseScrolls = await SpecialPowers.spawn(browser, [], () => {
    return content.wrappedJSObject.reverseScrolls;
  });

  BrowserTestUtils.removeTab(tab);
  return reverseScrolls;
}

add_task(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [["apz.fastpath_apz_aware_listener.enabled", false]],
  });
  const reverseScrolls = await runTest();
  ok(
    !!reverseScrolls.length,
    `There should be at least one reverse scroll : ${JSON.stringify(reverseScrolls)} with apz.fastpath_apz_aware_listener enabled`
  );
});

add_task(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [["apz.fastpath_apz_aware_listener.enabled", true]],
  });
  const reverseScrolls = await runTest();
  ok(
    !!reverseScrolls.length,
    `There should be at least one reverse scroll : ${JSON.stringify(reverseScrolls)} with apz.fastpath_apz_aware_listener enabled`
  );
});
