/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

let mockCA = makeMockContentAnalysis();

add_setup(async function test_setup() {
  mockCA = await mockContentAnalysisService(mockCA);
});

const PAGE_URL =
  "https://example.com/browser/toolkit/components/contentanalysis/tests/browser/clipboard_paste_changingclipboardinternal.html";
const CLIPBOARD_TEXT_STRING_ORIGINAL = "Original text";
const CLIPBOARD_TEXT_STRING_NEW = "New text";

// Test that if the JS paste event handler changes the clipboard contents
// while Content Analysis is ongoing, the new contents are properly put
// in the DOM element. (whether a new CA scan is done or not depends on
// the browser.contentanalysis.bypass_for_same_tab_operations pref)
async function testClipboardPasteWithContentAnalysis(
  shouldAllow,
  bypassForSameTab
) {
  mockCA.setupForTest(shouldAllow);
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "browser.contentanalysis.bypass_for_same_tab_operations",
        bypassForSameTab,
      ],
    ],
  });
  registerCleanupFunction(async function () {
    SpecialPowers.popPrefEnv();
  });

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, PAGE_URL);
  let browser = tab.linkedBrowser;

  await SpecialPowers.spawn(browser, [shouldAllow], async shouldAllow => {
    content.document.getElementById("pasteAllowed").checked = shouldAllow;
  });

  await testPasteWithElementId(
    "testDiv",
    browser,
    shouldAllow,
    bypassForSameTab
  );
  await testPasteWithElementId(
    "testInput",
    browser,
    shouldAllow,
    bypassForSameTab
  );

  BrowserTestUtils.removeTab(tab);
}

add_task(
  async function testClipboardPasteWithContentAnalysisAllowWithBypassForSameTab() {
    await testClipboardPasteWithContentAnalysis(true, true);
  }
);

add_task(
  async function testClipboardPasteWithContentAnalysisAllowWithNoBypassForSameTab() {
    await testClipboardPasteWithContentAnalysis(true, false);
  }
);

add_task(
  async function testClipboardPasteWithContentAnalysisBlockWithBypassForSameTab() {
    await testClipboardPasteWithContentAnalysis(false, true);
  }
);

add_task(
  async function testClipboardPasteWithContentAnalysisBlockWithNoBypassForSameTab() {
    await testClipboardPasteWithContentAnalysis(false, false);
  }
);
function setClipboardData(clipboardString) {
  const trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(
    Ci.nsITransferable
  );
  trans.init(null);
  trans.addDataFlavor("text/plain");
  const str = Cc["@mozilla.org/supports-string;1"].createInstance(
    Ci.nsISupportsString
  );
  str.data = clipboardString;
  trans.setTransferData("text/plain", str);

  // Write to clipboard.
  Services.clipboard.setData(trans, null, Ci.nsIClipboard.kGlobalClipboard);
}

async function testPasteWithElementId(
  elementId,
  browser,
  shouldAllow,
  bypassForSameTab
) {
  setClipboardData(CLIPBOARD_TEXT_STRING_ORIGINAL);
  let resultPromise = SpecialPowers.spawn(browser, [], () => {
    return new Promise(resolve => {
      content.document.addEventListener(
        "testresult",
        event => {
          resolve(event.detail.result);
        },
        { once: true }
      );
    });
  });

  // Paste into content
  await setElementValue(browser, elementId, "");
  await SpecialPowers.spawn(browser, [elementId], async elementId => {
    content.document.getElementById(elementId).focus();
  });
  await BrowserTestUtils.synthesizeKey("v", { accelKey: true }, browser);
  let result = await resultPromise;
  is(result, undefined, "Got unexpected result from page");

  is(
    mockCA.calls.length,
    bypassForSameTab ? 1 : 2,
    "Correct number of calls to Content Analysis"
  );
  // Note that, because the page is changing the clipboard, we don't expect these to
  // be grouped with the same user_action_id.
  assertContentAnalysisRequest(
    mockCA.calls[0],
    CLIPBOARD_TEXT_STRING_ORIGINAL,
    mockCA.calls[0].userActionId,
    1
  );
  // Note that if bypassForSameTab is true we don't expect to check CLIPBOARD_TEXT_STRING_NEW
  // since it was set from the webpage.
  if (!bypassForSameTab) {
    assertContentAnalysisRequest(
      mockCA.calls[1],
      CLIPBOARD_TEXT_STRING_NEW,
      mockCA.calls[1].userActionId,
      1
    );
  }
  mockCA.clearCalls();
  let value = await getElementValue(browser, elementId);
  // Since the clipboard was set during the paste event, that new
  // value should get set in the HTML element.
  // Similarly to above, if bypassForSameTab is true we expect
  // the content to be set.
  is(
    value,
    shouldAllow || bypassForSameTab ? CLIPBOARD_TEXT_STRING_NEW : "",
    "element has correct value"
  );
}

function assertContentAnalysisRequest(
  request,
  expectedText,
  expectedUserActionId,
  expectedRequestsCount
) {
  is(request.url.spec, PAGE_URL, "request has correct URL");
  is(
    request.analysisType,
    Ci.nsIContentAnalysisRequest.eBulkDataEntry,
    "request has correct analysisType"
  );
  is(
    request.reason,
    Ci.nsIContentAnalysisRequest.eClipboardPaste,
    "request has correct reason"
  );
  is(
    request.operationTypeForDisplay,
    Ci.nsIContentAnalysisRequest.eClipboard,
    "request has correct operationTypeForDisplay"
  );
  is(request.filePath, "", "request filePath should match");
  is(request.textContent, expectedText, "request textContent should match");
  is(
    request.userActionRequestsCount,
    expectedRequestsCount,
    "request userActionRequestsCount should match"
  );
  is(
    request.userActionId,
    expectedUserActionId,
    "request userActionId should match"
  );
  ok(request.userActionId.length, "request userActionId should not be empty");
  is(request.printDataHandle, 0, "request printDataHandle should not be 0");
  is(request.printDataSize, 0, "request printDataSize should not be 0");
  ok(!!request.requestToken.length, "request requestToken should not be empty");
}

async function getElementValue(browser, elementId) {
  return await SpecialPowers.spawn(browser, [elementId], async elementId => {
    let element = content.document.getElementById(elementId);
    return element.value ?? element.innerText;
  });
}

async function setElementValue(browser, elementId, value) {
  await SpecialPowers.spawn(
    browser,
    [elementId, value],
    async (elementId, value) => {
      let element = content.document.getElementById(elementId);
      if (element.hasOwnProperty("value")) {
        element.value = value;
      } else {
        element.innerText = value;
      }
    }
  );
}
