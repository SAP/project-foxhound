/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* exported addPdfStructTreeTest, addPdfOutlineTest, addPdfTabTask,
   loadPdfTestDoc, exportPdf, assertPdfStructTree, CommonUtils */

// Prevent common.js from instantiating the accessibility service when it is
// loaded. These tests need to start with the accessibility service disabled.
window.gDisableAccServiceInit = true;

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/accessible/tests/browser/shared-head.js",
  this
);
Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/toolkit/components/printing/tests/head.js",
  this
);
loadScripts(
  { name: "common.js", dir: MOCHITESTS_DIR },
  { name: "events.js", dir: MOCHITESTS_DIR }
);
const { CommonUtils } = ChromeUtils.importESModule(
  "chrome://mochitests/content/browser/accessible/tests/browser/Common.sys.mjs"
);
const pdfjsLib = ChromeUtils.importESModule("resource://pdf.js/build/pdf.mjs");
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "resource://pdf.js/build/pdf.worker.mjs";

delete window.gDisableAccServiceInit;

/**
 * The PDF struct tree doesn't contain text content itself. Instead, it uses a
 * node which refers to marked content in the PDF content stream using an id. In
 * the PDF content stream, marked content is delimited by a begin operator
 * specifying the id and an end operator. Rather than making individual tests
 * match up the ids and separately test the struct tree and content items, this
 * function finds marked content items and inserts their strings directly into a
 * .content array on the struct tree node.
 */
function simplifyStructTreeNode(node, contentItems) {
  if (node.type == "content") {
    // Find the associated content items and append their strings to
    // node.content.
    node.content = [];
    let inMarked = false;
    for (const item of contentItems) {
      if (item.type == "beginMarkedContentProps" && item.id == node.id) {
        inMarked = true;
        continue;
      }
      if (!inMarked) {
        continue;
      }
      if (item.str) {
        node.content.push(item.str);
        continue;
      }
      if (item.type == "endMarkedContent") {
        break;
      }
    }
    delete node.type;
    delete node.id;
  }
  if (node.children) {
    for (const child of node.children) {
      simplifyStructTreeNode(child, contentItems);
    }
  }
}

/**
 * PDF outline nodes contain a lot of properties we can't or don't want to test
 * yet. Remove any properties we're not interested in.
 */
function simplifyOutlineNode(node) {
  for (const key in node) {
    if (!["items", "title"].includes(key)) {
      delete node[key];
    }
  }
  for (const child of node.items) {
    simplifyOutlineNode(child);
  }
}

/**
 * Similar to addAccessibleTask, schedule one add_task per requested variant.
 * Unlike addAccessibleTask, this does *not* initialize the accessibility
 * service or wait for accessibility events. Each task opens a fresh tab and
 * calls `task(ctx)`, where `ctx` contains { tab, browser, variant }. The task
 * is responsible for loading a document (loadPdfTestDoc), exporting (exportPdf)
 * and any pre/post assertions.
 *
 * `options` is similar to addAccessibleTask: topLevel, chrome, iframe,
 * remoteIframe.
 */
function addPdfTabTask(task, options = {}) {
  const {
    topLevel = true,
    chrome = false,
    iframe = false,
    remoteIframe = false,
  } = options;
  const variants = [];
  if (topLevel) {
    variants.push({ suffix: "_topLevel" });
  }
  if (chrome) {
    variants.push({ suffix: "_chrome", chrome: true });
  }
  if (iframe) {
    variants.push({ suffix: "_iframe", iframe: true });
  }
  if (remoteIframe) {
    variants.push({ suffix: "_remoteIframe", remoteIframe: true });
  }
  for (const variant of variants) {
    const wrapped = async function () {
      const tabOpts = variant.chrome
        ? { allowInheritPrincipal: true, forceNotRemote: true }
        : {};
      // Open a blank tab first so we can install the necessary load listeners
      // before navigating, and so we can apply the tweaks needed for chrome
      // documents before triggering the real load.
      gBrowser.selectedTab = BrowserTestUtils.addTab(
        gBrowser,
        "about:blank",
        tabOpts
      );
      const tab = gBrowser.selectedTab;
      const browser = tab.linkedBrowser;
      registerCleanupFunction(() => {
        if (tab && !tab.closing && tab.linkedBrowser) {
          gBrowser.removeTab(tab);
        }
      });
      if (variant.chrome) {
        await SpecialPowers.pushPrefEnv({
          set: [["security.allow_unsafe_parent_loads", true]],
        });
        // Ensure this never becomes a remote browser.
        browser.removeAttribute("maychangeremoteness");
      }
      await task({ tab, browser, variant });
      gBrowser.removeTab(tab);
    };
    // Propagate the test name to the wrapper so it shows up in test run
    // output, suffixed with the variant.
    Object.defineProperty(wrapped, "name", {
      value: task.name + variant.suffix,
    });
    add_task(wrapped);
  }
}

/**
 * As part of a task using addPdfTabTask, load the snippet `doc` into the tab
 * represented by `ctx`. `options` is forwarded to snippetToUrl.
 */
async function loadPdfTestDoc(ctx, doc, options = {}) {
  const url = snippetToURL(doc, {
    ...options,
    iframe: ctx.variant.iframe,
    remoteIframe: ctx.variant.remoteIframe,
  });
  const useIframe = ctx.variant.iframe || ctx.variant.remoteIframe;

  const topLoaded = BrowserTestUtils.browserLoaded(ctx.browser);
  const iframeLoaded = useIframe
    ? BrowserTestUtils.browserLoaded(
        ctx.browser,
        /* includeSubFrames */ true,
        u => u != "about:blank" && u != url
      )
    : null;

  if (ctx.variant.chrome) {
    ctx.browser.setAttribute("src", url);
  } else {
    BrowserTestUtils.startLoadingURIString(ctx.browser, url);
  }
  await topLoaded;
  if (iframeLoaded) {
    await iframeLoaded;
  }

  await SimpleTest.promiseFocus(ctx.browser);
}

/**
 * As part of a task using addPdfTabTask, print the loaded document to a PDF and
 * return the parsed pdf.js document.
 */
async function exportPdf(ctx) {
  const helper = new PrintHelper(ctx.browser);
  await helper.startPrint();
  const file = helper.mockFilePicker("accessible_test.pdf");
  await helper.assertPrintToFile(file, () => {
    helper.click(helper.get("print-button"));
  });
  const data = await IOUtils.read(file.path);
  file.remove(false);
  Services.prefs.clearUserPref("print_printer");
  return pdfjsLib.getDocument({ data }).promise;
}

function addPdfTest(testName, doc, task, options = {}) {
  const body = async ctx => {
    await loadPdfTestDoc(ctx, doc, options);
    const pdf = await exportPdf(ctx);
    await task(pdf);
  };
  Object.defineProperty(body, "name", { value: testName });
  addPdfTabTask(body, options);
}

/**
 * Assert that the struct tree of `pdf` matches `pageTrees` (one expected tree
 * per page).
 */
async function assertPdfStructTree(pdf, pageTrees) {
  for (let p = 0; p < pageTrees.length; ++p) {
    const pageNum = p + 1;
    const page = await pdf.getPage(pageNum);
    const actualTree = await page.getStructTree();
    const contentItems = (
      await page.getTextContent({ includeMarkedContent: true })
    ).items;
    simplifyStructTreeNode(actualTree, contentItems);
    SimpleTest.isDeeply(
      actualTree,
      pageTrees[p],
      `Page ${pageNum} struct tree correct`
    );
  }
}

/**
 * Add a PDF struct tree test.
 *
 * @param testName The name of the test to show in log output.
 * @param doc The markup to convert to PDF.
 * @param pageTrees An array of PDF struct trees for each page of the PDF.
 * @param options Options to pass to addPdfTest.
 */
function addPdfStructTreeTest(testName, doc, pageTrees, options = {}) {
  addPdfTest(
    testName,
    doc,
    pdf => assertPdfStructTree(pdf, pageTrees),
    options
  );
}

/**
 * Add a PDF outline test.
 *
 * @param testName The name of the test to show in log output.
 * @param doc The markup to convert to PDF.
 * @param outline An array of PDF outline node information.
 * @param options Options to pass to addPdfTest.
 */
function addPdfOutlineTest(testName, doc, outline, options = {}) {
  async function task(pdf) {
    const actualOutline = await pdf.getOutline();
    for (const node of actualOutline) {
      simplifyOutlineNode(node);
    }
    SimpleTest.isDeeply(actualOutline, outline, "Outline correct");
  }
  addPdfTest(testName, doc, task, options);
}
