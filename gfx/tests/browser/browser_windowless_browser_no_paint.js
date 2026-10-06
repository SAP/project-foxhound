/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { HiddenBrowserManager } = ChromeUtils.importESModule(
  "resource://gre/modules/HiddenFrame.sys.mjs"
);

add_task(async function test_windowless_browser_child_does_not_paint() {
  await HiddenBrowserManager.withHiddenBrowser(async browser => {
    // Make sure the child docshell is active so its refresh driver actually
    // ticks; otherwise PaintAndRequestComposite would early-return on
    // !mIsActive.
    // This is what extension's browser window does.
    // https://searchfox.org/firefox-main/rev/c983b985e46aec342a237711939a1ede99aef937/toolkit/components/extensions/ExtensionParent.sys.mjs#1477,1501-1503
    // The manualactiveness attribute is required before manually managing
    // activeness; otherwise CanonicalBrowsingContext::SetIsActive asserts.
    browser.setAttribute("manualactiveness", "true");
    browser.docShellIsActive = true;

    const loaded = BrowserTestUtils.browserLoaded(browser);
    browser.loadURI(
      Services.io.newURI("data:text/html,<body style='background:red'>hi"),
      {
        triggeringPrincipal:
          Services.scriptSecurityManager.getSystemPrincipal(),
      }
    );
    await loaded;

    const { layerManagerType, paintCount } = await SpecialPowers.spawn(
      browser,
      [],
      async () => {
        // Give the refresh driver a few ticks of opportunity to do paint
        // work. With FallbackRenderer there is none to do.
        for (let i = 0; i < 5; ++i) {
          await new Promise(r => content.requestAnimationFrame(r));
        }
        const wu = content.windowUtils;
        return {
          layerManagerType: wu.layerManagerType,
          paintCount: Number(wu.paintCount),
        };
      }
    );

    is(
      layerManagerType,
      "Fallback",
      "child content document of a windowless browser must use FallbackRenderer"
    );
    is(
      paintCount,
      0,
      "child content document of a windowless browser must never paint"
    );
  });
});
