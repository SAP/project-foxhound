/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const DOC = `<h1>heading</h1><p>paragraph</p>`;

async function assertHasStructTree(pdf) {
  const page = await pdf.getPage(1);
  const tree = await page.getStructTree();
  ok(tree, "PDF struct tree exists");
  ok(tree.children && tree.children.length, "PDF struct tree has children");
}

function snippetBodyId(variant) {
  return variant.iframe || variant.remoteIframe
    ? DEFAULT_IFRAME_DOC_BODY_ID
    : DEFAULT_CONTENT_DOC_BODY_ID;
}

/**
 * If the accessibility service is already enabled (in the parent process)
 * before a PDF is exported, it should remain enabled for the entire export.
 */
addPdfTabTask(
  async function testStaysEnabled(ctx) {
    ok(!Services.appinfo.accessibilityEnabled, "a11y disabled at start");
    gAccService = Cc["@mozilla.org/accessibilityService;1"].getService(
      Ci.nsIAccessibilityService
    );
    ok(Services.appinfo.accessibilityEnabled, "a11y enabled in parent");
    CommonUtils.addAccServiceShutdownObserver();
    let docLoaded = waitForEvent(
      EVENT_DOCUMENT_LOAD_COMPLETE,
      snippetBodyId(ctx.variant)
    );
    await loadPdfTestDoc(ctx, DOC);
    await docLoaded;
    // Enabling a11y in the parent transparently enables it in the doc's
    // content process. Register the shutdown observer there now (after
    // content init has fired) so we can wait for it later.
    await SpecialPowers.spawn(ctx.browser, [], () => {
      const { CommonUtils: CU } = ChromeUtils.importESModule(
        "chrome://mochitests/content/browser/accessible/tests/browser/Common.sys.mjs"
      );
      CU.addAccServiceShutdownObserver();
    });
    const pdf = await exportPdf(ctx);
    ok(
      Services.appinfo.accessibilityEnabled,
      "a11y still enabled after export"
    );
    await assertHasStructTree(pdf);
    gAccService = null;
    docLoaded = null;
    forceGC();
    await CommonUtils.observeAccServiceShutdown();
    await SpecialPowers.spawn(ctx.browser, [], async () => {
      const { CommonUtils: CU } = ChromeUtils.importESModule(
        "chrome://mochitests/content/browser/accessible/tests/browser/Common.sys.mjs"
      );
      await CU.observeAccServiceShutdown();
    });
    ok(!Services.appinfo.accessibilityEnabled, "a11y disabled after release");
  },
  { topLevel: true, chrome: true, remoteIframe: true, iframe: true }
);

/**
 * If the accessibility service is disabled before a PDF is exported, it
 * should be enabled briefly for the export and then disabled again. The
 * service runs in the parent process for chrome documents and in the content
 * process for everything else.
 */
addPdfTabTask(
  async function testEnabledThenDisabled(ctx) {
    const a11yEnabledInDocProcess = () =>
      SpecialPowers.spawn(
        ctx.browser,
        [],
        () => Services.appinfo.accessibilityEnabled
      );
    ok(!(await a11yEnabledInDocProcess()), "a11y disabled at start");

    await SpecialPowers.spawn(ctx.browser, [], () => {
      const { CommonUtils: CU } = ChromeUtils.importESModule(
        "chrome://mochitests/content/browser/accessible/tests/browser/Common.sys.mjs"
      );
      CU.addAccServiceInitializedObserver();
      CU.addAccServiceShutdownObserver();
    });

    await loadPdfTestDoc(ctx, DOC);
    const pdf = await exportPdf(ctx);
    await assertHasStructTree(pdf);

    await SpecialPowers.spawn(ctx.browser, [], async () => {
      const { CommonUtils: CU } = ChromeUtils.importESModule(
        "chrome://mochitests/content/browser/accessible/tests/browser/Common.sys.mjs"
      );
      await CU.observeAccServiceInitialized();
      await CU.observeAccServiceShutdown();
    });

    ok(!(await a11yEnabledInDocProcess()), "a11y disabled after export");
  },
  { topLevel: true, chrome: true, remoteIframe: true, iframe: true }
);

/**
 * While the accessibility service is briefly enabled by a PDF export, the
 * engine should be in PDF-only mode. Other documents opened during PDF export
 * must not get a DocAccessible.
 */
addPdfTabTask(
  async function testPdfOnlyModeRejectsNewDocs(ctx) {
    ok(!Services.appinfo.accessibilityEnabled, "a11y disabled at start");
    // We will load about:mozilla during PDF export. Since we're in PDF-only
    // mode, we shouldn't get an event for it.
    const unexpected = new UnexpectedEvents([
      [
        EVENT_DOCUMENT_LOAD_COMPLETE,
        evt => evt.accessibleDocument.URL === "about:mozilla",
      ],
    ]);

    let newTab = null;
    let tabLoaded = null;
    const observe = (subject, topic, data) => {
      if (topic !== "a11y-init-or-shutdown" || data !== "pdf") {
        return;
      }
      Services.obs.removeObserver(observe, "a11y-init-or-shutdown");
      // We're now synchronously inside the a11y init notification, so the
      // service is up in PDF-only mode. Create about:mozilla here so its
      // load happens entirely during the export.
      newTab = BrowserTestUtils.addTab(gBrowser, "about:mozilla");
      tabLoaded = BrowserTestUtils.browserLoaded(newTab.linkedBrowser);
    };
    Services.obs.addObserver(observe, "a11y-init-or-shutdown");

    await loadPdfTestDoc(ctx, DOC);
    const pdf = await exportPdf(ctx);
    await assertHasStructTree(pdf);

    ok(newTab, "about:mozilla tab was created from the init observer");
    await tabLoaded;
    await unexpected.flush(async (args, fn) =>
      SpecialPowers.spawn(newTab.linkedBrowser, args, fn)
    );
    unexpected.stop();
    BrowserTestUtils.removeTab(newTab);
  },
  { topLevel: false, chrome: true }
);

function hasCacheKey(acc, key) {
  try {
    acc.cache.getStringProperty(key);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Test that the PDF output cache domains don't impact the global cache domains.
 */
addPdfTabTask(
  async function testCacheDomains(ctx) {
    ok(!Services.appinfo.accessibilityEnabled, "a11y disabled at start");
    gAccService = Cc["@mozilla.org/accessibilityService;1"].getService(
      Ci.nsIAccessibilityService
    );
    gAccService.setCacheDomains(
      CacheDomain.DOMNodeIDAndClass | CacheDomain.Bounds
    );
    ok(Services.appinfo.accessibilityEnabled, "a11y enabled in parent");
    CommonUtils.addAccServiceShutdownObserver();
    let docLoaded = waitForEvent(
      EVENT_DOCUMENT_LOAD_COMPLETE,
      snippetBodyId(ctx.variant)
    );
    await loadPdfTestDoc(
      ctx,
      `<div role="listbox">
        <div id="option" role="option" aria-setsize="2">o</div>
      </div>`
    );
    let docAcc = (await docLoaded).accessible;
    const pdf = await exportPdf(ctx);
    ok(
      Services.appinfo.accessibilityEnabled,
      "a11y still enabled after export"
    );
    await assertHasStructTree(pdf);

    let option = findAccessibleChildByID(docAcc, "option");
    // PDF includes the GroupInfo cache domain, but it isn't enabled globally.
    ok(
      !hasCacheKey(option, "aria-setsize"),
      "aria-setsize not in option cache"
    );
    // PDF does not include the Bounds cache domain, but it is enabled globally.
    ok(
      hasCacheKey(option, "relative-bounds"),
      "relative-bounds in option cache"
    );

    gAccService = null;
    docLoaded = docAcc = option = null;
    forceGC();
    await CommonUtils.observeAccServiceShutdown();
    ok(!Services.appinfo.accessibilityEnabled, "a11y disabled after release");
  },
  { topLevel: true, remoteIframe: true, iframe: true }
);
