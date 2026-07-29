/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { PdfjsParent } = ChromeUtils.importESModule(
  "resource://pdf.js/PdfjsParent.sys.mjs"
);
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const RELATIVE_DIR = "toolkit/components/pdfjs/test/";
const TESTROOT = "https://example.com/browser/" + RELATIVE_DIR;
const PDF_URL = TESTROOT + "file_pdfjs_test.pdf";
const CSP_OPENER_URL = TESTROOT + "file_pdfjs_csp_sandbox_opener.html";
const CSP_PDF_URL = TESTROOT + "file_pdfjs_csp.sjs";

// Copied from nsSandboxFlags.h
const SANDBOXED_DOWNLOADS = 0x10000;

// Substring of the warning `ChromeActions.download` logs when it drops a
// request from a sandboxed context.
const DOWNLOAD_BLOCKED_MARKER =
  "PdfStreamConverter: blocked a download request.";

const MockFilePicker = SpecialPowers.MockFilePicker;
let tempDir;

function makeIframeParentUrl(sandbox) {
  return (
    "data:text/html," +
    encodeURIComponent(
      `<!doctype html><html><body><iframe id="pdf" sandbox="${sandbox}" ` +
        `src="${PDF_URL}" width="800" height="600"></iframe></body></html>`
    )
  );
}

function getIframeBrowsingContext(browser) {
  return browser.browsingContext.children[0];
}

// Wait for the pdf.js viewer in `target` to initialize and load its document.
async function waitForPdfJSLoaded(target) {
  await SpecialPowers.spawn(target, [], async () => {
    const { ContentTaskUtils } = ChromeUtils.importESModule(
      "resource://testing-common/ContentTaskUtils.sys.mjs"
    );
    const getApp = () => content.wrappedJSObject.PDFViewerApplication;
    await ContentTaskUtils.waitForCondition(
      () => getApp()?.initialized,
      "PDFViewerApplication must initialize"
    );
    await getApp().initializedPromise;
    await ContentTaskUtils.waitForCondition(
      () => getApp()?.pdfDocument,
      "PDFViewerApplication must load a PDF document"
    );
  });
  await TestUtils.waitForTick();
}

/**
 * Dispatch a `download` request straight into `ChromeActions.download`, like
 * the viewer's `FirefoxCom.request("download", ...)`, then wait for the warning
 * the guard logs when it drops it.
 *
 * Calling `PDFViewerApplication.downloadOrSave()` instead would test the
 * viewer's own gating (it hides download UI when sandboxed) and would still
 * pass even if the chrome-side guard were removed.
 */
async function forgeDownloadAndExpectBlock(bc) {
  await SpecialPowers.spawn(
    bc,
    [DOWNLOAD_BLOCKED_MARKER, PDF_URL],
    async (marker, originalUrl) => {
      const { TestUtils } = ChromeUtils.importESModule(
        "resource://testing-common/TestUtils.sys.mjs"
      );
      const blocked = TestUtils.consoleMessageObserved(msg => {
        const arg = msg.wrappedJSObject.arguments?.[0];
        return typeof arg === "string" && arg.includes(marker);
      });

      const node = content.document.createTextNode("");
      content.document.documentElement.append(node);
      node.dispatchEvent(
        new content.CustomEvent("pdf.js.message", {
          bubbles: true,
          cancelable: false,
          detail: Cu.cloneInto(
            {
              action: "download",
              data: { blobUrl: "blob:fake", originalUrl, filename: "fake.pdf" },
              responseExpected: false,
            },
            content
          ),
        })
      );

      info("Waiting for the download request to be blocked...");
      await blocked;
      info("The download request was blocked by ChromeActions.download");
    }
  );
}

async function awaitNextDownload() {
  const downloadList = await Downloads.getList(Downloads.PUBLIC);
  const filePickerShown = new Promise(resolve => {
    MockFilePicker.showCallback = fp => {
      const destFile = tempDir.clone();
      destFile.append(fp.defaultString);
      if (destFile.exists()) {
        destFile.remove(false);
      }
      MockFilePicker.setFiles([destFile]);
      MockFilePicker.filterIndex = 0;
      resolve();
    };
  });
  let view;
  const downloadFinished = new Promise(resolve => {
    view = {
      onDownloadChanged(download) {
        download.launchWhenSucceeded = false;
        if (download.succeeded || download.error) {
          resolve(download);
        }
      },
    };
  });
  downloadList.addView(view);

  // Release the picker callback and the download view even if the download
  // never starts (e.g. the trigger throws), so neither leaks into later tasks.
  const cleanup = () => {
    downloadList.removeView(view);
    MockFilePicker.showCallback = null;
  };
  return { filePickerShown, downloadFinished, cleanup };
}

add_setup(async function () {
  tempDir = createTemporarySaveDirectory();
  MockFilePicker.init();
  MockFilePicker.returnValue = MockFilePicker.returnOK;
  MockFilePicker.displayDirectory = tempDir;

  await SpecialPowers.pushPrefEnv({
    set: [["browser.download.always_ask_before_handling_new_types", false]],
  });

  registerCleanupFunction(async function () {
    MockFilePicker.cleanup();
    await cleanupDownloads();
    tempDir.remove(true);
  });
});

/**
 * Triggering a download from a PDF loaded in a sandboxed iframe (without
 * `allow-downloads`) must be dropped by `ChromeActions.download` so the
 * `PDFJS:Parent:saveURL` IPC is never sent to the parent process.
 */
add_task(async function test_sandboxed_iframe_blocks_download() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: makeIframeParentUrl("allow-scripts") },
    async function (browser) {
      const iframeBC = getIframeBrowsingContext(browser);
      await waitForPdfJSLoaded(iframeBC);

      // Spy on `_saveURL` to prove the chrome-side `ChromeActions.download`
      // guard rejected the request before it was forwarded to the parent
      // process.
      const spy = sinon.spy(PdfjsParent.prototype, "_saveURL");
      try {
        info("Forging a download request from inside the sandboxed iframe...");
        await forgeDownloadAndExpectBlock(iframeBC);
        await TestUtils.waitForTick();

        is(
          spy.callCount,
          0,
          "ChromeActions.download must not forward saveURL when the iframe is sandboxed"
        );
      } finally {
        spy.restore();
      }

      await waitForPdfJSClose(iframeBC);
    }
  );
});

/**
 * When the PDF is sandboxed without `allow-downloads`, the viewer must also hide
 * its download UI (both the primary and secondary toolbar buttons), so the user
 * is never offered an action the chrome-side guard would only reject.
 */
add_task(async function test_sandboxed_iframe_hides_download_button() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: makeIframeParentUrl("allow-scripts") },
    async function (browser) {
      const iframeBC = getIframeBrowsingContext(browser);
      await waitForPdfJSLoaded(iframeBC);

      await SpecialPowers.spawn(iframeBC, [], async () => {
        for (const id of ["downloadButton", "secondaryDownload"]) {
          const button = content.document.getElementById(id);
          Assert.ok(button, `#${id} must exist in the viewer`);
          Assert.ok(
            button.hidden,
            `#${id} must be hidden when the iframe is sandboxed`
          );
        }
      });

      await waitForPdfJSClose(iframeBC);
    }
  );
});

/**
 * When the iframe sandbox includes `allow-downloads`, `ChromeActions.download`
 * must let the request through and a download must succeed end-to-end.
 */
add_task(async function test_sandbox_allow_downloads_permits_download() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: makeIframeParentUrl("allow-scripts allow-downloads") },
    async function (browser) {
      const iframeBC = getIframeBrowsingContext(browser);
      await waitForPdfJSLoaded(iframeBC);

      const { filePickerShown, downloadFinished, cleanup } =
        await awaitNextDownload();

      const spy = sinon.spy(PdfjsParent.prototype, "_saveURL");
      try {
        info("Triggering a download from inside the allow-downloads iframe...");
        await SpecialPowers.spawn(iframeBC, [], async () => {
          await content.wrappedJSObject.PDFViewerApplication.downloadOrSave();
        });

        await filePickerShown;
        const download = await downloadFinished;
        ok(
          download.succeeded,
          "The download succeeded when allow-downloads is set"
        );
        is(
          spy.callCount,
          1,
          "ChromeActions.download must forward saveURL exactly once"
        );
      } finally {
        spy.restore();
        cleanup();
      }

      await waitForPdfJSClose(iframeBC);
    }
  );
});

/**
 * A top-level navigation to a `blob:` PDF inherits the opener's CSP policy
 * (per https://w3c.github.io/webappsec-csp/#security-inherit-csp), so when the
 * opener is served with `Content-Security-Policy: sandbox` (no
 * `allow-downloads`), the inherited SANDBOXED_DOWNLOADS flag does reach the
 * pdf.js viewer's browsing context. The sandboxed-downloads flag only gates
 * embedded content, so a top-level PDF must still be downloadable even with the
 * flag set -- `ChromeActions.download` must forward the request.
 */
add_task(
  async function test_top_level_blob_with_csp_sandbox_permits_download() {
    await BrowserTestUtils.withNewTab(
      { gBrowser, url: CSP_OPENER_URL },
      async function (browser) {
        const newTabPromise = BrowserTestUtils.waitForNewTab(
          gBrowser,
          url => url.startsWith("blob:"),
          false
        );
        await SpecialPowers.spawn(browser, [], async () => {
          content.document.getElementById("go").click();
        });
        const newTab = await newTabPromise;
        const newBrowser = newTab.linkedBrowser;
        await waitForPdfJSLoaded(newBrowser);

        Assert.strictEqual(
          newBrowser.browsingContext.sandboxFlags & SANDBOXED_DOWNLOADS,
          SANDBOXED_DOWNLOADS,
          "the blob popup BC inherited SANDBOXED_DOWNLOADS from the opener CSP"
        );

        const { filePickerShown, downloadFinished, cleanup } =
          await awaitNextDownload();

        const spy = sinon.spy(PdfjsParent.prototype, "_saveURL");
        try {
          info(
            "Triggering a download in a top-level blob PDF whose policy was " +
              "inherited from a CSP-sandboxed opener..."
          );
          await SpecialPowers.spawn(newBrowser, [], async () => {
            await content.wrappedJSObject.PDFViewerApplication.downloadOrSave();
          });

          await filePickerShown;
          const download = await downloadFinished;
          ok(
            download.succeeded,
            "The download succeeded at top-level despite the inherited sandbox flag"
          );
          is(
            spy.callCount,
            1,
            "ChromeActions.download must forward saveURL at top-level even when " +
              "SANDBOXED_DOWNLOADS is inherited into a blob: navigation"
          );
        } finally {
          spy.restore();
          cleanup();
        }

        await waitForPdfJSClose(newBrowser, true);
      }
    );
  }
);

/**
 * The `sandbox` directive carried by a PDF response's HTTP
 * `Content-Security-Policy` header is ignored, so it never sets
 * SANDBOXED_DOWNLOADS on the viewer's browsing context -- unlike the inherited
 * blob: case in the previous test. Either way a top-level PDF is downloadable,
 * so the download must succeed.
 */
add_task(async function test_top_level_pdf_supports_download() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async function (browser) {
      await waitForPdfJS(browser, CSP_PDF_URL);

      Assert.strictEqual(
        browser.browsingContext.sandboxFlags & SANDBOXED_DOWNLOADS,
        0,
        "the PDF response's CSP sandbox directive must not set SANDBOXED_DOWNLOADS"
      );

      const { filePickerShown, downloadFinished, cleanup } =
        await awaitNextDownload();

      const spy = sinon.spy(PdfjsParent.prototype, "_saveURL");
      try {
        info("Clicking the download button at top-level...");
        await SpecialPowers.spawn(browser, [], () => {
          content.document.getElementById("downloadButton").click();
        });

        await filePickerShown;
        const download = await downloadFinished;
        ok(download.succeeded, "The top-level download succeeded");
        is(
          spy.callCount,
          1,
          "ChromeActions.download must forward saveURL at top-level"
        );
      } finally {
        spy.restore();
        cleanup();
      }

      await waitForPdfJSClose(browser);
    }
  );
});
