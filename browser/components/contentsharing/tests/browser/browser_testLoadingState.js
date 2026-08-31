/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_loadingStateWhileCreatingLink() {
  await withContentSharingMockServer(async server => {
    let tabs = [
      BrowserTestUtils.addTab(gBrowser, "https://example.com"),
      BrowserTestUtils.addTab(gBrowser, "https://example.com?1"),
    ];

    await Promise.all(
      tabs.map(async tab => {
        await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
      })
    );

    const releaseResponsePromise = server.blockNextResponse();

    const sharePromise = ContentSharingUtils.handleShareTabs(tabs);

    await TestUtils.waitForCondition(() => window.gDialogBox.isOpen);
    const modalEl = await TestUtils.waitForCondition(() =>
      window.gDialogBox.dialog.frameContentWindow.document.querySelector(
        "content-sharing-modal"
      )
    );
    await TestUtils.waitForCondition(() => BrowserTestUtils.isVisible(modalEl));
    await TestUtils.waitForCondition(() => modalEl.getUpdateComplete);
    await modalEl.getUpdateComplete();

    Assert.ok(
      BrowserTestUtils.isVisible(modalEl.loadingButton),
      "Loading button is visible while API call is in progress"
    );
    Assert.ok(
      !modalEl.copyButton,
      "Copy button is not rendered during loading"
    );
    Assert.ok(
      !modalEl.signInButton,
      "Sign in button is not rendered during loading"
    );
    Assert.ok(
      !modalEl.errorMessageBar,
      "Error message bar is not rendered during loading"
    );

    const releaseResponse = await releaseResponsePromise;
    releaseResponse();

    await sharePromise;
    await TestUtils.waitForCondition(
      () => !modalEl.shareResult?.loadingPromise
    );
    await TestUtils.waitForCondition(() => modalEl.getUpdateComplete);
    await modalEl.getUpdateComplete();

    Assert.ok(
      BrowserTestUtils.isVisible(modalEl.copyButton),
      "Copy button is visible after loading completes"
    );
    Assert.ok(
      !modalEl.loadingButton,
      "Loading button is not rendered after loading completes"
    );

    window.gDialogBox.dialog.close();
    gBrowser.removeTabs(tabs);
  });
});
