/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
"use strict";

// Verifies that nsCocoaWindow::EnsureFrameIsOnScreen relocates a top-level
// window onto the main screen when its native frame ends up entirely
// off-screen between hide and show.
add_task(async function ensure_frame_is_on_screen() {
  const win = await BrowserTestUtils.openNewBrowserWindow({});

  // CheckSecurityLeftAndTop is a no-op for system callers, and
  // nsCocoaWindow::Move doesn't constrain, so this moveTo lands the NSWindow
  // frame at coordinates that don't intersect any attached screen.
  win.moveTo(-100000, -100000);

  const baseWindow = win.docShell.treeOwner.QueryInterface(Ci.nsIBaseWindow);

  // Hide and reshow. The reshow goes through nsCocoaWindow::Show, which is
  // where EnsureFrameIsOnScreen runs for top-level windows.
  baseWindow.visibility = false;
  baseWindow.visibility = true;

  await new Promise(resolve =>
    win.requestAnimationFrame(() => win.requestAnimationFrame(resolve))
  );

  const screenManager = Cc["@mozilla.org/gfx/screenmanager;1"].getService(
    Ci.nsIScreenManager
  );
  const primary = screenManager.primaryScreen;
  const sx = {},
    sy = {},
    sw = {},
    sh = {};
  primary.GetAvailRectDisplayPix(sx, sy, sw, sh);
  const screenLeft = sx.value;
  const screenTop = sy.value;
  const screenRight = screenLeft + sw.value;
  const screenBottom = screenTop + sh.value;

  const winLeft = win.screenX;
  const winTop = win.screenY;
  const winRight = winLeft + win.outerWidth;
  const winBottom = winTop + win.outerHeight;

  ok(
    winRight > screenLeft && winLeft < screenRight,
    `Window x range [${winLeft}, ${winRight}] should overlap primary screen ` +
      `x range [${screenLeft}, ${screenRight}]`
  );
  ok(
    winBottom > screenTop && winTop < screenBottom,
    `Window y range [${winTop}, ${winBottom}] should overlap primary screen ` +
      `y range [${screenTop}, ${screenBottom}]`
  );

  await BrowserTestUtils.closeWindow(win);
});
