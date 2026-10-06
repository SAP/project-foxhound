/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

function waitForBlockedDataURIWarning() {
  return new Promise(resolve => {
    Services.console.registerListener(function onConsoleMessage(msg) {
      if (!(msg instanceof Ci.nsIScriptError)) {
        return;
      }

      if (msg.category != "DATA_URI_BLOCKED") {
        return;
      }

      Services.console.unregisterListener(onConsoleMessage);
      resolve();
    });
  });
}

// The old view-image subtests used data:text/html as image/background sources.
// With top-level data: navigations blocked, those no longer test useful image
// context-menu behavior; data:image view-image coverage lives in contextMenu
// tests. Keep the remaining data: frame context-menu path here.
add_task(async function test_show_only_this_frame_data_uri_is_blocked() {
  await SpecialPowers.pushPrefEnv({
    set: [["security.data_uri.block_toplevel_data_uri_navigations", true]],
  });

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "http://mochi.test:8888/"
  );

  try {
    let writeDomainURL = encodeURI(
      "data:text/html,<script>parent.postMessage(document.domain, '*');</script>"
    );

    let iframeDomain = await SpecialPowers.spawn(
      tab.linkedBrowser,
      [writeDomainURL],
      async function (dataURL) {
        let doc = content.document;
        let iframe = doc.createElement("iframe");
        iframe.style.width = "100px";
        iframe.style.height = "100px";
        let receivedDomain;

        function onMessage(event) {
          if (event.source === iframe.contentWindow) {
            receivedDomain = event.data;
          }
        }

        content.addEventListener("message", onMessage, { capture: true });
        try {
          let iframeLoaded = new Promise(resolve => {
            iframe.addEventListener("load", resolve, { once: true });
          });

          iframe.setAttribute("src", dataURL);
          doc.body.insertBefore(iframe, doc.body.firstElementChild);
          await iframeLoaded;
          await ContentTaskUtils.waitForCondition(
            () => receivedDomain !== undefined,
            "data: URI iframe posted its document.domain"
          );
          return receivedDomain;
        } finally {
          content.removeEventListener("message", onMessage, { capture: true });
        }
      }
    );

    is(iframeDomain, "", "no domain was inherited for data: URI iframe");

    let contentAreaContextMenu = document.getElementById(
      "contentAreaContextMenu"
    );
    let popupShownPromise = BrowserTestUtils.waitForEvent(
      contentAreaContextMenu,
      "popupshown"
    );

    await new Promise(resolve => {
      SimpleTest.executeSoon(resolve);
    });

    while (true) {
      try {
        await BrowserTestUtils.synthesizeMouse(
          "html",
          3,
          3,
          { type: "contextmenu", button: 2 },
          tab.linkedBrowser.browsingContext.children[0]
        );
      } catch (ex) {
        continue;
      }
      break;
    }

    await popupShownPromise;

    let subMenu = document.getElementById("frame");
    let subMenuShown = BrowserTestUtils.waitForEvent(subMenu, "popupshown");
    subMenu.openMenu(true);
    await subMenuShown;

    let originalURI = tab.linkedBrowser.currentURI.spec;
    let warningPromise = waitForBlockedDataURIWarning();
    let popupHiddenPromise = BrowserTestUtils.waitForEvent(
      contentAreaContextMenu,
      "popuphidden"
    );
    contentAreaContextMenu.activateItem(
      document.getElementById("context-showonlythisframe")
    );
    await popupHiddenPromise;
    await warningPromise;

    is(
      tab.linkedBrowser.currentURI.spec,
      originalURI,
      "Show Only This Frame does not navigate top-level to a data: URI"
    );
  } finally {
    await BrowserTestUtils.removeTab(tab);
  }
});
