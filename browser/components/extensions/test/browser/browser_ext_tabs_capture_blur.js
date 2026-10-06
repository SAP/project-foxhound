/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_capture_internal_page_blurred() {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:addons"
  );

  let extension = ExtensionTestUtils.loadExtension({
    manifest: { permissions: ["<all_urls>"] },
    async background() {
      async function assertBlurred(dataURL, label) {
        browser.test.assertTrue(
          dataURL.startsWith("data:image/png;"),
          `${label} returns PNG by default (blurred)`
        );
        let img = new Image();
        img.src = dataURL;
        await img.decode();
        browser.test.assertTrue(
          img.width <= 300,
          `${label}: width ${img.width} is at most 300`
        );
        browser.test.assertTrue(
          img.height <= 300,
          `${label}: height ${img.height} is at most 300`
        );
      }

      await assertBlurred(
        await browser.tabs.captureVisibleTab(),
        "captureVisibleTab"
      );

      let [activeTab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      await assertBlurred(
        await browser.tabs.captureTab(activeTab.id),
        "captureTab"
      );

      browser.test.sendMessage("done");
    },
  });

  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
  BrowserTestUtils.removeTab(tab);
});

add_task(
  async function test_captureVisibleTab_internal_page_rect_returns_placeholder() {
    let tab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      "about:addons"
    );

    let extension = ExtensionTestUtils.loadExtension({
      manifest: { permissions: ["<all_urls>"] },
      async background() {
        const rect = { x: 0, y: 0, width: 100, height: 100 };

        let png = await browser.tabs.captureVisibleTab({ rect });
        browser.test.assertTrue(
          png.startsWith("data:image/png;"),
          "Internal page rect capture returns PNG placeholder by default"
        );
        let pngImg = new Image();
        pngImg.src = png;
        await pngImg.decode();
        browser.test.assertEq(1, pngImg.width, "PNG placeholder is 1px wide");
        browser.test.assertEq(1, pngImg.height, "PNG placeholder is 1px tall");

        let jpeg = await browser.tabs.captureVisibleTab({
          format: "jpeg",
          rect,
        });
        browser.test.assertTrue(
          jpeg.startsWith("data:image/jpeg;"),
          "Internal page rect capture returns JPEG placeholder when format=jpeg"
        );
        let jpegImg = new Image();
        jpegImg.src = jpeg;
        await jpegImg.decode();
        browser.test.assertEq(1, jpegImg.width, "JPEG placeholder is 1px wide");
        browser.test.assertEq(
          1,
          jpegImg.height,
          "JPEG placeholder is 1px tall"
        );

        browser.test.sendMessage("done");
      },
    });

    await extension.startup();
    await extension.awaitMessage("done");
    await extension.unload();
    BrowserTestUtils.removeTab(tab);
  }
);

// We have a "normal" page test in test_ext_tabs_captureTab.html.
add_task(async function test_captureVisibleTab_null_principal_full_quality() {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "data:text/html,<body style='background:green'>test</body>"
  );

  let extension = ExtensionTestUtils.loadExtension({
    manifest: { permissions: ["<all_urls>"] },
    async background() {
      let dataURL = await browser.tabs.captureVisibleTab();

      browser.test.assertTrue(
        dataURL.startsWith("data:image/png;"),
        "Null principal page capture returns PNG (full quality path active)"
      );

      let img = new Image();
      img.src = dataURL;
      await img.decode();

      browser.test.assertTrue(
        img.width > 300 || img.height > 300,
        `Normal page capture (${img.width}x${img.height}) is not blurred`
      );

      browser.test.sendMessage("done");
    },
  });

  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
  BrowserTestUtils.removeTab(tab);
});
