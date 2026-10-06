/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

"use strict";

async function runForZoomLevel(tab, zoom) {
  const [dpr, scale] = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [zoom],
    async zoom => {
      const img = content.document.getElementById("srcset");

      const { Layout } = ChromeUtils.importESModule(
        "chrome://mochitests/content/browser/accessible/tests/browser/Layout.sys.mjs"
      );
      Layout.zoomDocument(content.document, zoom);

      // The zoom change might trigger a new load. Be sure it is complete
      // before checking the scale.
      await new Promise(resolve => {
        img.addEventListener("error", resolve, { once: true });
        if (img.complete) {
          resolve();
        }
      });

      // Workaround: content.devicePixelRatio has the unspoofed value.
      const dpr = content.wrappedJSObject.devicePixelRatio;
      const current = img.currentSrc;
      const scale =
        current.substring(current.length - 6, current.length - 4) / 10;
      return [dpr, scale];
    }
  );

  is(
    Math.abs(dpr - scale) < 0.1,
    true,
    `Image scale (${scale}) is within DPR (${dpr})`
  );
}

add_task(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.resistFingerprinting", true]],
  });

  const testPage =
    getRootDirectory(gTestPath).replace(
      "chrome://mochitests/content",
      "https://example.com"
    ) + "srcset.html";
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testPage);

  for (let zoom = 0.3; zoom < 2.09; zoom += 0.1) {
    await runForZoomLevel(tab, zoom);
  }

  BrowserTestUtils.removeTab(tab);
});
