/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_connectionFailure_error_page_elements() {
  const { browser, tab } = await loadNetErrorPage(
    "connectionFailure",
    "127.0.0.1"
  );

  await SpecialPowers.spawn(browser, [], async function () {
    await ContentTaskUtils.waitForCondition(
      () => content?.document?.querySelector("net-error-card"),
      "Wait for net-error-card to render"
    );
    const doc = content.document;
    const netErrorCard = doc.querySelector("net-error-card").wrappedJSObject;
    await netErrorCard.getUpdateComplete();

    Assert.equal(
      netErrorCard.errorTitle.dataset.l10nId,
      "connectionFailure-title",
      "Using the connectionFailure title"
    );
    Assert.equal(
      netErrorCard.errorIntro.dataset.l10nId,
      "fp-neterror-offline-intro",
      "Using the connectionFailure intro"
    );
    const list = netErrorCard.renderRoot.querySelector(".what-can-you-do-list");
    Assert.ok(list, "NetErrorCard has what-can-you-do list");
    Assert.ok(
      list.querySelector('[data-l10n-id="neterror-load-error-try-again"]'),
      "List includes try-again item"
    );
    Assert.ok(
      list.querySelector('[data-l10n-id="neterror-load-error-connection"]'),
      "List includes connection item"
    );
    Assert.ok(
      list.querySelector('[data-l10n-id="neterror-load-error-firewall"]'),
      "List includes firewall item"
    );
    Assert.ok(
      ContentTaskUtils.isVisible(netErrorCard.tryAgainButton),
      "The 'Try Again' button is shown"
    );
    Assert.ok(
      !netErrorCard.renderRoot.querySelector(
        '[data-l10n-id="fp-cert-error-code"]'
      ),
      "No error code is shown for connectionFailure"
    );
  });

  BrowserTestUtils.removeTab(tab);
});
