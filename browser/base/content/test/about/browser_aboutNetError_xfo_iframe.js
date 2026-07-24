/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const BLOCKED_PAGE =
  // eslint-disable-next-line @microsoft/sdl/no-insecure-url
  "http://example.org:8000/browser/browser/base/content/test/about/xfo_iframe.sjs";

add_task(async function test_csp() {
  let iFramePage =
    getRootDirectory(gTestPath).replace(
      "chrome://mochitests/content",
      // eslint-disable-next-line @microsoft/sdl/no-insecure-url
      "http://example.com"
    ) + "iframe_page_xfo.html";

  // Opening the page that contains the iframe
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  let browser = tab.linkedBrowser;
  let browserLoaded = BrowserTestUtils.browserLoaded(
    browser,
    true,
    BLOCKED_PAGE,
    true
  );

  BrowserTestUtils.startLoadingURIString(browser, iFramePage);
  await browserLoaded;
  info("The error page has loaded!");

  await SpecialPowers.spawn(browser, [], async function () {
    let iframe = content.document.getElementById("theIframe");

    await ContentTaskUtils.waitForCondition(() =>
      SpecialPowers.spawn(
        iframe,
        [],
        () =>
          content.document.body.classList.contains("neterror") ||
          content.document.body.classList.contains("felt-privacy-body") ||
          content.document.querySelector("net-error-card")
      )
    );
  });

  let iframe = browser.browsingContext.children[0];

  // In the iframe, we see the correct error page
  await SpecialPowers.spawn(iframe, [], async function () {
    let doc = content.document;

    let textLongDescription;
    let learnMoreLinkLocation;

    const netErrorCard = doc.querySelector("net-error-card");
    if (netErrorCard) {
      const card = netErrorCard.wrappedJSObject;
      await card.getUpdateComplete();

      const contentElement = card.whatCanYouDo || card.netErrorIntro;
      if (contentElement) {
        await ContentTaskUtils.waitForCondition(() => {
          return !!contentElement.textContent.trim().length;
        });
        textLongDescription = contentElement.textContent;
      }

      const learnMoreLink = card.netErrorLearnMoreLink || card.learnMoreLink;
      if (learnMoreLink) {
        learnMoreLinkLocation = learnMoreLink.href;
      }

      if (!textLongDescription) {
        // Fall back to legacy path
        const errorLongDesc = await ContentTaskUtils.waitForCondition(
          () => doc.getElementById("errorLongDesc"),
          "Waiting for errorLongDesc"
        );
        await ContentTaskUtils.waitForCondition(() => {
          return !!errorLongDesc.textContent.trim().length;
        });
        textLongDescription = errorLongDesc.textContent;
      }

      if (!learnMoreLinkLocation) {
        // Try fallback to legacy path, but it may not exist for all error types
        const link = doc.getElementById("learnMoreLink");
        if (link) {
          learnMoreLinkLocation = link.href;
        }
      }
    } else {
      const errorLongDesc = await ContentTaskUtils.waitForCondition(
        () => doc.getElementById("errorLongDesc"),
        "Waiting for errorLongDesc"
      );
      await ContentTaskUtils.waitForCondition(() => {
        return !!errorLongDesc.textContent.trim().length;
      });
      textLongDescription = errorLongDesc.textContent;

      const learnMoreLink = await ContentTaskUtils.waitForCondition(
        () => doc.getElementById("learnMoreLink"),
        "Waiting for learnMoreLink"
      );
      learnMoreLinkLocation = learnMoreLink.href;
    }

    Assert.ok(
      textLongDescription.includes(
        "To see this page, you need to open it in a new window."
      ),
      "Correct error message found"
    );

    if (learnMoreLinkLocation) {
      Assert.ok(
        learnMoreLinkLocation.includes("xframe-neterror-page"),
        "Correct Learn More URL for XFO error page"
      );
    }
  });

  BrowserTestUtils.removeTab(tab);
});
