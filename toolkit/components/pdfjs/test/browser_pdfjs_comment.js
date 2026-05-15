/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const RELATIVE_DIR = "toolkit/components/pdfjs/test/";
const TESTROOT = "https://example.com/browser/" + RELATIVE_DIR;
const pdfUrl = TESTROOT + "file_pdfjs_test.pdf";

// Test the learn more URL when the pdf doesn't contain any comments.
add_task(async function test_learn_more_url() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async function (browser) {
      await SpecialPowers.pushPrefEnv({
        set: [["pdfjs.enableComment", true]],
      });

      await waitForPdfJSAllLayers(browser, pdfUrl, [
        [
          "annotationEditorLayer",
          "annotationLayer",
          "textLayer",
          "canvasWrapper",
        ],
      ]);

      await clickOn(browser, "#editorCommentButton");
      await waitForSelector(browser, ".noComments a");

      const href = await SpecialPowers.spawn(
        browser,
        [],
        () => content.document.querySelector(".noComments a")?.href ?? ""
      );

      Assert.ok(
        href.includes("https://support.mozilla.org/"),
        "We've a SUMO link"
      );
      Assert.ok(!href.includes("%LOCALE%"), "%LOCALE% has been replaced");

      await SpecialPowers.popPrefEnv();

      await waitForPdfJSClose(browser);
    }
  );
});
