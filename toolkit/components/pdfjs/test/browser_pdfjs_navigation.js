/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
/* eslint-disable mozilla/no-arbitrary-setTimeout */

requestLongerTimeout(2);

const RELATIVE_DIR = "toolkit/components/pdfjs/test/";
const TESTROOT = "http://example.com/browser/" + RELATIVE_DIR;

const PDF_OUTLINE_ITEMS = 17;
const TESTS = [
  {
    action: {
      selector: "button#next",
      event: "click",
    },
    expectedPage: 2,
    message: "navigated to next page using NEXT button",
  },
  {
    action: {
      selector: "button#previous",
      event: "click",
    },
    expectedPage: 1,
    message: "navigated to previous page using PREV button",
  },
  {
    action: {
      selector: "button#next",
      event: "click",
    },
    expectedPage: 2,
    message: "navigated to next page using NEXT button",
  },
  {
    action: {
      selector: "input#pageNumber",
      value: 1,
      event: "change",
    },
    expectedPage: 1,
    message: "navigated to first page using pagenumber",
  },
  {
    action: {
      selector: "#thumbnailView a:nth-child(4)",
      event: "click",
    },
    expectedPage: 4,
    message: "navigated to 4th page using thumbnail view",
  },
  {
    action: {
      selector: "#thumbnailView a:nth-child(2)",
      event: "click",
    },
    expectedPage: 2,
    message: "navigated to 2nd page using thumbnail view",
  },
  {
    action: {
      selector: "#viewer",
      event: "keydown",
      keyCode: 36,
    },
    expectedPage: 1,
    message: "navigated to 1st page using 'home' key",
  },
  {
    action: {
      selector: "#viewer",
      event: "keydown",
      keyCode: 34,
    },
    expectedPage: 2,
    message: "navigated to 2nd page using 'Page Down' key",
  },
  {
    action: {
      selector: "#viewer",
      event: "keydown",
      keyCode: 33,
    },
    expectedPage: 1,
    message: "navigated to 1st page using 'Page Up' key",
  },
  {
    action: {
      selector: "#viewer",
      event: "keydown",
      keyCode: 39,
    },
    expectedPage: 2,
    message: "navigated to 2nd page using 'right' key",
  },
  {
    action: {
      selector: "#viewer",
      event: "keydown",
      keyCode: 37,
    },
    expectedPage: 1,
    message: "navigated to 1st page using 'left' key",
  },
  {
    action: {
      selector: "#viewer",
      event: "keydown",
      keyCode: 35,
    },
    expectedPage: 5,
    message: "navigated to last page using 'home' key",
  },
  {
    action: {
      selector: "#outlineView .treeItem:nth-child(1) a",
      event: "click",
    },
    expectedPage: 1,
    message: "navigated to 1st page using outline view",
  },
  {
    action: {
      selector: "#outlineView .treeItem:nth-child(" + PDF_OUTLINE_ITEMS + ") a",
      event: "click",
    },
    expectedPage: 4,
    message: "navigated to 4th page using outline view",
  },
  {
    action: {
      selector: "input#pageNumber",
      value: 5,
      event: "change",
    },
    expectedPage: 5,
    message: "navigated to 5th page using pagenumber",
  },
];

add_task(async function test() {
  let mimeService = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
  let handlerInfo = mimeService.getFromTypeAndExtension(
    "application/pdf",
    "pdf"
  );

  // Make sure pdf.js is the default handler.
  is(
    handlerInfo.alwaysAskBeforeHandling,
    false,
    "pdf handler defaults to always-ask is false"
  );
  is(
    handlerInfo.preferredAction,
    Ci.nsIHandlerInfo.handleInternally,
    "pdf handler defaults to internal"
  );

  info("Pref action: " + handlerInfo.preferredAction);

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async function (newTabBrowser) {
      // Outline Items gets appended to the document later on we have to
      // wait for them before we start to navigate though document
      const outlinePromise = new Promise(resolve => {
        BrowserTestUtils.addContentEventListener(
          newTabBrowser,
          "outlineloaded",
          resolve,
          { capture: false, once: true, wantUntrusted: true }
        );
      });

      info("Wait for document to load");
      await waitForPdfJS(newTabBrowser, TESTROOT + "file_pdfjs_test.pdf");

      info("Wait for outline items");
      await outlinePromise;

      await SpecialPowers.spawn(newTabBrowser, [], async function () {
        // Check if PDF is opened with internal viewer.
        Assert.ok(
          content.document.querySelector("div#viewer"),
          "document content has viewer UI"
        );
      });

      info("Wait for zoom to page fit");
      await SpecialPowers.spawn(
        newTabBrowser,
        [],
        /**
         * The key navigation has to happen in page-fit, otherwise it won't scroll
         * through a complete page
         *
         * @param document
         * @returns {deferred.promise|*}
         */
        function setZoomToPageFit() {
          const { document } = content;
          return new Promise(resolve => {
            document.addEventListener(
              "pagerendered",
              function () {
                document.querySelector("#viewer").click();
                resolve();
              },
              { once: true }
            );

            const select = document.querySelector("select#scaleSelect");
            select.selectedIndex = 2;
            select.dispatchEvent(new content.Event("change"));
          });
        }
      );

      info("PDF loaded successfully: run tests");
      await runTests(newTabBrowser);

      await SpecialPowers.spawn(newTabBrowser, [], async function () {
        let pageNumber = content.document.querySelector("input#pageNumber");
        Assert.equal(
          pageNumber.value,
          pageNumber.max,
          "Document is left on the last page"
        );
      });
    }
  );
});

/**
 * As the page changes asynchronously, we have to wait for the event after
 * we trigger the action so we will be at the expected page number after each action
 *
 * @param document
 * @param window
 * @param test
 * @param callback
 */
async function runTests(browser) {
  await SpecialPowers.spawn(browser, [TESTS], async function (contentTESTS) {
    let window = content;
    let document = window.document;

    for (let test of contentTESTS) {
      let deferred = {};
      deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
      });

      let pageNumber = document.querySelector("input#pageNumber");

      // Add an event-listener to wait for page to change, afterwards resolve the promise
      let timeout = window.setTimeout(() => deferred.reject(), 5000);
      window.addEventListener("pagechanging", function pageChange() {
        if (pageNumber.value == test.expectedPage) {
          window.removeEventListener("pagechanging", pageChange);
          window.clearTimeout(timeout);
          deferred.resolve(+pageNumber.value);
        }
      });

      // Get the element and trigger the action for changing the page
      var el = document.querySelector(test.action.selector);
      Assert.ok(el, "Element '" + test.action.selector + "' has been found");

      // The value option is for input case
      if (test.action.value) {
        el.value = test.action.value;
      }

      // Dispatch the event for changing the page
      var ev;
      if (test.action.event == "keydown") {
        ev = new window.KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          view: null,
          keyCode: test.action.keyCode,
          charCode: 0,
        });
        el.dispatchEvent(ev);
      } else {
        ev = new content.Event(test.action.event);
      }
      el.dispatchEvent(ev);

      let pgNumber = await deferred.promise;
      Assert.equal(pgNumber, test.expectedPage, test.message);
    }
  });

  await waitForPdfJSClose(browser);
}
