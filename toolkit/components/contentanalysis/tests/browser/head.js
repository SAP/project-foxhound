/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { MockRegistrar } = ChromeUtils.importESModule(
  "resource://testing-common/MockRegistrar.sys.mjs"
);

// Wraps the given object in an XPConnect wrapper and, if an interface
// is passed, queries the result to that interface.
function xpcWrap(obj, iface) {
  let ifacePointer = Cc[
    "@mozilla.org/supports-interface-pointer;1"
  ].createInstance(Ci.nsISupportsInterfacePointer);

  ifacePointer.data = obj;
  if (iface) {
    return ifacePointer.data.QueryInterface(iface);
  }
  return ifacePointer.data;
}

/**
 * Mock a (set of) service(s) as the object mockService.
 *
 * @param {[string]} serviceNames
 *                   array of services names that mockService will be
 *                   allowed to QI to.  Must include the name of the
 *                   service referenced by contractId.
 * @param {string}   contractId
 *                   the component ID that will reference the mock object
 *                   instead of the original service
 * @param {object}   interfaceObj
 *                   interface object for the component
 * @param {object}   mockService
 *                   object that satisfies the contract well
 *                   enough to use as a mock of it
 * @returns {object} The newly-mocked service
 */
function mockService(serviceNames, contractId, interfaceObj, mockService) {
  // xpcWrap allows us to mock [implicit_jscontext] methods.
  let newService = {
    ...mockService,
    QueryInterface: ChromeUtils.generateQI(serviceNames),
  };
  let o = xpcWrap(newService, interfaceObj);
  let cid = MockRegistrar.register(contractId, o);
  registerCleanupFunction(() => {
    MockRegistrar.unregister(cid);
  });
  return newService;
}

/**
 * Mock the nsIContentAnalysis service with the object mockCAService.
 *
 * @param {object}    mockCAService
 *                    the service to mock for nsIContentAnalysis
 * @returns {object}  The newly-mocked service
 */
function mockContentAnalysisService(mockCAService) {
  return mockService(
    ["nsIContentAnalysis"],
    "@mozilla.org/contentanalysis;1",
    Ci.nsIContentAnalysis,
    mockCAService
  );
}

/**
 * Make an nsIContentAnalysisResponse.
 *
 * @param {number} action The action to take, from the
 *  nsIContentAnalysisResponse.Action enum.
 * @param {string} token The requestToken.
 * @returns {object} An object that conforms to nsIContentAnalysisResponse.
 */
function makeContentAnalysisResponse(action, token) {
  return {
    action,
    shouldAllowContent: action != Ci.nsIContentAnalysisResponse.eBlock,
    requestToken: token,
    acknowledge: _acknowledgement => {},
  };
}

async function waitForFileToAlmostMatchSize(filePath, expectedSize) {
  // In Cocoa the CGContext adds a hash, plus there are other minor
  // non-user-visible differences, so we need to be a bit more sloppy there.
  //
  // We see one byte difference in Windows and Linux on automation sometimes,
  // though files are consistently the same locally, that needs
  // investigation, but it's probably harmless.
  // Note that this is copied from browser_print_stream.js.
  const maxSizeDifference = AppConstants.platform == "macosx" ? 100 : 3;

  // Buffering shenanigans? Wait for sizes to match... There's no great
  // IOUtils methods to force a flush without writing anything...
  // Note that this means if this results in a timeout this is exactly
  // the same as a test failure.
  // This is taken from toolkit/components/printing/tests/browser_print_stream.js
  await TestUtils.waitForCondition(async function () {
    let fileStat = await IOUtils.stat(filePath);

    info("got size: " + fileStat.size + " expected: " + expectedSize);
    Assert.greater(
      fileStat.size,
      0,
      "File should not be empty: " + fileStat.size
    );
    return Math.abs(fileStat.size - expectedSize) <= maxSizeDifference;
  }, "Sizes should (almost) match");
}
