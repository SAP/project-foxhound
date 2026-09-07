"use strict";

// Tests that web content can suppress the Ctrl+F5 hard reload shortcut by
// calling preventDefault() on the keydown event. See bug 2001938.

add_task(async function ctrl_f5_reloads_without_prevent_default() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "data:text/html,<p>no handler</p>" },
    async browser => {
      await SimpleTest.promiseFocus(browser);
      let loadPromise = BrowserTestUtils.browserLoaded(browser);
      EventUtils.synthesizeKey("KEY_F5", { ctrlKey: true });
      await loadPromise;
      ok(
        true,
        "Ctrl+F5 should reload the page when content does not call preventDefault()"
      );
    }
  );
});

add_task(async function ctrl_f5_does_not_reload_when_prevented() {
  const url =
    "data:text/html,<p>with handler</p>" +
    "<script>window.addEventListener('keydown', e => { if (e.key === 'F5') e.preventDefault(); });</script>";

  await BrowserTestUtils.withNewTab({ gBrowser, url }, async browser => {
    await SimpleTest.promiseFocus(browser);

    let reloaded = false;
    BrowserTestUtils.browserLoaded(browser).then(() => {
      reloaded = true;
    });

    EventUtils.synthesizeKey("KEY_F5", { ctrlKey: true });

    // Wait briefly to confirm no reload occurs.
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 1500));
    ok(
      !reloaded,
      "Ctrl+F5 should not reload the page when content calls preventDefault()"
    );
  });
});
