/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

let mockCA = makeMockContentAnalysis();

add_setup(async function test_setup() {
  mockCA = await mockContentAnalysisService(mockCA);
});

const PAGE_URL =
  "https://example.com/browser/toolkit/components/contentanalysis/tests/browser/clipboard_paste_inputandtextarea.html";
const CLIPBOARD_TEXT_STRING = "Just some text";

const TEST_MODES = Object.freeze({
  ALLOW: {
    caAllow: true,
    shouldPaste: true,
    isEmpty: false,
    shouldRunCA: true,
  },
  BLOCK: {
    caAllow: false,
    shouldPaste: false,
    isEmpty: false,
    shouldRunCA: true,
  },
  EMPTY: {
    caAllow: false,
    shouldPaste: true,
    isEmpty: true,
    shouldRunCA: false,
  },
  PREFOFF: {
    caAllow: false,
    shouldPaste: true,
    isEmpty: false,
    shouldRunCA: false,
  },
});
async function testClipboardPaste(testMode) {
  mockCA.setupForTest(testMode.caAllow);

  setClipboardData(testMode.isEmpty ? "" : CLIPBOARD_TEXT_STRING);

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, PAGE_URL);
  let browser = tab.linkedBrowser;

  await SpecialPowers.spawn(browser, [testMode], async testMode => {
    content.document.getElementById("pasteAllowed").checked =
      testMode.shouldPaste;
    content.document.getElementById("isEmptyPaste").checked = testMode.isEmpty;
  });
  await testPasteWithElementId("testInput", browser, testMode);
  // Make sure pasting the same data twice doesn't use the cache
  await setElementValue(browser, "testInput", "");
  await testPasteWithElementId("testInput", browser, testMode);

  await testPasteWithElementId("testTextArea", browser, testMode);
  // Make sure pasting the same data twice doesn't use the cache
  await setElementValue(browser, "testTextArea", "");
  await testPasteWithElementId("testTextArea", browser, testMode);

  BrowserTestUtils.removeTab(tab);
}

async function testEmptyClipboardPaste() {
  mockCA.setupForTest(true);

  setClipboardData("");

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, PAGE_URL);
  let browser = tab.linkedBrowser;
  await SpecialPowers.spawn(browser, [], async () => {
    content.document.getElementById("pasteAllowed").checked = true;
    content.document.getElementById("isEmptyPaste").checked = true;
  });

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
  await SpecialPowers.spawn(browser, [], async () => {
    content.document.getElementById("testInput").focus();
  });
  await BrowserTestUtils.synthesizeKey("v", { accelKey: true }, browser);
  let result = await resultPromise;
  is(result, undefined, "Got unexpected result from page");

  is(
    mockCA.calls.length,
    0,
    "Expect no calls to Content Analysis since it's an empty string"
  );
  let value = await getElementValue(browser, "testInput");
  is(value, "", "element has correct empty value");

  BrowserTestUtils.removeTab(tab);
}

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

async function testPasteWithElementId(elementId, browser, testMode) {
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
  await SpecialPowers.spawn(browser, [elementId], async elementId => {
    content.document.getElementById(elementId).focus();
  });
  await BrowserTestUtils.synthesizeKey("v", { accelKey: true }, browser);
  let result = await resultPromise;
  is(result, undefined, "Got unexpected result from page");

  is(
    mockCA.calls.length,
    testMode.shouldRunCA ? 1 : 0,
    "Correct number of calls to Content Analysis"
  );
  if (testMode.shouldRunCA) {
    assertContentAnalysisRequest(
      mockCA.calls[0],
      CLIPBOARD_TEXT_STRING,
      mockCA.calls[0].userActionId,
      1
    );
  }
  mockCA.clearCalls();
  let value = await getElementValue(browser, elementId);
  is(
    value,
    testMode.shouldPaste && !testMode.isEmpty ? CLIPBOARD_TEXT_STRING : "",
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
    return content.document.getElementById(elementId).value;
  });
}

async function setElementValue(browser, elementId, value) {
  await SpecialPowers.spawn(
    browser,
    [elementId, value],
    async (elementId, value) => {
      content.document.getElementById(elementId).value = value;
    }
  );
}

add_task(async function testClipboardPasteWithContentAnalysisAllow() {
  await testClipboardPaste(TEST_MODES.ALLOW);
});

add_task(async function testClipboardPasteWithContentAnalysisBlock() {
  await testClipboardPaste(TEST_MODES.BLOCK);
});

add_task(async function testClipboardPasteWithContentAnalysisBlockButPrefOff() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.contentanalysis.interception_point.clipboard.enabled", false],
    ],
  });
  await testClipboardPaste(TEST_MODES.PREFOFF);
  await SpecialPowers.popPrefEnv();
});

add_task(async function testClipboardEmptyPasteWithContentAnalysis() {
  await testClipboardPaste(TEST_MODES.EMPTY);
});
