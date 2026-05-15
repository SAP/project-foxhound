add_task(async function test_windowlessBrowserTroubleshootCrash() {
  let webNav = Services.appShell.createWindowlessBrowser(false);

  let loadURIOptions = {
    triggeringPrincipal: Services.scriptSecurityManager.createNullPrincipal({}),
  };

  // will synchronously commit to the initial about:blank and finish the load
  webNav.loadURI(Services.io.newURI("about:blank"), loadURIOptions);

  is(webNav.document.location.href, "about:blank", "location is about:blank");
  is(webNav.document.readyState, "complete", "readyState is complete");

  let winUtils = webNav.document.defaultView.windowUtils;
  try {
    let layerManager = winUtils.layerManagerType;
    ok(
      ["WebRender (Software)", "Fallback"].includes(layerManager),
      "windowless browser's layerManagerType should be 'WebRender (Software)' or 'Fallback': " +
        layerManager
    );
  } catch (e) {
    // The windowless browser may not have a layermanager at all yet, and that's ok.
    // The troubleshooting code similarly skips over windows with no layer managers.
  }
  ok(true, "not crashed");

  var { Troubleshoot } = ChromeUtils.importESModule(
    "resource://gre/modules/Troubleshoot.sys.mjs"
  );
  var data = await Troubleshoot.snapshot();

  Assert.notStrictEqual(
    data.graphics.windowLayerManagerType,
    "None",
    "windowless browser window should not set windowLayerManagerType to 'None'"
  );

  webNav.close();
});
