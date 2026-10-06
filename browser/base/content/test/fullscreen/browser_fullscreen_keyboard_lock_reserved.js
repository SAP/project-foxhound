"use strict";

add_setup(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.fullscreen.keyboard_lock.enabled", true],
      ["dom.fullscreen.keyboard_lock.long_press_interval", 0],
    ],
  });
});

/**
 * With keyboard lock
 * - ctrl+N should reach the web content
 * - ctrl+T should reach the web content
 * And because e.preventDefault()
 * - with ctrl+N not get a new window
 * - with ctrl+T not get a new tab
 */
add_task(async function test_reserved_shortcuts_prevented_by_content() {
  await BrowserTestUtils.withNewTab("https://example.com", async browser => {
    await DOMFullscreenTestUtils.changeFullscreen(browser, true, {
      keyboardLock: "browser",
    });

    // Ctrl+T: content prevents default → no new tab should open.
    await SpecialPowers.spawn(browser, [], () => {
      content.window.reservedKeyReceived = null;
      content.addEventListener(
        "keydown",
        e => {
          content.window.reservedKeyReceived = e.key;
          e.preventDefault();
        },
        { once: true }
      );
    });

    let initialTabCount = gBrowser.tabs.length;
    let newTabOpened = false;
    let tabOpenListener = () => {
      newTabOpened = true;
    };
    gBrowser.tabContainer.addEventListener("TabOpen", tabOpenListener);

    EventUtils.synthesizeKey("t", { accelKey: true }, browser.documentGlobal);

    // Waiting for content to confirm receipt also ensures the keyboard IPC
    // reply has been processed by chrome (it is enqueued before this spawn's
    // completion message reaches the parent).
    let keyReceived = await SpecialPowers.spawn(browser, [], async () => {
      const { ContentTaskUtils } = ChromeUtils.importESModule(
        "resource://testing-common/ContentTaskUtils.sys.mjs"
      );
      await ContentTaskUtils.waitForCondition(
        () => content.window.reservedKeyReceived !== null,
        "Waiting for Ctrl+T to reach content"
      );
      return content.window.reservedKeyReceived;
    });

    await TestUtils.waitForTick();
    gBrowser.tabContainer.removeEventListener("TabOpen", tabOpenListener);

    is(keyReceived, "t", "Ctrl+T keydown was dispatched to content");
    ok(
      !newTabOpened,
      "Ctrl+T with keyboard lock and preventDefault() did not open a new tab"
    );
    is(
      gBrowser.tabs.length,
      initialTabCount,
      "Tab count unchanged after Ctrl+T prevented by content"
    );

    await SpecialPowers.spawn(browser, [], () => {
      content.window.reservedKeyReceived = null;
      content.addEventListener(
        "keydown",
        e => {
          content.window.reservedKeyReceived = e.key;
          e.preventDefault();
        },
        { once: true }
      );
    });

    let initialWindowCount = BrowserWindowTracker.orderedWindows.length;
    let newWindowOpened = false;
    let windowOpenListener = () => {
      newWindowOpened = true;
    };
    Services.obs.addObserver(windowOpenListener, "domwindowopened");

    EventUtils.synthesizeKey("n", { accelKey: true }, browser.documentGlobal);

    keyReceived = await SpecialPowers.spawn(browser, [], async () => {
      const { ContentTaskUtils } = ChromeUtils.importESModule(
        "resource://testing-common/ContentTaskUtils.sys.mjs"
      );
      await ContentTaskUtils.waitForCondition(
        () => content.window.reservedKeyReceived !== null,
        "Waiting for Ctrl+N to reach content"
      );
      return content.window.reservedKeyReceived;
    });

    await TestUtils.waitForTick();
    Services.obs.removeObserver(windowOpenListener, "domwindowopened");

    is(keyReceived, "n", "Ctrl+N keydown was dispatched to content");
    ok(
      !newWindowOpened,
      "Ctrl+N with keyboard lock and preventDefault() did not open a new window"
    );
    is(
      BrowserWindowTracker.orderedWindows.length,
      initialWindowCount,
      "Window count unchanged after Ctrl+N prevented by content"
    );

    let fullScreenExited = BrowserTestUtils.waitForEvent(
      document,
      "fullscreenchange",
      false,
      () => !document.fullscreenElement
    );
    await SpecialPowers.spawn(browser, [], () =>
      content.document.exitFullscreen()
    );
    await fullScreenExited;
  });
});

/**
 * With keyboard lock
 * - ctrl+T should reach the web content
 * And because web content does not e.preventDefault()
 * - with ctrl+T produces a new tab
 */
add_task(async function test_reserved_shortcuts_not_prevented_by_content() {
  await BrowserTestUtils.withNewTab("https://example.com", async browser => {
    await DOMFullscreenTestUtils.changeFullscreen(browser, true, {
      keyboardLock: "browser",
    });

    await SpecialPowers.spawn(browser, [], () => {
      content.window.reservedKeyReceived = null;
      content.addEventListener(
        "keydown",
        e => {
          content.window.reservedKeyReceived = e.key;
        },
        { once: true }
      );
    });

    let fullScreenExited = BrowserTestUtils.waitForEvent(
      document,
      "fullscreenchange",
      false,
      () => !document.fullscreenElement
    );

    // No prevent default, should give us an opened tab
    let tabOpened = BrowserTestUtils.waitForEvent(
      gBrowser.tabContainer,
      "TabOpen"
    );

    EventUtils.synthesizeKey("t", { accelKey: true }, browser.documentGlobal);
    let newTab = (await tabOpened).target;
    await fullScreenExited;

    let keyReceived = await SpecialPowers.spawn(browser, [], () => {
      return content.window.reservedKeyReceived;
    });

    is(keyReceived, "t", "Ctrl+T keydown was dispatched to content");
    ok(newTab, "Ctrl+T without preventDefault() still opened a new tab");

    await BrowserTestUtils.removeTab(newTab);
  });
});

/**
 * The platform's exit-fullscreen shortcut must remain unconditionally reserved
 * even with keyboard lock active — it must exit fullscreen immediately and must
 * NOT be dispatched to content.
 * On macOS the shortcut is Cmd+Ctrl+F; on other platforms it is F11.
 */
add_task(async function test_fullscreen_exit_key_is_unconditionally_reserved() {
  const { AppConstants } = ChromeUtils.importESModule(
    "resource://gre/modules/AppConstants.sys.mjs"
  );
  const isMac = AppConstants.platform === "macosx";

  await BrowserTestUtils.withNewTab("https://example.com", async browser => {
    await DOMFullscreenTestUtils.changeFullscreen(browser, true, {
      keyboardLock: "browser",
    });

    await SpecialPowers.spawn(browser, [isMac], mac => {
      content.window.exitKeyReceived = false;
      content.addEventListener(
        "keydown",
        e => {
          e.preventDefault();
          const key = mac ? e.key === "f" || e.key === "F" : e.key === "F11";
          if (key) {
            content.window.exitKeyReceived = true;
          }
        },
        { once: true }
      );
    });

    let fullScreenExited = BrowserTestUtils.waitForEvent(
      document,
      "fullscreenchange",
      false,
      () => !document.fullscreenElement
    );

    if (isMac) {
      EventUtils.synthesizeKey(
        "f",
        { accelKey: true, ctrlKey: true },
        browser.documentGlobal
      );
    } else {
      EventUtils.synthesizeKey("KEY_F11", {}, browser.documentGlobal);
    }
    await fullScreenExited;
    await TestUtils.waitForTick();

    let exitKeyReceived = await SpecialPowers.spawn(browser, [], () => {
      return content.window.exitKeyReceived;
    });

    ok(
      !exitKeyReceived,
      "Fullscreen exit shortcut was not dispatched to content (it is unconditionally reserved)"
    );
  });
});

/**
 * Without keyboard lock, reserved shortcuts execute their default action
 * without being dispatched to content first.
 * ctrl+t should have no effect, but also it should not be seen by content.
 */
add_task(async function test_reserved_shortcuts_without_keyboard_lock() {
  await BrowserTestUtils.withNewTab("https://example.com", async browser => {
    await DOMFullscreenTestUtils.changeFullscreen(browser, true, {
      keyboardLock: "none",
    });

    await SpecialPowers.spawn(browser, [], () => {
      content.window.reservedKeyReceived = false;
      content.addEventListener(
        "keydown",
        e => {
          e.preventDefault();
          if (e.key === "t") {
            content.window.reservedKeyReceived = true;
          }
        },
        { once: true }
      );
    });

    let fullScreenExited = BrowserTestUtils.waitForEvent(
      document,
      "fullscreenchange",
      false,
      () => !document.fullscreenElement
    );

    let tabOpened = BrowserTestUtils.waitForEvent(
      gBrowser.tabContainer,
      "TabOpen"
    );
    EventUtils.synthesizeKey("t", { accelKey: true }, browser.documentGlobal);
    let newTab = (await tabOpened).target;
    await fullScreenExited;
    await TestUtils.waitForTick();

    let keyReceived = await SpecialPowers.spawn(browser, [], () => {
      return content.window.reservedKeyReceived;
    });

    ok(newTab, "Ctrl+T without keyboard lock opened a new tab");
    ok(
      !keyReceived,
      "Ctrl+T without keyboard lock was not dispatched to content"
    );
    await BrowserTestUtils.removeTab(newTab);
  });
});
