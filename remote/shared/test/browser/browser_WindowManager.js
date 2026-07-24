/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { windowManager } = ChromeUtils.importESModule(
  "chrome://remote/content/shared/WindowManager.sys.mjs"
);
const { WindowState } = ChromeUtils.importESModule(
  "chrome://remote/content/shared/WindowManager.sys.mjs"
);

const { AppInfo } = ChromeUtils.importESModule(
  "chrome://remote/content/shared/AppInfo.sys.mjs"
);

add_task(async function test_adjustWindowGeometry() {
  const testWin = await BrowserTestUtils.openNewBrowserWindow();
  const isWayland = AppInfo.isWayland;

  try {
    await windowManager.adjustWindowGeometry(testWin, 100, 100, 800, 600);
    is(testWin.outerWidth, 800, "Window width is set to initial value");
    is(testWin.outerHeight, 600, "Window height is set to initial value");

    if (!isWayland) {
      is(testWin.screenX, 100, "Window x position is set to initial value");
      is(testWin.screenY, 100, "Window y position is set to initial value");
    }

    await windowManager.adjustWindowGeometry(testWin, null, null, 640, 480);
    is(testWin.outerWidth, 640, "Window width is updated");
    is(testWin.outerHeight, 480, "Window height is updated");

    if (!isWayland) {
      is(testWin.screenX, 100, "Window x position stays at initial value");
      is(testWin.screenY, 100, "Window y position stays at initial value");
    }

    await windowManager.adjustWindowGeometry(testWin, 200, 200, null, null);
    if (!isWayland) {
      is(testWin.screenX, 200, "Window x position is updated");
      is(testWin.screenY, 200, "Window y position is updated");
    }
    is(testWin.outerWidth, 640, "Window width stays at previous value");
    is(testWin.outerHeight, 480, "Window height stays at previous value");

    await windowManager.adjustWindowGeometry(testWin, 200, 200, 560, 450);
    is(testWin.outerWidth, 560, "Window width is updated");
    is(testWin.outerHeight, 450, "Window height is updated");
    if (!isWayland) {
      is(testWin.screenX, 200, "Window x position is updated");
      is(testWin.screenY, 200, "Window y position is updated");
    }
  } finally {
    await BrowserTestUtils.closeWindow(testWin);
  }
});

add_task(async function test_adjustWindowGeometry_invalid_values() {
  const testWin = await BrowserTestUtils.openNewBrowserWindow();
  const isWayland = AppInfo.isWayland;

  const originalWidth = testWin.outerWidth;
  const originalHeight = testWin.outerHeight;
  const originalX = testWin.screenX;
  const originalY = testWin.screenY; // codespell:ignore

  let minWidth, minHeight;

  try {
    await windowManager.adjustWindowGeometry(testWin, 100, 100, 50, 50);
    minWidth = testWin.outerWidth;
    minHeight = testWin.outerHeight;

    await windowManager.adjustWindowGeometry(
      testWin,
      originalWidth,
      originalHeight,
      originalX,
      originalY // codespell:ignore
    );

    await windowManager.adjustWindowGeometry(testWin, 100, 100, 100, 100);
    is(testWin.outerWidth, minWidth, "Width is set to minimum allowed width");
    is(
      testWin.outerHeight,
      minHeight,
      "Height is set to minimum allowed height"
    );
    if (!isWayland) {
      is(testWin.screenX, 100, "Window x-coordinate is adjusted");
      is(testWin.screenY, 100, "Window y-coordinate is adjusted");
    }

    await windowManager.adjustWindowGeometry(testWin, 100, 100, 600.5, 300.7);
    is(testWin.outerWidth, 600, "Decimal width is floored");
    is(testWin.outerHeight, 300, "Decimal height is floored");
    if (!isWayland) {
      is(testWin.screenX, 100, "Window x-coordinate is adjusted");
      is(testWin.screenY, 100, "Window y-coordinate is adjusted");
    }
  } finally {
    await BrowserTestUtils.closeWindow(testWin);
  }
});

add_task(async function test_minimizeWindow() {
  const testWin = await BrowserTestUtils.openNewBrowserWindow();

  try {
    await windowManager.adjustWindowGeometry(testWin, 100, 100, 800, 600);
    is(testWin.outerWidth, 800, "Window width is set to initial value");
    is(testWin.outerHeight, 600, "Window height is set to initial value");

    is(
      WindowState.from(testWin.windowState),
      WindowState.Normal,
      "Window is initially in normal state"
    );

    await windowManager.minimizeWindow(testWin);

    is(
      WindowState.from(testWin.windowState),
      WindowState.Minimized,
      "Window is minimized"
    );

    await windowManager.minimizeWindow(testWin);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Minimized,
      "Minimizing an already minimized window has no effect"
    );
  } finally {
    await BrowserTestUtils.closeWindow(testWin);
  }
});

add_task(async function test_maximizeWindow() {
  const testWin = await BrowserTestUtils.openNewBrowserWindow();

  try {
    await windowManager.adjustWindowGeometry(testWin, 100, 100, 800, 600);
    is(testWin.outerWidth, 800, "Window width is set to initial value");
    is(testWin.outerHeight, 600, "Window height is set to initial value");

    is(
      WindowState.from(testWin.windowState),
      WindowState.Normal,
      "Window is initially in normal state"
    );

    await windowManager.maximizeWindow(testWin);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Maximized,
      "Window is maximized"
    );

    await windowManager.maximizeWindow(testWin);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Maximized,
      "Maximizing an already maximized window has no effect"
    );
  } finally {
    await BrowserTestUtils.closeWindow(testWin);
  }
});

add_task(async function test_restoreWindow() {
  const testWin = await BrowserTestUtils.openNewBrowserWindow();

  try {
    await windowManager.maximizeWindow(testWin);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Maximized,
      "Window is maximized"
    );

    await windowManager.restoreWindow(testWin);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Normal,
      "Window is restored to normal state"
    );

    await windowManager.restoreWindow(testWin);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Normal,
      "Restoring an already normal window has no effect"
    );
  } finally {
    await BrowserTestUtils.closeWindow(testWin);
  }
});

add_task(async function test_setFullscreen() {
  const testWin = await BrowserTestUtils.openNewBrowserWindow();

  try {
    await windowManager.adjustWindowGeometry(testWin, 100, 100, 800, 600);
    is(testWin.outerWidth, 800, "Window width is set to initial value");
    is(testWin.outerHeight, 600, "Window height is set to initial value");
    is(
      WindowState.from(testWin.windowState),
      WindowState.Normal,
      "Window is initially in normal state"
    );

    await windowManager.setFullscreen(testWin, true);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Fullscreen,
      "Window entered fullscreen mode"
    );

    await windowManager.setFullscreen(testWin, true);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Fullscreen,
      "Setting fullscreen when already in fullscreen mode has no effect"
    );

    await windowManager.setFullscreen(testWin, false);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Normal,
      "Window exited fullscreen mode and returned to normal state"
    );

    await windowManager.setFullscreen(testWin, false);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Normal,
      "Exiting fullscreen when already in normal state has no effect"
    );
  } finally {
    await BrowserTestUtils.closeWindow(testWin);
  }
});

add_task(async function test_windows() {
  const win1 = await BrowserTestUtils.openNewBrowserWindow();
  const win2 = await BrowserTestUtils.openNewBrowserWindow();
  const win3 = await BrowserTestUtils.openNewBrowserWindow();

  const expectedWindows = [gBrowser.ownerGlobal, win1, win2, win3];

  try {
    is(
      windowManager.windows.length,
      5,
      "All browser windows and the Mochikit harness window were returned"
    );
    ok(
      expectedWindows.every(win => windowManager.windows.includes(win)),
      "Expected windows were returned"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win3);
    await BrowserTestUtils.closeWindow(win2);
    await BrowserTestUtils.closeWindow(win1);
  }
});

add_task(async function test_getIdForWindow() {
  const win1 = await BrowserTestUtils.openNewBrowserWindow();
  const win2 = await BrowserTestUtils.openNewBrowserWindow();

  try {
    windowManager.startTracking();

    const win1Id = windowManager.getIdForWindow(win1);
    Assert.stringMatches(
      win1Id,
      uuidRegex,
      "The first window id is a valid UUID"
    );
    is(
      windowManager.getIdForWindow(win1),
      win1Id,
      "getIdForWindow returns the same id when called multiple times for the same window"
    );

    const win2Id = windowManager.getIdForWindow(win2);
    Assert.stringMatches(
      win2Id,
      uuidRegex,
      "The second window id is a valid UUID"
    );
    isnot(
      win1Id,
      win2Id,
      "getIdForWindow returns different ids for different windows"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win2);
    await BrowserTestUtils.closeWindow(win1);

    windowManager.destroy();
  }
});

add_task(async function test_getWindowById() {
  windowManager.startTracking();
  const win = await BrowserTestUtils.openNewBrowserWindow();

  try {
    const winId = windowManager.getIdForWindow(win);
    is(
      windowManager.getWindowById(winId),
      win,
      "getWindowById returns the correct window for a valid id"
    );
    is(
      windowManager.getWindowById("non-existent-id"),
      undefined,
      "getWindowById returns undefined for a non-existent id"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);

    windowManager.destroy();
  }
});

add_task(async function test_waitForChromeWindowLoaded_newBrowserWindow() {
  const win = Services.ww.openWindow(
    null,
    AppConstants.BROWSER_CHROME_URL,
    "_blank",
    "chrome,all,dialog=no",
    null
  );

  try {
    ok(
      !win.gBrowserInit?.delayedStartupFinished,
      "Browser window not finished delayed startup"
    );

    await windowManager.waitForChromeWindowLoaded(win);

    ok(
      win.gBrowserInit.delayedStartupFinished,
      "Browser window finished delayed startup"
    );
    is(
      win.document.readyState,
      "complete",
      "Window document is in complete state"
    );
    ok(
      !win.document.isUncommittedInitialDocument,
      "Window document is not an uncommitted initial document"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
  }
});

add_task(async function test_waitForChromeWindowLoaded_alreadyLoadedWindow() {
  const win = await BrowserTestUtils.openNewBrowserWindow();

  try {
    ok(
      win.gBrowserInit.delayedStartupFinished,
      "Browser window is already fully loaded"
    );

    await windowManager.waitForChromeWindowLoaded(win);

    is(
      win.document.readyState,
      "complete",
      "Window document is in complete state"
    );
    ok(
      !win.document.isUncommittedInitialDocument,
      "Window document is not an uncommitted initial document"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
  }
});

add_task(
  async function test_waitForChromeWindowLoaded_nonBrowserChromeWindow() {
    const win = Services.ww.openWindow(
      gBrowser.ownerGlobal,
      "chrome://browser/content/pageinfo/pageInfo.xhtml",
      "_blank",
      "chrome,dialog=no,all",
      null
    );

    try {
      await windowManager.waitForChromeWindowLoaded(win);

      isnot(
        win.document.documentURI,
        AppConstants.BROWSER_CHROME_URL,
        "Window is not a browser window"
      );
      is(
        win.document.readyState,
        "complete",
        "Window document is in complete state"
      );
      ok(
        !win.document.isUncommittedInitialDocument,
        "Window document is not an uncommitted initial document"
      );
    } finally {
      await BrowserTestUtils.closeWindow(win);
    }
  }
);
