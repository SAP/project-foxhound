/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const Cc = SpecialPowers.Cc;
const Ci = SpecialPowers.Ci;

const clipboard = SpecialPowers.Services.clipboard;

function _createTransferable() {
  const loadContext = SpecialPowers.wrap(window).docShell.QueryInterface(
    Ci.nsILoadContext
  );
  const transferable = Cc["@mozilla.org/widget/transferable;1"].createInstance(
    Ci.nsITransferable
  );
  transferable.init(loadContext);
  return transferable;
}

async function _doTest({ threshold, expected }) {
  const transferable = _createTransferable();
  transferable.addDataFlavor("text/plain");

  const result = await clipboard.getDataIfSmallerThan(
    transferable,
    threshold,
    clipboard.kGlobalClipboard,
    SpecialPowers.wrap(window).browsingContext.currentWindowContext
  );

  if (expected) {
    is(result, true, "The returned value should be true");

    const data = SpecialPowers.createBlankObject();
    transferable.getTransferData("text/plain", data);

    is(
      data.value.QueryInterface(Ci.nsISupportsString).data,
      expected,
      "clipboard data matches"
    );
  } else {
    is(result, false, "The returned value should be false");

    try {
      const data = SpecialPowers.createBlankObject();
      transferable.getTransferData("text/plain", data);

      ok(false, "getTransferData() should be failed");
    } catch (e) {
      ok(true, "getTransferData() should be failed");
    }
  }
}

async function doAllTests({ isContentanalysisEnabled }) {
  const ca = Cc["@mozilla.org/contentanalysis;1"].getService(
    Ci.nsIContentAnalysis
  );
  ca.testOnlySetCACmdLineArg(isContentanalysisEnabled);
  await SpecialPowers.pushPrefEnv({
    set: [["browser.contentanalysis.enabled", isContentanalysisEnabled]],
  });
  SimpleTest.registerCleanupFunction(() => {
    ca.testOnlySetCACmdLineArg(false);
  });

  const TEST_CONTENT = "0123456789";
  const transferable = _createTransferable();
  transferable.addDataFlavor("text/plain");

  const supportsString = Cc["@mozilla.org/supports-string;1"].createInstance(
    Ci.nsISupportsString
  );
  supportsString.data = TEST_CONTENT;
  transferable.setTransferData("text/plain", supportsString);
  clipboard.setData(transferable, null, clipboard.kGlobalClipboard);

  info("Test threshold larger than the data length");
  await _doTest({
    threshold: 100,
    expected: TEST_CONTENT,
  });

  info("Test threshold of the same byte size as the data");
  await _doTest({
    threshold: TEST_CONTENT.length * 2,
    expected: TEST_CONTENT,
  });

  info("Test threshold smaller than the data length");
  await _doTest({
    threshold: 1,
    expected: false,
  });

  info("Test non limit threshold");
  await _doTest({
    threshold: 0,
    expected: TEST_CONTENT,
  });
}
