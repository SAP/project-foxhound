/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

function triggerClickOn(target, options) {
  if (AppConstants.platform == "macosx") {
    options = { metaKey: options.ctrlKey, shiftKey: options.shiftKey };
  }
  let promise = BrowserTestUtils.waitForEvent(target, "click");
  EventUtils.synthesizeMouseAtCenter(target, options);
  return promise;
}

async function openTabContextMenu(tab) {
  info("Opening tab context menu");
  let contextMenu = document.getElementById("tabContextMenu");
  let openTabContextMenuPromise = BrowserTestUtils.waitForPopupEvent(
    contextMenu,
    "shown"
  );
  EventUtils.synthesizeMouseAtCenter(tab, { type: "contextmenu" });
  await openTabContextMenuPromise;
  return contextMenu;
}

async function openShareMenuPopup(contextMenu) {
  info("Opening Share menu popup.");
  let shareItem = contextMenu.querySelector(".share-tab-url-item");
  shareItem.openMenu(true);
  await BrowserTestUtils.waitForPopupEvent(shareItem.menupopup, "shown");
}

function getHTMLClipboard() {
  let xferable = Cc["@mozilla.org/widget/transferable;1"].createInstance(
    Ci.nsITransferable
  );
  xferable.init(null);
  xferable.addDataFlavor("text/html");
  Services.clipboard.getData(xferable, Ci.nsIClipboard.kGlobalClipboard);
  let data = {};
  xferable.getTransferData("text/html", data);
  return data.value?.QueryInterface(Ci.nsISupportsString)?.data ?? "";
}
