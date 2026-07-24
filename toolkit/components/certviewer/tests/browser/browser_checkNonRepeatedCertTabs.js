/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

function checkCertTabs() {
  let certificatePages = 0;
  for (let tab of gBrowser.tabs) {
    let spec = tab.linkedBrowser.documentURI.spec;
    if (spec.includes("about:certificate")) {
      certificatePages++;
    }
  }
  Assert.equal(certificatePages, 1, "Do not open repeated certificate pages!");
}

// Security CertError Felt Privacy set to false
add_task(async function testBadCert_feltPrivacyToFalse() {
  // This will set the correct preference and automatically handle cleanup
  await SpecialPowers.pushPrefEnv({
    set: [["security.certerrors.felt-privacy-v1", false]],
  });

  info("Testing bad cert");

  let tab = await openErrorPage();

  let loaded = BrowserTestUtils.waitForNewTab(gBrowser, null, true);
  for (let i = 0; i < 2; i++) {
    // try opening two certificates that are the same
    await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
      let advancedButton = content.document.getElementById("advancedButton");
      Assert.ok(advancedButton, "advancedButton found");
      Assert.equal(
        advancedButton.hasAttribute("disabled"),
        false,
        "advancedButton should be clickable"
      );
      advancedButton.click();
      let viewCertificate = content.document.getElementById("viewCertificate");
      Assert.ok(viewCertificate, "viewCertificate found");
      Assert.equal(
        viewCertificate.hasAttribute("disabled"),
        false,
        "viewCertificate should be clickable"
      );

      viewCertificate.click();
    });
    await loaded;
  }
  checkCertTabs();

  gBrowser.removeCurrentTab(); // closes about:certificate
  gBrowser.removeCurrentTab(); // closes https://expired.example.com/
  await SpecialPowers.popPrefEnv();
});

add_task(async function testGoodCert() {
  info("Testing page info");
  let url = "https://example.com/";

  info(`Loading ${url}`);
  await BrowserTestUtils.withNewTab({ gBrowser, url }, async function () {
    info("Opening pageinfo");
    let pageInfo = BrowserCommands.pageInfo(url, "securityTab", {});
    await BrowserTestUtils.waitForEvent(pageInfo, "load");

    let securityTab = pageInfo.document.getElementById("securityTab");
    await TestUtils.waitForCondition(
      () => BrowserTestUtils.isVisible(securityTab),
      "Security tab should be visible."
    );
    Assert.ok(securityTab, "Security tab is available");
    let viewCertButton = pageInfo.document.getElementById("security-view-cert");
    await TestUtils.waitForCondition(
      () => BrowserTestUtils.isVisible(viewCertButton),
      "view cert button should be visible."
    );

    let loaded = BrowserTestUtils.waitForNewTab(gBrowser, null, true);
    for (let i = 0; i < 2; i++) {
      checkAndClickButton(pageInfo.document, "security-view-cert");
      await loaded;
    }

    pageInfo.close();
    checkCertTabs();
  });

  gBrowser.removeCurrentTab();
});

// Security CertError Felt Privacy set to true
add_task(async function testBadCert_feltPrivacyToTrue() {
  // This will set the correct preference and automatically handle cleanup
  await SpecialPowers.pushPrefEnv({
    set: [["security.certerrors.felt-privacy-v1", true]],
  });

  info("Testing bad cert");

  let tab = await openErrorPage();
  let loaded = BrowserTestUtils.waitForNewTab(gBrowser, null, true);

  for (let i = 0; i < 2; i++) {
    gBrowser.selectedTab = tab;
    // try opening two certificates that are the same
    await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
      const netErrorCard =
        content.document.querySelector("net-error-card").wrappedJSObject;
      await netErrorCard.getUpdateComplete();

      Assert.ok(
        netErrorCard.advancedButton,
        "The advanced button should exist."
      );

      // Click the advancedButton to show the advanced section if it is not
      // already showing
      if (!netErrorCard.advancedShowing) {
        EventUtils.synthesizeMouseAtCenter(
          netErrorCard.advancedButton,
          {},
          content
        );
      }

      await ContentTaskUtils.waitForCondition(
        () =>
          netErrorCard.viewCertificate &&
          ContentTaskUtils.isVisible(netErrorCard.viewCertificate),
        "Wait for the viewCertificate link."
      );

      Assert.ok(
        netErrorCard.advancedShowing,
        "Advanced showing attribute should be true"
      );

      Assert.ok(
        netErrorCard.viewCertificate,
        "The viewCertificate button should exist."
      );

      EventUtils.synthesizeMouseAtCenter(
        netErrorCard.viewCertificate,
        {},
        content
      );
    });

    let certTab = await loaded;

    Assert.equal(
      gBrowser.selectedTab,
      certTab,
      "The selected tab should be the about:certificate tab."
    );
  }

  checkCertTabs();

  gBrowser.removeCurrentTab(); // closes about:certificate
  gBrowser.removeCurrentTab(); // closes https://expired.example.com/
  await SpecialPowers.popPrefEnv();
});

// Works for both Security CertError Felt Privacy set to true and false
add_task(async function testPreferencesCert() {
  info("Testing preferences cert");
  let url = "about:preferences#privacy";

  info(`Loading ${url}`);
  await BrowserTestUtils.withNewTab(
    { gBrowser, url },
    async function (browser) {
      checkAndClickButton(browser.contentDocument, "viewCertificatesButton");

      let certDialogLoaded = promiseLoadSubDialog(
        "chrome://pippki/content/certManager.xhtml"
      );
      let dialogWin = await certDialogLoaded;
      let doc = dialogWin.document;
      Assert.ok(doc, "doc loaded");

      doc.getElementById("certmanagertabs").selectedTab =
        doc.getElementById("ca_tab");
      let treeView = doc.getElementById("ca-tree").view;
      let selectedCert;

      for (let i = 0; i < treeView.rowCount; i++) {
        treeView.selection.select(i);
        dialogWin.getSelectedCerts();
        let certs = dialogWin.selected_certs;
        if (certs && certs.length == 1 && certs[0]) {
          selectedCert = certs[0];
          break;
        }
      }
      Assert.ok(selectedCert, "A cert should be selected");
      let viewButton = doc.getElementById("ca_viewButton");
      Assert.equal(viewButton.disabled, false, "Should enable view button");

      let loaded = BrowserTestUtils.waitForNewTab(gBrowser, null, true);
      for (let i = 0; i < 2; i++) {
        let clickActionComplete = TestUtils.topicObserved(
          "viewCertHelper-done"
        );
        viewButton.click();
        if (i == 0) {
          await loaded;
        }
        await clickActionComplete;
      }
      checkCertTabs();
    }
  );
  gBrowser.removeCurrentTab(); // closes about:certificate
});
