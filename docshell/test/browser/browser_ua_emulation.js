/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const HTML = `
  <h1>Test browser user agent emulation</h1>
  <iframe id='test-iframe'></iframe>
`;
const URL = `https://example.com/document-builder.sjs?html=${encodeURI(HTML)}`;

// Test that the docShell UA emulation works
async function contentTaskNoOverride() {
  let docshell = docShell;
  is(
    docshell.browsingContext.customUserAgent,
    "",
    "There should initially be no customUserAgent"
  );

  return content.navigator.userAgent;
}

async function contentTaskOverride() {
  let docshell = docShell;
  is(
    docshell.browsingContext.customUserAgent,
    "foo",
    "The user agent should be changed to foo"
  );

  is(
    content.navigator.userAgent,
    "foo",
    "The user agent should be changed to foo"
  );

  let frameWin = content.document.querySelector("#test-iframe").contentWindow;
  is(
    frameWin.navigator.userAgent,
    "foo",
    "The UA should be passed on to frames."
  );

  let newFrame = content.document.createElement("iframe");
  content.document.body.appendChild(newFrame);

  let newFrameWin = newFrame.contentWindow;
  is(
    newFrameWin.navigator.userAgent,
    "foo",
    "Newly created frames should use the new UA"
  );

  newFrameWin.location.reload();
  await ContentTaskUtils.waitForEvent(newFrame, "load");

  is(
    newFrameWin.navigator.userAgent,
    "foo",
    "New UA should persist across reloads"
  );
}

async function contentTaskCleared(initialUA) {
  is(
    docShell.browsingContext.customUserAgent,
    "",
    "customUserAgent was cleared"
  );

  is(content.navigator.userAgent, initialUA, "document has the initial UA");
}

add_task(async function () {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: URL },
    async function (browser) {
      const initialUA = await SpecialPowers.spawn(
        browser,
        [],
        contentTaskNoOverride
      );

      let browsingContext = BrowserTestUtils.getBrowsingContextFrom(browser);
      browsingContext.customUserAgent = "foo";

      await SpecialPowers.spawn(browser, [], contentTaskOverride);

      info(
        "Check that clearing customUserAgent resets userAgent to its initial value"
      );

      // First we need to reload the page, as the user agent can be retrieved from the User-Agent header.
      browser.reload();
      await BrowserTestUtils.browserLoaded(browser);

      browsingContext.customUserAgent = "";
      await SpecialPowers.spawn(browser, [initialUA], contentTaskCleared);

      // A second reload should reset the User-Agent header, and make navigate.userAgent correct again.
      browser.reload();
      await BrowserTestUtils.browserLoaded(browser);

      browsingContext.customUserAgent = "";
      await SpecialPowers.spawn(browser, [initialUA], contentTaskCleared);
    }
  );
});
