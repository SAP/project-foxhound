/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const RELATIVE_DIR = "toolkit/components/pdfjs/test/";
const TESTROOT = "http://example.com/browser/" + RELATIVE_DIR;

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
    async function (browser) {
      // check that PDF is opened with internal viewer
      await waitForPdfJS(browser, TESTROOT + "file_pdfjs_test.pdf");

      await SpecialPowers.spawn(browser, [], async function () {
        Assert.ok(
          content.document.querySelector("div#viewer"),
          "document content has viewer UI"
        );

        // open sidebar
        var sidebar = content.document.querySelector(
          "#viewsManagerToggleButton"
        );
        var outerContainer =
          content.document.querySelector("div#outerContainer");

        sidebar.click();
        await ContentTaskUtils.waitForCondition(
          () => outerContainer.classList.contains("viewsManagerOpen"),
          "sidebar opens on click"
        );

        // check that thumbnail view is open
        var thumbnailsView =
          content.document.querySelector("div#thumbnailsView");
        var outlinesView = content.document.querySelector("div#outlinesView");

        Assert.equal(
          thumbnailsView.getAttribute("class"),
          "thumbnailsView",
          "Initial view is thumbnail view"
        );
        Assert.equal(
          outlinesView.getAttribute("class"),
          "treeView hidden",
          "Outline view is hidden initially"
        );

        // switch to outline view
        var viewOutlineButton = content.document.querySelector(
          "button#outlinesViewMenu"
        );
        viewOutlineButton.click();

        Assert.equal(
          thumbnailsView.getAttribute("class"),
          "thumbnailsView hidden",
          "Thumbnail view is hidden when outline is selected"
        );
        Assert.equal(
          outlinesView.getAttribute("class"),
          "treeView",
          "Outline view is visible when selected"
        );

        // switch back to thumbnail view
        var viewThumbnailButton = content.document.querySelector(
          "button#thumbnailsViewMenu"
        );
        viewThumbnailButton.click();

        Assert.equal(
          thumbnailsView.getAttribute("class"),
          "thumbnailsView",
          "Thumbnail view is visible when selected"
        );
        Assert.equal(
          outlinesView.getAttribute("class"),
          "treeView hidden",
          "Outline view is hidden when thumbnail is selected"
        );

        sidebar.click();
      });

      await waitForPdfJSClose(browser);
    }
  );
});
