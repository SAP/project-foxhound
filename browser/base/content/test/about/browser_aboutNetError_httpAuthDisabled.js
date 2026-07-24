/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const BAD_CERT = "https://expired.example.com/";

// The revoked certificate page should not offer a proceed button.
add_task(async function checkHttpAuthDisabledCopy() {
  await setSecurityCertErrorsFeltPrivacyToTrue();
  const tab = await openErrorPage(BAD_CERT);
  const browser = tab.linkedBrowser;

  await SpecialPowers.spawn(browser, [], async function () {
    const mockErrorInfo = {
      errorCodeString: "basicHttpAuthDisabled",
      channelStatus: 0,
      errorMessage: "Unauthorized",
      responseStatusText: "Unauthorized",
      responseStatus: 401,
    };

    content.document.getFailedCertSecurityInfo = () => mockErrorInfo;

    const netErrorCard =
      content.document.querySelector("net-error-card").wrappedJSObject;
    const info = Cu.cloneInto(mockErrorInfo, netErrorCard);
    netErrorCard.errorInfo = info;
    netErrorCard.errorConfig = netErrorCard.getErrorConfig();
    netErrorCard.hideExceptionButton = netErrorCard.shouldHideExceptionButton(
      info.errorCodeString
    );
    netErrorCard.requestUpdate();
    await netErrorCard.getUpdateComplete();

    const advancedButton = netErrorCard.advancedButton;
    advancedButton.scrollIntoView(true);
    EventUtils.synthesizeMouseAtCenter(advancedButton, {}, content);

    await ContentTaskUtils.waitForCondition(
      () => netErrorCard.advancedContainer,
      "Advanced section should be rendered for disabled HTTP auth."
    );
    await ContentTaskUtils.waitForCondition(
      () => netErrorCard.whyDangerous && netErrorCard.whatCanYouDo,
      "Disabled HTTP auth copy should be rendered"
    );

    Assert.ok(
      netErrorCard.advancedShowing,
      "Advanced details are shown disabled HTTP auth."
    );
    Assert.ok(
      !netErrorCard.exceptionButton,
      "Proceed button should not be shown for disabled HTTP auth."
    );
    Assert.equal(
      netErrorCard.whyDangerous.dataset.l10nId,
      "fp-neterror-http-auth-disabled-why-dangerous-body",
      "Using the 'http auth disabled' variant of the 'Why Dangerous' copy."
    );
    Assert.equal(
      netErrorCard.whatCanYouDo.dataset.l10nId,
      "fp-neterror-http-auth-disabled-what-can-you-do-body",
      "Using the 'http auth disabled' variant of the 'What can you do' copy."
    );
    Assert.equal(
      netErrorCard.learnMoreLink.dataset.l10nId,
      "fp-learn-more-about-https-connections",
      "'Learn more' link points to the HTTPS Connections page."
    );
  });

  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});
