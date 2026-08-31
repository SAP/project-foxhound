/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const BROWSER_NAME = document
  .getElementById("bundle_brand")
  .getString("brandShortName");
const UNKNOWN_ISSUER = "https://no-subject-alt-name.example.com:443";

const checkAdvancedAndGetTechnicalInfoText = async useFelt => {
  let doc = content.document;
  let badCertTechnicalInfo;
  const netErrorCard = doc.querySelector("net-error-card")?.wrappedJSObject;

  let advancedButton = useFelt
    ? netErrorCard.advancedButton
    : doc.getElementById("advancedButton");
  ok(advancedButton, "advancedButton found");
  is(
    advancedButton.hasAttribute("disabled"),
    false,
    "advancedButton should be clickable"
  );

  if (useFelt) {
    advancedButton.scrollIntoView(true);
    EventUtils.synthesizeMouseAtCenter(advancedButton, {}, content);

    await ContentTaskUtils.waitForCondition(
      () => netErrorCard.advancedContainer,
      "Advanced section should be rendered for revoked certificate"
    );
    ok(netErrorCard.advancedContainer, "advancedContainer found");
  } else {
    advancedButton.click();
    let badCertAdvancedPanel = doc.getElementById("badCertAdvancedPanel");
    ok(badCertAdvancedPanel, "badCertAdvancedPanel found");

    badCertTechnicalInfo = doc.getElementById("badCertTechnicalInfo");
    ok(badCertTechnicalInfo, "badCertTechnicalInfo found");
  }

  // Wait until fluent sets the errorCode inner text.
  await ContentTaskUtils.waitForCondition(() => {
    let errorCode = useFelt
      ? netErrorCard.errorCode
      : doc.getElementById("errorCode");
    return errorCode.textContent.includes("SSL_ERROR_BAD_CERT_DOMAIN");
  }, "correct error code has been set inside the advanced button panel");

  let viewCertificate = useFelt
    ? netErrorCard.viewCertificate
    : doc.getElementById("viewCertificate");
  ok(viewCertificate, "viewCertificate found");

  return useFelt
    ? netErrorCard.advancedContainer.innerHTML
    : badCertTechnicalInfo.innerHTML;
};

const checkCorrectMessages = message => {
  let isCorrectMessage = message.includes(
    "Websites prove their identity via certificates. " +
      BROWSER_NAME +
      " does not trust this site because it uses a certificate that is" +
      " not valid for no-subject-alt-name.example.com"
  );
  is(isCorrectMessage, true, "That message should appear");
  let isWrongMessage = message.includes("The certificate is only valid for ");
  is(isWrongMessage, false, "That message shouldn't appear");
};

const checkFeltCopy = () => {
  const netErrorCard =
    content.document.querySelector("net-error-card")?.wrappedJSObject;
  Assert.equal(
    netErrorCard.whyDangerous.dataset.l10nId,
    "fp-certerror-bad-domain-why-dangerous-body",
    "Using the 'bad domain' variant of the 'Why Dangerous' copy."
  );
  Assert.equal(
    netErrorCard.whatCanYouDo.dataset.l10nId,
    "fp-certerror-bad-domain-what-can-you-do-body",
    "Using the 'bad domain' variant of the 'What can you do' copy."
  );
  Assert.equal(
    netErrorCard.learnMoreLink.getAttribute("support-page"),
    "connection-not-secure",
    "'Learn more' link points to the standard support page."
  );
};

async function checkUntrustedCertError(useFelt) {
  await SpecialPowers.pushPrefEnv({
    set: [["security.certerrors.felt-privacy-v1", useFelt]],
  });
  info(
    `Loading ${UNKNOWN_ISSUER} which does not have a subject specified in the certificate`
  );
  let tab = await openErrorPage(UNKNOWN_ISSUER);
  let browser = tab.linkedBrowser;
  info("Clicking the exceptionDialogButton in advanced panel");
  let badCertTechnicalInfoText = await SpecialPowers.spawn(
    browser,
    [useFelt],
    checkAdvancedAndGetTechnicalInfoText
  );
  if (useFelt) {
    await SpecialPowers.spawn(browser, [], checkFeltCopy);
  } else {
    checkCorrectMessages(badCertTechnicalInfoText, browser);
  }
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
}

add_task(async function runCheckUntrustedCertError() {
  for (const useFelt of [true, false]) {
    await checkUntrustedCertError(useFelt);
  }
});
