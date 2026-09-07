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

const isWayland = AppInfo.isWayland;

// Bug 2037084: Apple Virtualization Framework VMs (macosx1500-aarch64-vms) have
// no display attached, so window operations that depend on a real desktop don't
// behave the same as on bare-metal hardware.
const isMacosVm = (() => {
  try {
    const modelId = Services.sysinfo.getProperty("appleModelId");
    return !!modelId && modelId.startsWith("VirtualMac");
  } catch (e) {
    return false;
  }
})();

async function setInitialWindowRect(win) {
  const rect = await windowManager.adjustWindowGeometry(
    win,
    200,
    100,
    800,
    600
  );

  is(
    WindowState.from(win.windowState),
    WindowState.Normal,
    "Window is initially in normal state"
  );

  is(rect.width, 800, "Window width is set to initial value");
  is(rect.height, 600, "Window height is set to initial value");
  if (!isWayland) {
    is(rect.x, 200, "Window x position is set to initial value");
    is(rect.y, 100, "Window y position is set to initial value");
  }

  return rect;
}

add_task(async function test_adjustWindowGeometry() {
  const testWin = await BrowserTestUtils.openNewBrowserWindow();

  try {
    const originalRect = await setInitialWindowRect(testWin);

    // Resize the window only.
    const resizedRect = await windowManager.adjustWindowGeometry(
      testWin,
      null,
      null,
      640,
      480
    );

    if (!isWayland) {
      is(resizedRect.x, originalRect.x, "Window x position is not updated");
      is(resizedRect.y, originalRect.y, "Window y position is not updated");
    }
    is(resizedRect.width, 640, "Window width is updated");
    is(resizedRect.height, 480, "Window height is updated");

    // Re-positioning the window only.
    let movedRect = await windowManager.adjustWindowGeometry(
      testWin,
      300,
      150,
      null,
      null
    );

    if (!isWayland) {
      is(movedRect.x, 300, "Window x position is updated");
      is(movedRect.y, 150, "Window y position is updated");
    }
    is(
      movedRect.width,
      resizedRect.width,
      "Window width stays at previous value"
    );
    is(
      movedRect.height,
      resizedRect.height,
      "Window height stays at previous value"
    );

    // Re-positioning and resizing the window.
    const resizedAndMovedRect = await windowManager.adjustWindowGeometry(
      testWin,
      150,
      120,
      560,
      450
    );

    if (!isWayland) {
      is(resizedAndMovedRect.x, 150, "Window x position is updated");
      is(resizedAndMovedRect.y, 120, "Window y position is updated");
    }
    is(resizedAndMovedRect.width, 560, "Window width is updated");
    is(resizedAndMovedRect.height, 450, "Window height is updated");
  } finally {
    await BrowserTestUtils.closeWindow(testWin);
  }
});

add_task(async function test_adjustWindowGeometry_minimumDimensions() {
  const testWin = await BrowserTestUtils.openNewBrowserWindow();

  try {
    const originalRect = await windowManager.getWindowRect(testWin);

    // Determine the minimal dimensions of the window.
    const minimalRect = await windowManager.adjustWindowGeometry(
      testWin,
      null,
      null,
      50,
      50
    );

    // Restore original window size.
    await windowManager.adjustWindowGeometry(
      testWin,
      null,
      null,
      originalRect.width,
      originalRect.height
    );

    // Resize exactly to the minimum dimension.
    const resizedRect = await windowManager.adjustWindowGeometry(
      testWin,
      null,
      null,
      minimalRect.width,
      minimalRect.height
    );

    is(
      resizedRect.width,
      minimalRect.width,
      "Width is set to minimum allowed width"
    );
    is(
      resizedRect.height,
      minimalRect.height,
      "Height is set to minimum allowed height"
    );
  } finally {
    await BrowserTestUtils.closeWindow(testWin);
  }
});

add_task(async function test_adjustWindowGeometry_floatValues() {
  const testWin = await BrowserTestUtils.openNewBrowserWindow();

  try {
    const resizedRect = await windowManager.adjustWindowGeometry(
      testWin,
      200.3,
      100.6,
      850.5,
      650.7
    );

    if (!isWayland) {
      is(resizedRect.x, 200, "Decimal x is floored");
      is(resizedRect.y, 100, "Decimal y is floored");
    }
    is(resizedRect.width, 850, "Decimal width is floored");
    is(resizedRect.height, 650, "Decimal height is floored");
  } finally {
    await BrowserTestUtils.closeWindow(testWin);
  }
});

add_task({ skip_if: () => isMacosVm }, async function test_fullscreenWindow() {
  const testWin = await BrowserTestUtils.openNewBrowserWindow();

  try {
    const originalRect = await setInitialWindowRect(testWin);

    const fullscreenRect = await windowManager.fullscreenWindow(testWin);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Fullscreen,
      "Window entered fullscreen mode"
    );
    Assert.less(
      fullscreenRect.x,
      originalRect.x,
      "Window was moved left on the screen"
    );
    Assert.less(
      fullscreenRect.y,
      originalRect.y,
      "Window was moved up on the screen"
    );
    Assert.greater(
      fullscreenRect.width,
      originalRect.width,
      "Window width has increased"
    );
    Assert.greater(
      fullscreenRect.height,
      originalRect.height,
      "Window height has increased"
    );

    const fullscreenNoOpRect = await windowManager.fullscreenWindow(testWin);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Fullscreen,
      "State doesn't change when fullscreen the window twice"
    );
    is(
      fullscreenNoOpRect.x,
      fullscreenRect.x,
      "Window was not moved horizontally"
    );
    is(
      fullscreenNoOpRect.y,
      fullscreenRect.y,
      "Window was not moved vertically"
    );
    is(
      fullscreenNoOpRect.width,
      fullscreenRect.width,
      "Window width has not changed"
    );
    is(
      fullscreenNoOpRect.height,
      fullscreenRect.height,
      "Window height has not changed"
    );

    const restoredRect = await windowManager.restoreWindow(testWin);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Normal,
      "Window is set to normal state"
    );
    is(restoredRect.x, originalRect.x, "Original x position was restored");
    is(restoredRect.y, originalRect.y, "Original y position was restored");
    is(restoredRect.width, originalRect.width, "Original width was restored");
    is(
      restoredRect.height,
      originalRect.height,
      "Original height was restored"
    );
  } finally {
    await BrowserTestUtils.closeWindow(testWin);
  }
});

add_task(async function test_getWindowRect() {
  const testWin = await BrowserTestUtils.openNewBrowserWindow();

  try {
    const rect = windowManager.getWindowRect(testWin);

    ok(rect, "getWindowRect returns a rect object");
    ok("x" in rect, "Rect has x property");
    ok("y" in rect, "Rect has y property");
    ok("width" in rect, "Rect has width property");
    ok("height" in rect, "Rect has height property");

    is(rect.x, testWin.screenX, "Rect x matches window screenX");
    is(rect.y, testWin.screenY, "Rect y matches window screenY");
    is(rect.width, testWin.outerWidth, "Rect width matches window outerWidth");
    is(
      rect.height,
      testWin.outerHeight,
      "Rect height matches window outerHeight"
    );
  } finally {
    await BrowserTestUtils.closeWindow(testWin);
  }
});

add_task(async function test_getWindowRect_afterMove() {
  const testWin = await BrowserTestUtils.openNewBrowserWindow();

  try {
    const initialRect = await setInitialWindowRect(testWin);

    await windowManager.adjustWindowGeometry(testWin, 300, 150, null, null);

    const movedRect = windowManager.getWindowRect(testWin);

    if (!isWayland) {
      is(movedRect.x, 300, "Position x updated after move");
      is(movedRect.y, 150, "Position y updated after move");
    }
    is(movedRect.width, initialRect.width, "Width unchanged after move only");
    is(
      movedRect.height,
      initialRect.height,
      "Height unchanged after move only"
    );
  } finally {
    await BrowserTestUtils.closeWindow(testWin);
  }
});

add_task(async function test_getWindowRect_afterResize() {
  const testWin = await BrowserTestUtils.openNewBrowserWindow();

  try {
    const initialRect = await setInitialWindowRect(testWin);

    await windowManager.adjustWindowGeometry(testWin, null, null, 640, 480);

    const resizedRect = windowManager.getWindowRect(testWin);

    is(resizedRect.width, 640, "Width updated after resize");
    is(resizedRect.height, 480, "Height updated after resize");

    if (!isWayland) {
      is(
        resizedRect.x,
        initialRect.x,
        "Position x unchanged after resize only"
      );
      is(
        resizedRect.y,
        initialRect.y,
        "Position y unchanged after resize only"
      );
    }
  } finally {
    await BrowserTestUtils.closeWindow(testWin);
  }
});

add_task(async function test_getWindowRect_differentStates() {
  const testWin = await BrowserTestUtils.openNewBrowserWindow();

  try {
    const originalRect = await setInitialWindowRect(testWin);

    const maximizedRect = await windowManager.maximizeWindow(testWin);
    const maximizedGetRect = windowManager.getWindowRect(testWin);

    is(maximizedGetRect.x, maximizedRect.x, "Maximized x matches");
    is(maximizedGetRect.y, maximizedRect.y, "Maximized y matches");
    is(maximizedGetRect.width, maximizedRect.width, "Maximized width matches");
    is(
      maximizedGetRect.height,
      maximizedRect.height,
      "Maximized height matches"
    );

    await windowManager.restoreWindow(testWin);

    const minimizedRect = await windowManager.minimizeWindow(testWin);
    const minimizedGetRect = windowManager.getWindowRect(testWin);

    is(minimizedGetRect.x, minimizedRect.x, "Minimized x matches");
    is(minimizedGetRect.y, minimizedRect.y, "Minimized y matches");
    is(minimizedGetRect.width, minimizedRect.width, "Minimized width matches");
    is(
      minimizedGetRect.height,
      minimizedRect.height,
      "Minimized height matches"
    );

    await windowManager.restoreWindow(testWin);

    const restoredRect = windowManager.getWindowRect(testWin);

    if (!isWayland) {
      is(restoredRect.x, originalRect.x, "Restored x matches original");
      is(restoredRect.y, originalRect.y, "Restored y matches original");
    }
    is(
      restoredRect.width,
      originalRect.width,
      "Restored width matches original"
    );
    is(
      restoredRect.height,
      originalRect.height,
      "Restored height matches original"
    );
  } finally {
    await BrowserTestUtils.closeWindow(testWin);
  }
});

add_task(async function test_maximizeWindow() {
  const testWin = await BrowserTestUtils.openNewBrowserWindow();

  try {
    const originalRect = await setInitialWindowRect(testWin);

    const maximizedRect = await windowManager.maximizeWindow(testWin);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Maximized,
      "Window entered maximized mode"
    );
    Assert.less(
      maximizedRect.x,
      originalRect.x,
      "Window was moved left on the screen"
    );
    Assert.less(
      maximizedRect.y,
      originalRect.y,
      "Window was moved up on the screen"
    );
    Assert.greater(
      maximizedRect.width,
      originalRect.width,
      "Window width has increased"
    );
    Assert.greater(
      maximizedRect.height,
      originalRect.height,
      "Window height has increased"
    );

    const maximizedNoOpRect = await windowManager.maximizeWindow(testWin);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Maximized,
      "State doesn't change when maximizing the window twice"
    );
    is(
      maximizedNoOpRect.x,
      maximizedRect.x,
      "Window was not moved horizontally"
    );
    is(maximizedNoOpRect.y, maximizedRect.y, "Window was not moved vertically");
    is(
      maximizedNoOpRect.width,
      maximizedRect.width,
      "Window width has not changed"
    );
    is(
      maximizedNoOpRect.height,
      maximizedRect.height,
      "Window height has not changed"
    );

    const restoredRect = await windowManager.restoreWindow(testWin);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Normal,
      "Window is set to normal state"
    );
    is(restoredRect.x, originalRect.x, "Original x position was restored");
    is(restoredRect.y, originalRect.y, "Original y position was restored");
    is(restoredRect.width, originalRect.width, "Original width was restored");
    is(
      restoredRect.height,
      originalRect.height,
      "Original height was restored"
    );
  } finally {
    await BrowserTestUtils.closeWindow(testWin);
  }
});

add_task(async function test_minimizeWindow() {
  const testWin = await BrowserTestUtils.openNewBrowserWindow();

  try {
    const originalRect = await setInitialWindowRect(testWin);

    const minimizedRect = await windowManager.minimizeWindow(testWin);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Minimized,
      "Window entered minimized mode"
    );
    if (AppConstants.platform == "win") {
      // On Windows-only the position is moved outside of the screen and
      // its size shrinks to the dimension of taskbar icons.
      Assert.less(
        minimizedRect.x,
        originalRect.x,
        "Window x position is outside of the screen"
      );
      Assert.less(
        minimizedRect.y,
        originalRect.y,
        "Window y position is outside of the screen"
      );
      Assert.less(
        minimizedRect.width,
        originalRect.width,
        "Window width has been decreased"
      );
      Assert.less(
        minimizedRect.height,
        originalRect.height,
        "Window height has been decreased"
      );
    } else {
      is(minimizedRect.x, originalRect.x, "Window x position has not changed");
      is(minimizedRect.y, originalRect.y, "Window y position has not changed");
      is(
        minimizedRect.width,
        originalRect.width,
        "Window width has not changed"
      );
      is(
        minimizedRect.height,
        originalRect.height,
        "Window height has not changed"
      );
    }

    const minimizedNoOpRect = await windowManager.minimizeWindow(testWin);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Minimized,
      "State doesn't change when minimizing the window twice"
    );
    is(
      minimizedNoOpRect.x,
      minimizedRect.x,
      "Window was not moved horizontally"
    );
    is(minimizedNoOpRect.y, minimizedRect.y, "Window was not moved vertically");
    is(
      minimizedNoOpRect.width,
      minimizedRect.width,
      "Window width has not changed"
    );
    is(
      minimizedNoOpRect.height,
      minimizedRect.height,
      "Window height has not changed"
    );

    const restoredRect = await windowManager.restoreWindow(testWin);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Normal,
      "Window is set to normal state"
    );
    is(restoredRect.x, originalRect.x, "Original x position was restored");
    is(restoredRect.y, originalRect.y, "Original y position was restored");
    is(restoredRect.width, originalRect.width, "Original width was restored");
    is(
      restoredRect.height,
      originalRect.height,
      "Original height was restored"
    );
  } finally {
    await BrowserTestUtils.closeWindow(testWin);
  }
});

add_task(async function test_restoreWindow() {
  const testWin = await BrowserTestUtils.openNewBrowserWindow();

  try {
    const originalRect = await setInitialWindowRect(testWin);

    const maximizedRect = await windowManager.maximizeWindow(testWin);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Maximized,
      "Window entered maximized mode"
    );
    if (!isWayland) {
      Assert.less(
        maximizedRect.x,
        originalRect.x,
        "Window was moved left on the screen"
      );
      Assert.less(
        maximizedRect.y,
        originalRect.y,
        "Window was moved up on the screen"
      );
    }
    Assert.greater(
      maximizedRect.width,
      originalRect.width,
      "Window width has increased"
    );
    Assert.greater(
      maximizedRect.height,
      originalRect.height,
      "Window height has increased"
    );

    const restoredRect = await windowManager.restoreWindow(testWin);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Normal,
      "Window is set to normal state"
    );
    if (!isWayland) {
      is(restoredRect.x, originalRect.x, "Window x position was restored");
      is(restoredRect.y, originalRect.y, "Window y position was restored");
    }
    is(restoredRect.width, originalRect.width, "Window width was restored");
    is(restoredRect.height, originalRect.height, "Window height was restored");

    const restoredNoOpRect = await windowManager.restoreWindow(testWin);
    is(
      WindowState.from(testWin.windowState),
      WindowState.Normal,
      "State doesn't change when restoring the window twice"
    );
    if (!isWayland) {
      is(
        restoredNoOpRect.x,
        restoredRect.x,
        "Window was not moved horizontally"
      );
      is(restoredNoOpRect.y, restoredRect.y, "Window was not moved vertically");
    }
    is(
      restoredNoOpRect.width,
      restoredRect.width,
      "Window width has not changed"
    );
    is(
      restoredNoOpRect.height,
      restoredRect.height,
      "Window height has not changed"
    );
  } finally {
    await BrowserTestUtils.closeWindow(testWin);
  }
});

add_task(async function test_windows() {
  const win1 = await BrowserTestUtils.openNewBrowserWindow();
  const win2 = await BrowserTestUtils.openNewBrowserWindow();
  const win3 = await BrowserTestUtils.openNewBrowserWindow();

  const expectedWindows = [gBrowser.documentGlobal, win1, win2, win3];

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
      gBrowser.documentGlobal,
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
