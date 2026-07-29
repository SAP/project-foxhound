/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// This test makes sure that the Add exception button only shows up
// when the skipReason indicates that the domain could not be resolved.
// If instead there is a problem with the TRR connection, then we don't
// show the exception button.
add_task(async function exceptionButtonTRROnly() {
  let browser = await loadTRRErrorPage();

  await SpecialPowers.spawn(browser, [], async function () {
    const doc = content.document;
    ok(
      doc.documentURI.startsWith("about:neterror"),
      "Should be showing error page"
    );

    // Bug 2038887: TRR-only DNS failures always use the legacy page now,
    // even with felt-privacy enabled.
    is(
      doc.querySelector("net-error-card"),
      null,
      "net-error-card must NOT be used for TRR-only DNS failures"
    );

    const trrExceptionButton = await ContentTaskUtils.waitForCondition(
      () => doc.getElementById("trrExceptionButton"),
      "Waiting for trrExceptionButton"
    );
    Assert.equal(
      trrExceptionButton.hidden,
      true,
      "Exception button should be hidden for TRR service failures"
    );

    const titleEl = doc.querySelector(".title-text");
    is(
      titleEl.getAttribute("data-l10n-id"),
      "dnsNotFound-title",
      "Correct error page title is set"
    );
  });

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  resetTRRPrefs();
});

// Bug 2038887: even when the felt-privacy error page is enabled, a TRR-only
// DNS failure must fall back to the legacy about:neterror page so that the
// DoH-specific affordances (DoH domain, learn-more link, exclude-domain and
// settings buttons) are still surfaced to the user.
add_task(async function feltPrivacyFallsBackToLegacyForTRRMode3() {
  await SpecialPowers.pushPrefEnv({
    set: [["security.certerrors.felt-privacy-v1", true]],
  });

  let browser = await loadTRRErrorPage();

  await SpecialPowers.spawn(browser, [], async function () {
    const doc = content.document;
    ok(
      doc.documentURI.startsWith("about:neterror"),
      "Should be showing error page"
    );

    const trrSettingsButton = await ContentTaskUtils.waitForCondition(
      () => doc.getElementById("trrSettingsButton"),
      "Waiting for legacy trrSettingsButton"
    );
    Assert.equal(
      trrSettingsButton.hidden,
      false,
      "Legacy trrSettingsButton should be visible for TRR-only failure"
    );

    // The legacy DoH-specific exception button is rendered on the page. It's
    // hidden in this test scenario because the failure is a TRR service
    // failure (see exceptionButtonTRROnly above); the important thing for
    // bug 2038887 is that this element exists, proving the legacy page is
    // being used rather than the felt-privacy net-error-card (which doesn't
    // include it).
    ok(
      doc.getElementById("trrExceptionButton"),
      "Legacy trrExceptionButton element should exist on the page"
    );
  });

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  resetTRRPrefs();
  await SpecialPowers.popPrefEnv();
});
