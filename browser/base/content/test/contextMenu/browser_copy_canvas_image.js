/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["test.wait300msAfterTabSwitch", true]],
  });
});

// Adapted from widget/tests/file_test_clipboard_pngPreservesTransparency.js
async function getPNGFromClipboard(clipboard) {
  let trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(
    Ci.nsITransferable
  );
  trans.init(null);
  trans.addDataFlavor("image/png");
  clipboard.getData(
    trans,
    Ci.nsIClipboard.kGlobalClipboard,
    SpecialPowers.wrap(window).browsingContext.currentWindowContext
  );
  let obj = SpecialPowers.createBlankObject();
  trans.getTransferData("image/png", obj);
  let rawStream = obj.value.QueryInterface(Ci.nsIInputStream);

  let stream = Cc["@mozilla.org/binaryinputstream;1"].createInstance();
  stream.QueryInterface(Ci.nsIBinaryInputStream);

  stream.setInputStream(rawStream);

  let size = stream.available();
  let data = new ArrayBuffer(size);
  stream.readArrayBuffer(size, data);

  let decoder = new ImageDecoder({ type: "image/png", data });
  let { image } = await decoder.decode();
  return image;
}

add_task(async function test_copy_canvas_image() {
  const PAGE = `data:text/html;charset=utf-8,
    <canvas id="c" width="100" height="100"></canvas>
    <script>
      let ctx = document.getElementById("c").getContext("2d");
      ctx.fillStyle = "red";
      ctx.fillRect(0, 0, 100, 100);
    </script>`;

  await BrowserTestUtils.withNewTab(PAGE, async browser => {
    let menu = document.getElementById("contentAreaContextMenu");
    let popupShown = BrowserTestUtils.waitForEvent(menu, "popupshown");

    BrowserTestUtils.synthesizeMouseAtCenter(
      "canvas",
      { type: "contextmenu", button: 2 },
      browser
    );
    await popupShown;

    let copyItem = menu.querySelector("#context-copyimage-contents");
    ok(!copyItem.hidden, "Copy Image should be visible for canvas");
    ok(!copyItem.disabled, "Copy Image should be enabled for canvas");

    SpecialPowers.clipboardCopyString("clear");
    menu.activateItem(copyItem);

    await TestUtils.waitForCondition(() => {
      try {
        return Services.clipboard.hasDataMatchingFlavors(
          ["application/x-moz-nativeimage", "image/png"],
          Services.clipboard.kGlobalClipboard
        );
      } catch {
        return false;
      }
    }, "Waiting for image data on clipboard");

    let pngData = await getPNGFromClipboard(Services.clipboard);
    ok(pngData, "Should have image data on clipboard");

    is(pngData.displayWidth, 100, "Image width should be 100");
    is(pngData.displayHeight, 100, "Image height should be 100");
  });
});
