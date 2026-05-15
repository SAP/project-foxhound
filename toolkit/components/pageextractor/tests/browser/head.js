/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

const BLANK_PAGE =
  "data:text/html;charset=utf-8,<!DOCTYPE html><title>Blank</title>Blank page";

/** @type {import("../../../../../netwerk/test/httpserver/httpd.sys.mjs")} */
const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

/**
 * Use a tagged template literal to create a page extraction actor test. This spins
 * up an http server that serves the markup in a new tab. The page extractor can then
 * be used on the page.
 *
 * @param {TemplateStringsArray} strings - The literal string parts.
 * @param {...any} values - The interpolated expressions.
 */
async function html(strings, ...values) {
  // Convert the arguments into markup.
  let markup = "";
  for (let i = 0; i < strings.length; i++) {
    markup += strings[i];
    if (i < values.length) {
      markup += values[i];
    }
  }

  markup = `<!DOCTYPE html><body>${markup}</body>`;

  const { url, serverClosed } = serveOnce(markup);

  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    url,
    true // waitForLoad
  );

  const actor =
    tab.linkedBrowser.browsingContext.currentWindowGlobal.getActor(
      "PageExtractor"
    );

  return {
    /**
     * @type {PageExtractorParent}
     */
    actor,

    tab,

    /**
     * Get a new page extractor, which can change when navigating pages.
     *
     * @returns {PageExtractorParent}
     */
    getPageExtractor() {
      return tab.linkedBrowser.browsingContext.currentWindowGlobal.getActor(
        "PageExtractor"
      );
    },

    async cleanup() {
      info("Cleaning up");
      await serverClosed;
      BrowserTestUtils.removeTab(tab);
    },
  };
}

/**
 * Start an HTTP server that serves page.html with the provided HTML.
 * Explicitly encode the text as UTF-8 to correctly handle characters outside Latin-1,
 * which the HttpServer renders incorrectly by default.
 *
 * @param {string} html
 * @param {number} statusCode
 */
function serveOnce(html, statusCode = 200) {
  info("Create server");
  const server = new HttpServer();

  const { promise, resolve } = Promise.withResolvers();
  const encoder = new TextEncoder();
  const htmlUtf8 = encoder.encode(html);

  server.registerPathHandler("/page.html", (request, response) => {
    info("Request received for: " + url);
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setStatusLine(request.httpVersion, statusCode);

    const binaryOutputStream = Cc[
      "@mozilla.org/binaryoutputstream;1"
    ].createInstance(Ci.nsIBinaryOutputStream);

    binaryOutputStream.setOutputStream(response.bodyOutputStream);
    binaryOutputStream.writeByteArray(htmlUtf8);

    resolve(server.stop());
  });

  server.start(-1);

  let { primaryHost, primaryPort } = server.identity;
  // eslint-disable-next-line @microsoft/sdl/no-insecure-url
  const url = `http://${primaryHost}:${primaryPort}/page.html`;
  info("Server listening for: " + url);

  return { url, serverClosed: promise };
}

/**
 * Click the reader-mode button if the reader-mode button is available.
 * Fails if the reader-mode button is hidden.
 */
async function toggleReaderMode() {
  const readerButton = document.getElementById("reader-mode-button");
  await BrowserTestUtils.waitForMutationCondition(
    readerButton,
    { attributes: true, attributeFilter: ["hidden"] },
    () => readerButton.hidden === false
  );

  readerButton.getAttribute("readeractive")
    ? info("Exiting reader mode")
    : info("Entering reader mode");

  const readyPromise = readerButton.getAttribute("readeractive")
    ? BrowserTestUtils.waitForMutationCondition(
        readerButton,
        { attributes: true, attributeFilter: ["readeractive"] },
        () => !readerButton.getAttribute("readeractive")
      )
    : BrowserTestUtils.waitForContentEvent(
        gBrowser.selectedBrowser,
        "AboutReaderContentReady"
      );

  click(readerButton, "Clicking the reader-mode button");
  await readyPromise;
}

function click(button, message) {
  info(message);
  if (button.hidden) {
    throw new Error("The button was hidden when trying to click it.");
  }
  button.click();
}

/**
 * @param {string} file
 */
async function openSupportFile(file) {
  // Support files can be served up from example.com
  const url_prefix = "https://example.com/browser/";
  const path_prefix = "toolkit/components/pageextractor/tests/browser/";
  const url = url_prefix + path_prefix + file;

  // Start the tab at a blank page.
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    BLANK_PAGE,
    true // waitForLoad
  );

  BrowserTestUtils.startLoadingURIString(tab.linkedBrowser, url);
  await BrowserTestUtils.browserLoaded(
    tab.linkedBrowser,
    /* includeSubFrames */ false,
    url
  );

  async function cleanup() {
    if (url.endsWith(".pdf")) {
      // Wait for the PDFViewerApplication to be closed before removing the
      // tab to avoid spurious errors and potential intermittents.
      await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
        const viewer = content.wrappedJSObject.PDFViewerApplication;
        await viewer.testingClose();
      });
    }
    BrowserTestUtils.removeTab(tab);
  }

  return {
    cleanup,
    /**
     * @returns {PageExtractorParent}
     */
    getPageExtractor() {
      return tab.linkedBrowser.browsingContext.currentWindowGlobal.getActor(
        "PageExtractor"
      );
    },
  };
}
