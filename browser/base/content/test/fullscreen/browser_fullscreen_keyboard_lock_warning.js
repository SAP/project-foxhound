/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["test.wait300msAfterTabSwitch", true],
      ["dom.fullscreen.keyboard_lock.enabled", true],
      [
        "dom.fullscreen.keyboard_lock.long_press_interval",
        KEYBOARD_LOCK_LONGPRESS_TIME,
      ],
      ["full-screen-api.allow-trusted-requests-only", false],
      ["full-screen-api.warning.timeout", 1000],
      ["full-screen-api.keyboardlock-warning.timeout", 1000],
    ],
  });
});

add_task(async function test_keyboard_lock_initial_warning() {
  await BrowserTestUtils.withNewTab("https://example.com", async browser => {
    info("start fullscreen with keyboard lock");
    let warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen",
      true
    );
    await DOMFullscreenTestUtils.changeFullscreen(browser, true, {
      keyboardLock: "browser",
    });
    await warningShownPromise;

    info("Wait for fullscreen warning timed out");
    await DOMFullscreenTestUtils.waitForWarningState(browser, "hidden");

    info("Exit fullscreen.");
    await DOMFullscreenTestUtils.changeFullscreen(browser, false);
  });
});

add_task(async function test_keyboard_lock_warning_reappear() {
  await BrowserTestUtils.withNewTab("https://example.com", async browser => {
    info("start fullscreen with keyboard lock");
    let warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen",
      true
    );
    await DOMFullscreenTestUtils.changeFullscreen(browser, true, {
      keyboardLock: "browser",
    });
    await warningShownPromise;

    info("Wait for fullscreen warning timed out");
    await DOMFullscreenTestUtils.waitForWarningState(browser, "hidden");

    info("Move mouse to the top of screen.");
    await Promise.all([
      DOMFullscreenTestUtils.waitForWarningState(browser, "ontop", true),
      EventUtils.synthesizeMouse(document.documentElement, 100, 0, {
        type: "mousemove",
      }),
    ]);

    info("Wait for fullscreen warning timed out again.");
    await DOMFullscreenTestUtils.waitForWarningState(browser, "hidden");

    info("Exit fullscreen.");
    await DOMFullscreenTestUtils.changeFullscreen(browser, false);
  });
});

add_task(async function test_keyboard_lock_warning_multiple_esc() {
  await BrowserTestUtils.withNewTab("https://example.com", async browser => {
    info("start fullscreen with keyboard lock");
    let warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen",
      true
    );
    await DOMFullscreenTestUtils.changeFullscreen(browser, true, {
      keyboardLock: "browser",
    });
    await warningShownPromise;

    info("Wait for fullscreen warning timed out");
    await DOMFullscreenTestUtils.waitForWarningState(browser, "hidden");

    info("Press Escape key multiple times should reshow the warning");
    warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen",
      true
    );
    EventUtils.synthesizeKey("KEY_Escape", {});
    EventUtils.synthesizeKey("KEY_Escape", {});
    EventUtils.synthesizeKey("KEY_Escape", {});
    await warningShownPromise;

    info("Wait for fullscreen warning timed out again");
    await DOMFullscreenTestUtils.waitForWarningState(browser, "hidden");

    info("Exit fullscreen.");
    await DOMFullscreenTestUtils.changeFullscreen(browser, false);
  });
});

add_task(async function test_keyboard_lock_warning_change() {
  await BrowserTestUtils.withNewTab("https://example.com", async browser => {
    info("start fullscreen without keyboard lock");
    let warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen"
    );
    await DOMFullscreenTestUtils.changeFullscreen(browser, true);
    await warningShownPromise;

    info("Wait for fullscreen warning timed out");
    await DOMFullscreenTestUtils.waitForWarningState(browser, "hidden");

    info("request fullscreen again with keyboard lock");
    warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen",
      true
    );
    await SpecialPowers.spawn(browser, [], async () => {
      content.document.body.requestFullscreen({ keyboardLock: "browser" });
    });
    await warningShownPromise;

    info("Wait for fullscreen warning timed out");
    await DOMFullscreenTestUtils.waitForWarningState(browser, "hidden");

    info("Press Escape key multiple times should reshow the warning");
    warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen",
      true
    );
    EventUtils.synthesizeKey("KEY_Escape", {});
    EventUtils.synthesizeKey("KEY_Escape", {});
    EventUtils.synthesizeKey("KEY_Escape", {});
    await warningShownPromise;

    info("request fullscreen again without keyboard lock");
    warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen"
    );
    await SpecialPowers.spawn(browser, [], async () => {
      content.document.body.requestFullscreen();
    });
    await warningShownPromise;

    info("Wait for fullscreen warning timed out");
    await DOMFullscreenTestUtils.waitForWarningState(browser, "hidden");

    info("Exit fullscreen.");
    await DOMFullscreenTestUtils.changeFullscreen(browser, false);
  });
});

add_task(async function test_keyboard_lock_warning_change_shadow_dom() {
  await BrowserTestUtils.withNewTab("https://example.com", async browser => {
    info("Setup shadow DOM");
    await SpecialPowers.spawn(browser, [], async () => {
      let host = content.document.createElement("div");
      host.id = "host";
      content.document.body.appendChild(host);

      let shadowRoot = host.attachShadow({ mode: "open" });
      shadowRoot.innerHTML = `
        <div id="outer">
          Outer
          <div id="inner">Inner</div>
        </div>
      `;
    });

    info("Start fullscreen without keyboard lock");
    let warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen"
    );
    await DOMFullscreenTestUtils.changeFullscreen(browser, true);
    await warningShownPromise;

    info("Wait for fullscreen warning timed out");
    await DOMFullscreenTestUtils.waitForWarningState(browser, "hidden");

    info("request fullscreen again with keyboard lock in shadow DOM");
    warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen",
      true
    );
    await SpecialPowers.spawn(browser, [], async () => {
      let host = content.document.getElementById("host");
      let shadowRoot = host.shadowRoot;
      let outer = shadowRoot.getElementById("outer");
      outer.requestFullscreen({ keyboardLock: "browser" });
    });
    await warningShownPromise;

    info("Wait for fullscreen warning timed out");
    await DOMFullscreenTestUtils.waitForWarningState(browser, "hidden");

    info("Press Escape key multiple times should reshow the warning");
    warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen",
      true
    );
    EventUtils.synthesizeKey("KEY_Escape", {});
    EventUtils.synthesizeKey("KEY_Escape", {});
    EventUtils.synthesizeKey("KEY_Escape", {});
    await warningShownPromise;

    info(
      "request fullscreen again without keyboard lock on nested node in shadow DOM"
    );
    warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen"
    );
    await SpecialPowers.spawn(browser, [], async () => {
      let host = content.document.getElementById("host");
      let shadowRoot = host.shadowRoot;
      let inner = shadowRoot.getElementById("inner");
      inner.requestFullscreen({ keyboardLock: "none" });
    });
    await warningShownPromise;

    info("Wait for fullscreen warning timed out");
    await DOMFullscreenTestUtils.waitForWarningState(browser, "hidden");

    info(
      "document.exitFullscreen() should back to fullscreen with keyboard lock"
    );
    warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen",
      true
    );
    await SpecialPowers.spawn(browser, [], async () => {
      await content.document.exitFullscreen();
    });
    await warningShownPromise;

    info("Wait for fullscreen warning timed out");
    await DOMFullscreenTestUtils.waitForWarningState(browser, "hidden");

    info("Press Escape key multiple times should reshow the warning");
    warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen",
      true
    );
    EventUtils.synthesizeKey("KEY_Escape", {});
    EventUtils.synthesizeKey("KEY_Escape", {});
    EventUtils.synthesizeKey("KEY_Escape", {});
    await warningShownPromise;

    info(
      "document.exitFullscreen() should back to fullscreen without keyboard lock"
    );
    warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen",
      false
    );
    await SpecialPowers.spawn(browser, [], async () => {
      await content.document.exitFullscreen();
    });
    await warningShownPromise;

    info("Wait for fullscreen warning timed out");
    await DOMFullscreenTestUtils.waitForWarningState(browser, "hidden");

    info("Exit fullscreen.");
    await DOMFullscreenTestUtils.changeFullscreen(browser, false);
  });
});

add_task(async function test_keyboard_lock_change_warning_change_iframe() {
  await BrowserTestUtils.withNewTab("https://example.com", async browser => {
    info("start fullscreen without keyboard lock");
    let warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen"
    );
    await DOMFullscreenTestUtils.changeFullscreen(browser, true);
    await warningShownPromise;

    info("Wait for fullscreen warning timed out");
    await DOMFullscreenTestUtils.waitForWarningState(browser, "hidden");

    info("request fullscreen in iframe with keyboard lock");
    warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen",
      true
    );
    await SpecialPowers.spawn(browser, [], async () => {
      let frame = content.document.createElement("iframe");
      content.document.body.appendChild(frame);

      frame.focus();
      await SpecialPowers.spawn(frame, [], async () => {
        await content.document.body.requestFullscreen({
          keyboardLock: "browser",
        });
      });
    });
    await warningShownPromise;

    info("Wait for fullscreen warning timed out");
    await DOMFullscreenTestUtils.waitForWarningState(browser, "hidden");

    info("Press Escape key multiple times should reshow the warning");
    warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen",
      true
    );
    EventUtils.synthesizeKey("KEY_Escape", {});
    EventUtils.synthesizeKey("KEY_Escape", {});
    EventUtils.synthesizeKey("KEY_Escape", {});
    await warningShownPromise;

    info("Long press to exit fullscreen");
    let fullscreenExited = BrowserTestUtils.waitForEvent(
      document,
      "fullscreenchange",
      false,
      () => !document.fullscreenElement
    );
    await synthesizeLongPressEsc(browser);
    await fullscreenExited;
  });
});

add_task(async function test_keyboard_lock_warning_long_press() {
  // Change the pref to make sure the long-press won't exit fullscreen.
  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.fullscreen.keyboard_lock.long_press_interval", 5000],
      ["dom.fullscreen.keyboard_lock.long_press_warning_interval", 0],
    ],
  });

  await BrowserTestUtils.withNewTab("https://example.com", async browser => {
    info("start fullscreen with keyboard lock");
    let warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen",
      true
    );
    await DOMFullscreenTestUtils.changeFullscreen(browser, true, {
      keyboardLock: "browser",
    });
    await warningShownPromise;

    info("Wait for fullscreen warning timed out");
    await DOMFullscreenTestUtils.waitForWarningState(browser, "hidden");

    info("Log press will trigger the fullscreen warning");
    warningShownPromise = DOMFullscreenTestUtils.waitForWarningState(
      browser,
      "onscreen",
      true
    );
    EventUtils.synthesizeKey("KEY_Escape", { repeat: 2 });
    await warningShownPromise;

    info("Wait for fullscreen warning timed out");
    await DOMFullscreenTestUtils.waitForWarningState(browser, "hidden");

    info("Exit fullscreen.");
    await DOMFullscreenTestUtils.changeFullscreen(browser, false);
  });

  await SpecialPowers.popPrefEnv();
});
