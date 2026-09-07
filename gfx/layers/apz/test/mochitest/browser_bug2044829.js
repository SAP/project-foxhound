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
      // Set content response timeout to 0 to avoid bug 2043764.
      ["apz.content_response_timeout", 0],
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

  // Setup an active touchstart event listener, it does nothing, thus it should
  // not prevent scrolling.
  const touchstartPromise = SpecialPowers.spawn(browser, [], () => {
    return new Promise(resolve => {
      content.addEventListener("touchstart", () => resolve(), {
        passive: false,
      });
    });
  });

  // Setup a passive touchmove event listener causing 3000ms busy state.
  // This busy state should not prevent scrolling by APZ, to check it poll
  // APZ scroll offsets and see if scrolling is on-going.
  const apzScrolledPromise = SpecialPowers.spawn(browser, [], () => {
    return new Promise(resolve => {
      content.addEventListener(
        "touchmove",
        () => {
          const utils = SpecialPowers.getDOMWindowUtils(content);
          const start = content.performance.now();
          while (content.performance.now() - start < 3000) {
            const samples =
              utils.getCompositorAPZTestData().sampledResults || [];
            for (const sample of samples) {
              if (SpecialPowers.wrap(sample).scrollOffsetY > 0) {
                resolve(true);
                return;
              }
            }
          }
          resolve(false);
        },
        { passive: true, once: true }
      );
    });
  });

  // Flush above spawned tasks.
  await SpecialPowers.spawn(browser, [], () => {});

  await synthesizeNativeTouch(
    browser,
    100,
    200,
    SpecialPowers.DOMWindowUtils.TOUCH_CONTACT
  );

  await touchstartPromise;

  // Now extend the content response timeout longer than the busy state
  // so that timeout won't happen during it.
  await SpecialPowers.pushPrefEnv({
    set: [["apz.content_response_timeout", 5000]],
  });

  await synthesizeNativeTouch(
    browser,
    100,
    150,
    SpecialPowers.DOMWindowUtils.TOUCH_CONTACT
  );
  await synthesizeNativeTouch(
    browser,
    100,
    100,
    SpecialPowers.DOMWindowUtils.TOUCH_CONTACT
  );
  await synthesizeNativeTouch(
    browser,
    100,
    50,
    SpecialPowers.DOMWindowUtils.TOUCH_CONTACT
  );
  await synthesizeNativeTouch(
    browser,
    100,
    50,
    SpecialPowers.DOMWindowUtils.TOUCH_REMOVE
  );

  const apzScrolled = await apzScrolledPromise;

  BrowserTestUtils.removeTab(tab);
  return apzScrolled;
}

// Two subtests, each with a multi-second busy-wait, on potentially slow CI.
requestLongerTimeout(2);

add_task(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [["apz.fastpath_apz_aware_listener.enabled", false]],
  });
  ok(
    await runTest(),
    "APZ scrolled during the busy-wait with fast-path disabled " +
      "(no unnecessary wait for first touchmove)"
  );
});

add_task(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [["apz.fastpath_apz_aware_listener.enabled", true]],
  });
  ok(
    await runTest(),
    "APZ scrolled during the busy-wait with fast-path enabled " +
      "(no unnecessary wait for first touchmove)"
  );
});
