"use strict";

// This test makes sure that a policy container & content security policy is initialized for frontend created documents
// see bug https://bugzilla.mozilla.org/show_bug.cgi?id=2002654
add_task(async function test_policy_container_and_csp_in_about_blank() {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );
  try {
    await ContentTask.spawn(tab.linkedBrowser, null, function () {
      let meta = content.document.createElement("meta");
      meta.httpEquiv = "Content-Security-Policy";
      meta.content = "script-src 'none'";
      content.document.head.appendChild(meta);
      Assert.ok(
        (() => {
          try {
            content.window.eval("1 + 1");
            return false;
          } catch (ex) {
            return true;
          }
        })(),
        "CSP set for frontend created document"
      );
    });
  } finally {
    BrowserTestUtils.removeTab(tab);
  }
});
