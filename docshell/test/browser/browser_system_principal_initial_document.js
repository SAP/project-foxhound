const CHROME_URI = "chrome://global/content/aboutSupport.xhtml";

// The goal of this test is to check for crashes and document current behavior

add_task(async function test_transient_about_blank_in_chrome_iframe() {
  // open a tab with system principal due to chrome URI
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, CHROME_URI);
  let browser = tab.linkedBrowser;

  await SpecialPowers.spawn(browser, [CHROME_URI], async CHROME_URI => {
    let bc = content.browsingContext;
    let contentPrincipal = content.document.nodePrincipal;
    Assert.ok(contentPrincipal.isSystemPrincipal, "tab has system principal");
    Assert.ok(bc.isContent, "tab BC is content");

    // within a system context, add a new iframe
    let iframe = content.document.createElement("iframe");
    iframe.src = CHROME_URI;
    content.document.documentElement.appendChild(iframe);

    // iframe will start with some different principal
    let ifrBC = iframe.browsingContext;
    let aboutBlankPrincipal = iframe.contentDocument.nodePrincipal;
    Assert.ok(
      iframe.contentDocument.isUncommittedInitialDocument,
      "iframe at transient about:blank"
    );
    Assert.ok(
      !aboutBlankPrincipal.isSystemPrincipal,
      "transient about:blank doesn't have system principal"
    );
    Assert.ok(
      aboutBlankPrincipal.isNullPrincipal,
      "transient about:blank starts out with null principal"
    );
    Assert.ok(ifrBC.isContent, "iframe BC is content");

    // test inner window will be replaced
    iframe.contentWindow.foo = "bar";
    iframe.contentWindow.addEventListener("load", () => {
      Assert.ok(false, "load event never fired on initial iframe inner window");
    });

    await new Promise(res => iframe.addEventListener("load", res));

    // after load, iframe has system principal and inner window was replaced
    let chromeDocPrincipal = iframe.contentDocument.nodePrincipal;
    Assert.ok(
      chromeDocPrincipal.isSystemPrincipal,
      "after load, iframe has system principal"
    );
    Assert.ok(ifrBC.isContent, "iframe BC stays content");
    Assert.equal(
      iframe.contentWindow.foo,
      undefined,
      "iframe inner window replaced"
    );

    iframe.remove();
  });

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_about_blank_iframe_in_chrome_doc() {
  // open a tab with system principal due to chrome URI
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, CHROME_URI);
  let browser = tab.linkedBrowser;

  await SpecialPowers.spawn(browser, [], async () => {
    let bc = content.browsingContext;
    let contentPrincipal = content.document.nodePrincipal;
    Assert.ok(contentPrincipal.isSystemPrincipal, "tab has system principal");
    Assert.ok(bc.isContent, "tab BC is content");

    // within a system context, add an about:blank iframe
    let iframe = content.document.createElement("iframe");
    content.document.documentElement.appendChild(iframe);
    let ifrPrincipal = SpecialPowers.wrap(iframe.contentWindow).document
      .nodePrincipal;
    Assert.ok(
      !ifrPrincipal.isSystemPrincipal,
      "about:blank iframe has no system principal"
    );
  });

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_open_about_blank_link_from_chrome_doc() {
  // open a tab with system principal due to chrome URI
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, CHROME_URI);
  let browser = tab.linkedBrowser;

  const linkOpened = BrowserTestUtils.waitForNewTab(gBrowser, "about:blank");

  await SpecialPowers.spawn(browser, [], async () => {
    let bc = content.browsingContext;
    let contentPrincipal = content.document.nodePrincipal;
    Assert.ok(contentPrincipal.isSystemPrincipal, "tab has system principal");
    Assert.ok(bc.isContent, "tab BC is content");

    // within a system context, add an about:blank link
    let link = content.document.createElement("a");
    link.href = "about:blank";
    link.target = "_blank";
    content.document.documentElement.appendChild(link);
    link.click();
  });

  const blanktab = await linkOpened;

  // Check the opened tab from the link is privileged
  await SpecialPowers.spawn(blanktab.linkedBrowser, [], async () => {
    let bc = content.browsingContext;
    let contentPrincipal = content.document.nodePrincipal;
    Assert.ok(
      contentPrincipal.isSystemPrincipal,
      "about:blank has system principal"
    );
    Assert.ok(bc.isContent, "about:blank BC is content");
  });

  BrowserTestUtils.removeTab(blanktab);
  BrowserTestUtils.removeTab(tab);
});
