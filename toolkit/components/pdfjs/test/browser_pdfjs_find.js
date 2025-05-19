/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TESTROOT = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content/",
  "http://mochi.test:8888/"
);

// Get a ref to the pdfs we want to open.
const OS_PDF_URL = TESTROOT + "file_pdfjs_object_stream.pdf";
const TEST_PDF_URL = TESTROOT + "file_pdfjs_test.pdf";

add_task(async function test_find_octet_stream_pdf() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async browser => {
      await waitForPdfJS(browser, OS_PDF_URL);
      let findEls = ["cmd_find", "cmd_findAgain", "cmd_findPrevious"].map(id =>
        document.getElementById(id)
      );
      for (let el of findEls) {
        ok(!el.hasAttribute("disabled"), `${el.id} should be enabled`);
      }
      await waitForPdfJSClose(browser);
    }
  );
});

// This code is roughly based on `promiseFindFinished` from
// `toolkit/content/tests/browser/head.js`.
function waitForFinderResult(findbar) {
  return new Promise(resolve => {
    let resultListener = {
      onFindResult(data) {
        findbar.browser.finder.removeResultListener(resultListener);
        resolve(data);
      },
      onCurrentSelection() {},
      onMatchesCountResult() {},
      onHighlightFinished() {},
    };
    findbar.browser.finder.addResultListener(resultListener);
  });
}

function waitForPdfjsResult(findbar) {
  // FIXME: This is a pretty sketchy way to intercept the results from pdfjs...
  return new Promise(resolve => {
    let oldUpdateControlState = findbar.updateControlState;
    function updateControlState(result, findPrevious) {
      if (result !== Ci.nsITypeAheadFind.FIND_PENDING) {
        resolve({ result, findPrevious });
        if (this.updateControlState === updateControlState) {
          this.updateControlState = oldUpdateControlState;
        }
      }
      return oldUpdateControlState.call(this, result, findPrevious);
    }
    findbar.updateControlState = updateControlState;
  });
}

// This code is roughly based on `promiseFindFinished` from
// `toolkit/content/tests/browser/head.js`.
async function doFind(findbar, searchText, waitFunc) {
  info(`performing a find for ${searchText}`);
  findbar.startFind(findbar.FIND_NORMAL);
  let highlightElement = findbar.getElement("highlight");
  if (highlightElement.checked) {
    highlightElement.click();
  }
  await new Promise(resolve => executeSoon(resolve));
  findbar._findField.value = searchText;
  let promise = waitFunc(findbar);
  findbar._find();
  return promise;
}

add_task(async function test_findbar_in_pdf() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async browser => {
      await waitForPdfJS(browser, TEST_PDF_URL);
      const tab = gBrowser.getTabForBrowser(browser);
      let findbar = await gBrowser.getFindBar(tab);
      let findResult = await doFind(findbar, "Mozilla", waitForPdfjsResult);
      is(
        findResult.result,
        Ci.nsITypeAheadFind.FIND_FOUND,
        "The Mozilla string was found in the PDF document"
      );
      await waitForPdfJSClose(browser);
    }
  );
});

add_task(async function test_findbar_in_pdf_after_adopt() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async browser => {
      await waitForPdfJS(browser, TEST_PDF_URL);
      const tab = gBrowser.getTabForBrowser(browser);
      let newWindow = await BrowserTestUtils.openNewBrowserWindow();

      info("adopting tab into new window");
      let newTab = newWindow.gBrowser.adoptTab(tab);

      let findbar = await newWindow.gBrowser.getFindBar(newTab);
      let findResult = await doFind(findbar, "Mozilla", waitForPdfjsResult);
      is(
        findResult.result,
        Ci.nsITypeAheadFind.FIND_FOUND,
        "The Mozilla string was found in the PDF document"
      );
      await waitForPdfJSClose(newTab.linkedBrowser);
      await BrowserTestUtils.closeWindow(newWindow);
    }
  );
});

// Make sure that performing a find in the browser continues to work after
// navigating to another page (i.e. Pdfjs disables its pdfjs interception
// listeners).
add_task(async function test_findbar_after_navigate() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async browser => {
      await waitForPdfJS(browser, TEST_PDF_URL);
      const tab = gBrowser.getTabForBrowser(browser);

      ok(
        !gBrowser.isFindBarInitialized(tab),
        "Findbar shouldn't be initialized yet"
      );

      info("navigating to a webpage");
      await waitForPdfJSClose(browser);
      BrowserTestUtils.startLoadingURIString(
        browser,
        "http://mochi.test:8888/document-builder.sjs?html=<h1>hello, world!</h1>"
      );
      await BrowserTestUtils.browserLoaded(browser);

      ok(
        !gBrowser.isFindBarInitialized(tab),
        "Findbar still shouldn't be initialized after navigation"
      );

      let findbar = await gBrowser.getFindBar(tab);
      let findResult = await doFind(findbar, "hello", waitForFinderResult);
      is(
        findResult.result,
        Ci.nsITypeAheadFind.FIND_FOUND,
        "The hello string was found in the HTML document"
      );
    }
  );
});
