/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

Services.scriptloader.loadSubScript(
  "chrome://mochikit/content/tests/SimpleTest/paint_listener.js",
  this
);

// Cleanup for paint_listener.js.
add_task(() => {
  registerCleanupFunction(() => {
    delete window.waitForAllPaintsFlushed;
    delete window.waitForAllPaints;
    delete window.promiseAllPaintsDone;
  });
});

const PAGE_WIDTH = 800;
const PAGE_HEIGHT = 800;

add_task(async function test_webrender_layer_compositor_overlay() {
  await SpecialPowers.pushPrefEnv({
    set: [["gfx.webrender.layer-compositor", true]],
  });

  let win = await BrowserTestUtils.openNewBrowserWindow();

  try {
    win.resizeTo(PAGE_WIDTH, PAGE_HEIGHT);

    let tab = await BrowserTestUtils.openNewForegroundTab(
      win.gBrowser,
      "data:text/html,<canvas id='c' style='width:100%; height:100%;'></canvas>"
    );

    await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
      const canvas = content.document.getElementById("c");
      const gl = canvas.getContext("webgl");
      ok(!!gl, "got WebGL context");

      gl.clearColor(0, 1, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.flush();

      await new Promise(r => content.requestAnimationFrame(r));
    });

    await new Promise(resolve => {
      window.waitForAllPaintsFlushed(resolve);
    });

    const canvas2d = document.createElement("canvas");
    canvas2d.setAttribute("width", PAGE_WIDTH + "px");
    canvas2d.setAttribute("height", PAGE_HEIGHT + "px");

    const ctx = canvas2d.getContext("2d");
    document.body.appendChild(canvas2d);

    var flags =
      ctx.DRAWWINDOW_DRAW_CARET |
      ctx.DRAWWINDOW_DRAW_VIEW |
      ctx.DRAWWINDOW_USE_WIDGET_LAYERS;
    ctx.drawWindow(
      win,
      0,
      0,
      PAGE_WIDTH,
      PAGE_HEIGHT,
      "rgb(255,255,255)",
      flags
    );

    var data = ctx.getImageData(PAGE_WIDTH / 2, PAGE_HEIGHT / 2, 1, 1);

    is(data.data[0], 0, "red channel matches");
    is(data.data[1], 255, "green channel matches");
    is(data.data[2], 0, "blue channel matches");
  } finally {
    await BrowserTestUtils.closeWindow(win);
  }

  await SpecialPowers.popPrefEnv();
});
