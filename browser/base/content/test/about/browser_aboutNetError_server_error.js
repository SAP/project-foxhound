/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const HTTP_ERROR_PAGE =
  "https://example.com/browser/browser/base/content/test/about/http_error.sjs";
const SERVER_ERROR_PAGE =
  "https://example.com/browser/browser/base/content/test/about/server_error.sjs";

add_task(async function test_serverError() {
  let browser;
  let pageLoaded;
  await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    () => {
      gBrowser.selectedTab = BrowserTestUtils.addTab(
        gBrowser,
        SERVER_ERROR_PAGE
      );
      browser = gBrowser.selectedBrowser;
      pageLoaded = BrowserTestUtils.waitForErrorPage(browser);
    },
    false
  );

  info("Loading and waiting for the net error");
  await pageLoaded;

  await SpecialPowers.spawn(browser, [], async function () {
    const doc = content.document;
    ok(
      doc.documentURI.startsWith("about:neterror"),
      "Should be showing error page"
    );

    let titleEl;
    let actualDataL10nID;

    const netErrorCard = doc.querySelector("net-error-card");
    if (netErrorCard) {
      const card = netErrorCard.wrappedJSObject;
      await card.getUpdateComplete();

      titleEl = card.errorTitle;

      const introEl = card.shadowRoot.getElementById("error-intro");
      is(
        introEl?.getAttribute("data-l10n-id"),
        "fp-neterror-http-error-intro",
        "Intro element has correct l10n id"
      );
      const introArgs = JSON.parse(introEl?.getAttribute("data-l10n-args"));
      ok(introArgs?.hostname, "Intro has hostname arg");
      is(introArgs?.responsestatus, 500, "Intro has responsestatus 500");
      is(
        introArgs?.responsestatustext,
        "Internal Server Error",
        "Intro has correct responsestatustext"
      );
    } else {
      titleEl = doc.querySelector(".title-text");

      const responseStatusLabel = await ContentTaskUtils.waitForCondition(
        () => doc.getElementById("response-status-label"),
        "Waiting for response-status-label"
      );
      is(
        responseStatusLabel.textContent,
        "Error code: 500 Internal Server Error",
        "Correct response status message is set"
      );
    }

    actualDataL10nID = titleEl.getAttribute("data-l10n-id");
    is(
      actualDataL10nID,
      "problem-with-this-site-title",
      "Correct error page title is set"
    );
  });

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function test_httpErrorPage_what_can_you_do_list() {
  let browser;
  let pageLoaded;
  await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    () => {
      gBrowser.selectedTab = BrowserTestUtils.addTab(gBrowser, HTTP_ERROR_PAGE);
      browser = gBrowser.selectedBrowser;
      pageLoaded = BrowserTestUtils.waitForErrorPage(browser);
    },
    false
  );

  info("Loading and waiting for the net error");
  await pageLoaded;

  await SpecialPowers.spawn(browser, [], async function () {
    const doc = content.document;
    ok(
      doc.documentURI.startsWith("about:neterror"),
      "Should be showing error page"
    );

    const netErrorCard = doc.querySelector("net-error-card");
    if (!netErrorCard) {
      return;
    }

    const card = netErrorCard.wrappedJSObject;
    await card.getUpdateComplete();

    const whatCanYouDoList = netErrorCard.shadowRoot.querySelector(
      ".what-can-you-do-list"
    );
    Assert.ok(whatCanYouDoList, "The what-can-you-do list is present");
    const items = whatCanYouDoList.querySelectorAll("li");
    Assert.equal(items.length, 2, "Two what-can-you-do items are present");
    Assert.equal(
      items[0].dataset.l10nId,
      "neterror-http-error-page",
      "First item has correct l10n ID"
    );
    Assert.equal(
      items[1].dataset.l10nId,
      "neterror-load-error-try-again",
      "Second item has correct l10n ID"
    );
  });

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
