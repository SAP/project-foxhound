/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test nsIClipboard.getDataIfSmallerThan() in parent process.

add_task(async function test_text() {
  const TEST_CONTENT = "0123456789";

  info("Setup clipboard content");
  const transferable = createTransferable();
  transferable.addDataFlavor("text/plain");
  const supportsString = Cc["@mozilla.org/supports-string;1"].createInstance(
    Ci.nsISupportsString
  );
  supportsString.data = TEST_CONTENT;
  transferable.setTransferData("text/plain", supportsString);
  Services.clipboard.setData(
    transferable,
    null,
    Services.clipboard.kGlobalClipboard
  );

  info("Test threshold larger than the data length");
  await doTest({
    threshold: 100,
    expected: TEST_CONTENT,
  });

  info("Test threshold of the same byte size as the data");
  await doTest({
    threshold: TEST_CONTENT.length * 2,
    expected: TEST_CONTENT,
  });

  info("Test threshold smaller than the data length");
  await doTest({
    threshold: 1,
    expected: false,
  });

  info("Test non limit threshold");
  await doTest({
    threshold: 0,
    expected: TEST_CONTENT,
  });
});

async function doTest({ threshold, expected }) {
  const transferable = createTransferable();
  transferable.addDataFlavor("text/plain");

  const result = await Services.clipboard.getDataIfSmallerThan(
    transferable,
    threshold,
    Services.clipboard.kGlobalClipboard
  );

  if (expected) {
    Assert.equal(result, true, "The returned value should be true");

    const data = {};
    transferable.getTransferData("text/plain", data);

    Assert.equal(
      data.value.QueryInterface(Ci.nsISupportsString).data,
      expected,
      "clipboard data matches"
    );
  } else {
    Assert.equal(result, false, "The returned value should be false");

    try {
      const data = {};
      transferable.getTransferData("text/plain", data);
      Assert.ok(false, "getTransferData() should be failed");
    } catch (e) {
      Assert.ok(true, "getTransferData() should be failed");
    }
  }
}

function createTransferable() {
  const transferable = Cc["@mozilla.org/widget/transferable;1"].createInstance(
    Ci.nsITransferable
  );
  transferable.init(null);
  return transferable;
}
