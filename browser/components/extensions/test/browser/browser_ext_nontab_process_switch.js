"use strict";

const gSeenWindowGlobals = [];

add_setup(function setup_window_global_parent_observer() {
  const observer = wgp => {
    const browser = wgp.rootFrameLoader?.ownerElement;
    if (!browser?.hasAttribute("webextension-view-type")) {
      // We don't care about non-extension browsers.
      return;
    }

    let desc = {
      url: wgp.documentURI?.spec,
      osPid: wgp.osPid,
      // Summarize identifying attributes instead of dumping browser.outerHTML:
      id: browser.id,
      className: browser.className,
      viewType: browser.getAttribute("webextension-view-type"),
      currentRemoteType: wgp.browsingContext.currentRemoteType,
      initialBCGId: +browser.getAttribute("initialBrowsingContextGroupId"),
      // ^ The initial browsingContextGroupId ID is set to the extension's for
      // which the `<browser>` was created. It may change upon navigation to
      // non-extension content. We don't care about the current BCG ID, but if
      // we do, wgp.browsingContext.group.id would have to be checked.
    };

    info(`Observed WindowGlobalParent: ${uneval(desc)}}`);
    gSeenWindowGlobals.push(desc);
  };
  Services.obs.addObserver(observer, "window-global-created");
  registerCleanupFunction(() => {
    Services.obs.removeObserver(observer, "window-global-created");
  });
});

// Every extension <browser> for a given extension is associated with the
// same initialBrowsingContextGroupId. To avoid intermittent failures due to
// loads from other random extensions in the test, filter by their BCG ID.
function filterSeenWindowGlobals(seenWindowGlobals, extBcgId) {
  const res = seenWindowGlobals.filter(desc => desc.initialBCGId === extBcgId);
  info(`Found ${res.length} window globals for BCG ID ${extBcgId}`);
  return res;
}

function getExtBcgId(extension) {
  return WebExtensionPolicy.getByID(extension.id).browsingContextGroupId;
}

add_task(async function process_switch_in_sidebars_popups() {
  await SpecialPowers.pushPrefEnv({
    set: [["extensions.content_web_accessible.enabled", true]],
  });

  let extension = ExtensionTestUtils.loadExtension({
    useAddonManager: "temporary", // To automatically show sidebar on load.
    manifest: {
      content_scripts: [
        {
          matches: ["http://example.com/*"],
          js: ["cs.js"],
        },
      ],

      sidebar_action: {
        default_panel: "page.html?sidebar",
      },
      browser_action: {
        default_popup: "page.html?popup",
        default_area: "navbar",
      },
      web_accessible_resources: ["page.html"],
    },
    files: {
      "page.html": `<!DOCTYPE html><meta charset=utf-8><script src=page.js></script>`,
      async "page.js"() {
        browser.test.sendMessage("extension_page", {
          place: location.search,
          pid: await SpecialPowers.spawnChrome([], () => {
            return windowGlobalParent.osPid;
          }),
        });
        if (!location.search.endsWith("_back")) {
          window.location.href = "http://example.com/" + location.search;
        }
      },

      async "cs.js"() {
        browser.test.sendMessage("content_script", {
          url: location.href,
          pid: await this.wrappedJSObject.SpecialPowers.spawnChrome([], () => {
            return windowGlobalParent.osPid;
          }),
        });
        if (location.search === "?popup") {
          window.location.href =
            browser.runtime.getURL("page.html") + "?popup_back";
        }
      },
    },
  });

  // Make sure the mouse isn't hovering over the browserAction widget, to
  // ensure that we don't unexpectedly observe preloaded popups.
  EventUtils.synthesizeMouseAtCenter(gURLBar, { type: "mouseover" }, window);

  // Through this test task, we actively monitor window globals and processes
  // associated with extension <browser>s. The observations (available in
  // gSeenWindowGlobals) may contain entries from unrelated extensions, which
  // is why we use filterSeenWindowGlobals through the test to extract
  // observations for the specific extension that we are going to start now.

  await extension.startup();

  const extBcgId = getExtBcgId(extension);

  let sidebar = await extension.awaitMessage("extension_page");
  is(sidebar.place, "?sidebar", "Message from the extension sidebar");
  const extPid = sidebar.pid;

  let cs1 = await extension.awaitMessage("content_script");
  is(cs1.url, "http://example.com/?sidebar", "CS on example.com in sidebar");
  isnot(sidebar.pid, cs1.pid, "Navigating to example.com changed process");

  const commonDescriptionSidebar = {
    id: "webext-panels-browser",
    className: "",
    viewType: "sidebar",
    initialBCGId: extBcgId,
  };
  SimpleTest.isDeeply(
    filterSeenWindowGlobals(gSeenWindowGlobals, extBcgId),
    [
      {
        url: "about:blank",
        osPid: extPid,
        currentRemoteType: "extension",
        ...commonDescriptionSidebar,
      },
      {
        url: `moz-extension://${extension.uuid}/page.html?sidebar`,
        osPid: extPid,
        currentRemoteType: "extension",
        ...commonDescriptionSidebar,
      },
      {
        url: "about:blank",
        osPid: cs1.pid,
        currentRemoteType: "webIsolated=http://example.com",
        ...commonDescriptionSidebar,
      },
      {
        url: "http://example.com/?sidebar",
        osPid: cs1.pid,
        currentRemoteType: "webIsolated=http://example.com",
        ...commonDescriptionSidebar,
      },
    ],
    "Seen expected window globals for sidebar"
  );

  gSeenWindowGlobals.length = 0;
  // ^ cleared after verifying expectations so far. Now we are going to monitor
  // globals and processes for the popup, as a regression test for bug 1987679.

  await clickBrowserAction(extension);
  let popup = await extension.awaitMessage("extension_page");
  is(popup.place, "?popup", "Message from the extension popup");

  let cs2 = await extension.awaitMessage("content_script");
  is(cs2.url, "http://example.com/?popup", "CS on example.com in popup");
  isnot(popup.pid, cs2.pid, "Navigating to example.com changed process");

  let popup2 = await extension.awaitMessage("extension_page");
  is(popup2.place, "?popup_back", "Back at extension page in popup");
  is(popup.pid, popup2.pid, "Same process as original popup page");

  is(sidebar.pid, popup.pid, "Sidebar and popup pages from the same process");

  // There's no guarantee that two (independent) pages from the same domain will
  // end up in the same process.

  await closeBrowserAction(extension);
  await extension.unload();

  // This is a regression test for bug 1987679: We used to spawn an unexpected
  // process because we forced the initialization of <browser> where we did not
  // have to. Verify that we only see two window globals for each load, the
  // initial about:blank followed by the requested URL (no more, no less!).
  // In particular, we should NOT observe loads in unexpected processes.
  const commonDescriptionPopup = {
    id: "",
    className: "webextension-popup-browser",
    viewType: "popup",
    initialBCGId: extBcgId,
  };
  let expectedInitialClassName =
    "webextension-popup-browser webextension-preload-browser";
  const seenForPopup = filterSeenWindowGlobals(gSeenWindowGlobals, extBcgId);
  if (
    seenForPopup[1].url === "about:blank" &&
    seenForPopup[2].url.endsWith("/page.html?popup")
  ) {
    // The preloaded browser and the real browser are loaded in parallel. The
    // very first browser is always about:blank of the preloaded browser, from
    // the BasePopup constructor:
    // https://searchfox.org/firefox-main/rev/08a5a0de94770126c13dceb661fee2edbdff0329/browser/components/extensions/ExtensionPopups.sys.mjs#78
    //
    // The moz-extension popup page is expected to be loaded in that browser,
    // but it is also possible for the load to happen in the second browser, if
    // the initialization of the first browser did not complete before the
    // second one is created at:
    // https://searchfox.org/firefox-main/rev/08a5a0de94770126c13dceb661fee2edbdff0329/browser/components/extensions/ExtensionPopups.sys.mjs#647
    //
    // In that case, the observation is as follows:
    // - expectation: [about:blank, page.html, about:blank, ...]
    // - alternative: [about:blank, about:blank, page.html, ...]
    //   with page.html in the second browser instead of the preloaded one.
    // Swap the order in the alternative observation to match the expected
    // order for the isDeeply check below.
    const seenPreloadedAboutBlank = seenForPopup[1];
    const seenExtensionPopupPage = seenForPopup[2];
    seenForPopup[1] = seenExtensionPopupPage;
    seenForPopup[2] = seenPreloadedAboutBlank;
    if (seenExtensionPopupPage.className === commonDescriptionPopup.className) {
      expectedInitialClassName = commonDescriptionPopup.className;
      info("Changed expectation: popup loads in non-preloaded browser");
    } else {
      info("Changed expectation: popup loads after non-preloaded browser");
    }
  }
  SimpleTest.isDeeply(
    seenForPopup,
    [
      {
        url: "about:blank",
        osPid: extPid,
        currentRemoteType: "extension",
        ...commonDescriptionPopup,
        // Although the very first browser is considered to be preloaded, the
        // "webextension-preload-browser" class name is only added after full
        // load, so when we see the initial about:blank, the class name is
        // still at the default instead of `expectedInitialClassName`.
      },
      {
        url: `moz-extension://${extension.uuid}/page.html?popup`,
        osPid: extPid,
        currentRemoteType: "extension",
        ...commonDescriptionPopup,
        // The very first popup browser is considered to be preloaded.
        className: expectedInitialClassName,
      },
      {
        // When the extension popup is shown (attached), we start loading the
        // actual content in the preloaded popup (above), then insert a new
        // <browser> and swap their docshells:
        // https://searchfox.org/firefox-main/rev/bfd4da6a49ff07f278d197ff67f3c3be36876c1c/browser/components/extensions/ExtensionPopups.sys.mjs#645-649.
        // This temporary <browser> includes an about:blank load.
        url: "about:blank",
        osPid: extPid,
        currentRemoteType: "extension",
        ...commonDescriptionPopup,
      },
      {
        url: "about:blank",
        osPid: cs2.pid,
        currentRemoteType: "webIsolated=http://example.com",
        ...commonDescriptionPopup,
      },
      {
        url: "http://example.com/?popup",
        osPid: cs2.pid,
        currentRemoteType: "webIsolated=http://example.com",
        ...commonDescriptionPopup,
      },
      {
        url: "about:blank",
        osPid: extPid,
        currentRemoteType: "extension",
        ...commonDescriptionPopup,
      },
      {
        url: `moz-extension://${extension.uuid}/page.html?popup_back`,
        osPid: extPid,
        currentRemoteType: "extension",
        ...commonDescriptionPopup,
      },
    ],
    "Seen expected window globals for popup"
  );
  gSeenWindowGlobals.length = 0;
});

// Test that navigating the browserAction popup between extension pages doesn't keep the
// parser blocked (See Bug 1747813).
add_task(
  async function test_navigate_browserActionPopups_shouldnot_block_parser() {
    let extension = ExtensionTestUtils.loadExtension({
      manifest: {
        browser_action: {
          default_popup: "popup-1.html",
          default_area: "navbar",
        },
      },
      files: {
        "popup-1.html": `<!DOCTYPE html><meta charset=utf-8><script src=popup-1.js></script><h1>Popup 1</h1>`,
        "popup-2.html": `<!DOCTYPE html><meta charset=utf-8><script src=popup-2.js></script><h1>Popup 2</h1>`,

        "popup-1.js": function () {
          browser.test.onMessage.addListener(msg => {
            if (msg !== "navigate-popup") {
              browser.test.fail(`Unexpected test message "${msg}"`);
              return;
            }
            location.href = "/popup-2.html";
          });
          window.onload = () => browser.test.sendMessage("popup-page-1");
        },

        "popup-2.js": function () {
          window.onload = () => browser.test.sendMessage("popup-page-2");
        },
      },
    });

    // Make sure the mouse isn't hovering over the browserAction widget.
    EventUtils.synthesizeMouseAtCenter(gURLBar, { type: "mouseover" }, window);

    await extension.startup();

    // Triggers popup preload (otherwise we wouldn't be blocking the parser for the browserAction popup
    // and the issue wouldn't be triggered, a real user on the contrary has a pretty high chance to trigger a
    // preload while hovering the browserAction popup before opening the popup with a click).
    let widget = getBrowserActionWidget(extension).forWindow(window);
    EventUtils.synthesizeMouseAtCenter(
      widget.node,
      { type: "mouseover" },
      window
    );
    await clickBrowserAction(extension);

    await extension.awaitMessage("popup-page-1");

    extension.sendMessage("navigate-popup");

    await extension.awaitMessage("popup-page-2");
    // If the bug is triggered (e.g. it did regress), the test will get stuck waiting for
    // the test message "popup-page-2" (which will never be sent because the extension page
    // script isn't executed while the parser is blocked).
    ok(
      true,
      "Extension browserAction popup successfully navigated to popup-page-2.html"
    );

    await closeBrowserAction(extension);
    await extension.unload();
  }
);
