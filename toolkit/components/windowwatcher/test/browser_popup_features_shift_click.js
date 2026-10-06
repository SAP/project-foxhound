"use strict";

/**
 * Verifies that a modifier key (Shift) held during a click that triggers
 * window.open with popup features does not downgrade the popup to a full
 * browser window. Regression test for bug 2042925.
 */
add_task(async function shift_click_popup_features_opens_minimal_popup() {
  const PAGE = `data:text/html,<button id="b" style="width:200px;height:80px">click</button><script>
    document.getElementById("b").addEventListener("click", function() {
      window.open("data:text/plain,hi", "", "width=400,height=300,resizable=1,scrollbars=1");
    });
  </script>`;

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: PAGE },
    async function (browser) {
      const newWinPromise = BrowserTestUtils.waitForNewWindow();
      await BrowserTestUtils.synthesizeMouseAtCenter(
        "#b",
        { shiftKey: true },
        browser
      );
      const win = await newWinPromise;

      const flags = getParentChromeFlags(win);
      Assert.ok(
        !(flags & Ci.nsIWebBrowserChrome.CHROME_TOOLBAR),
        "CHROME_TOOLBAR should not be set on a Shift+click popup"
      );
      Assert.ok(
        !(flags & Ci.nsIWebBrowserChrome.CHROME_MENUBAR),
        "CHROME_MENUBAR should not be set on a Shift+click popup"
      );
      Assert.ok(
        !(flags & Ci.nsIWebBrowserChrome.CHROME_PERSONAL_TOOLBAR),
        "CHROME_PERSONAL_TOOLBAR should not be set on a Shift+click popup"
      );

      await BrowserTestUtils.closeWindow(win);
    }
  );
});
