/**
 * This test compares canvas randomization on a parent and an iframe, and ensures that the canvas randomization key
 * is inherited correctly.  (e.g. that the canvases have the same random value)
 *
 * It runs all the tests twice - once for when the iframe is cross-domain, and once when it is same-domain
 *
 * Covers the following cases:
 *  - RFP/FPP is disabled entirely
 *  - RFP is enabled entirely, and only in PBM
 *  - FPP is enabled entirely, and only in PBM
 *  - A normal window when FPP is enabled globally and RFP is enabled in PBM, Protections Enabled and Disabled
 *
 */

"use strict";

// =============================================================================================

async function testCanvasRandomization(result, expectedResults, extraData) {
  let testDesc = extraData.testDesc;

  let parent = result.mine;
  let child = result.theirs;
  let unmodified = UNMODIFIED_CANVAS_DATA;

  if (expectedResults.shouldBeRandom) {
    if (expectedResults.shouldRFPApply) {
      Assert.notEqual(
        parent,
        child,
        `Checking ${testDesc} for RFP canvas randomization parent != child` +
          ` is ${parent != child}`
      );
      Assert.notEqual(
        parent,
        unmodified,
        `Checking ${testDesc} for RFP canvas randomization, parent != unmodified` +
          ` is ${parent != unmodified}`
      );
    } else {
      Assert.equal(
        parent,
        child,
        `Checking ${testDesc} for canvas randomization parent == child` +
          ` is ${parent == child}`
      );
      Assert.notEqual(
        parent,
        unmodified,
        `Checking ${testDesc} for canvas randomization, parent != unmodified` +
          ` is ${parent != unmodified}`
      );
    }
  } else {
    Assert.equal(
      parent,
      child,
      `Checking ${testDesc} for no canvas randomization, parent == child` +
        ` is ${parent == child}`
    );
    Assert.equal(
      parent,
      unmodified,
      `Checking ${testDesc} for no canvas randomization, parent == unmodified` +
        ` is ${parent == unmodified}`
    );
  }
}

requestLongerTimeout(2);

var UNMODIFIED_CANVAS_DATA = undefined;

add_setup(async function () {
  // Make sure Efficient Randomization is the only one on
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "privacy.fingerprintingProtection.overrides",
        "+EfficientCanvasRandomization,-CanvasRandomization",
      ],
    ],
  });

  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.fingerprintingProtection", false],
      ["privacy.fingerprintingProtection.pbmode", false],
      ["privacy.resistFingerprinting", false],
    ],
  });

  function runExtractCanvasData(tab) {
    return SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
      const canvas = content.document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;

      const context = canvas.getContext("2d");

      context.fillStyle = "#EE2222";
      context.fillRect(0, 0, 100, 100);
      context.fillStyle = "#2222EE";
      context.fillRect(20, 20, 100, 100);

      // Add the canvas element to the document
      content.document.body.appendChild(canvas);

      let url = canvas.toDataURL();
      return url;
    });
  }

  const emptyPage =
    getRootDirectory(gTestPath).replace(
      "chrome://mochitests/content",
      "https://example.com"
    ) + "empty.html";

  // Open a tab for extracting the canvas data.
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, emptyPage);

  let data = await runExtractCanvasData(tab);
  UNMODIFIED_CANVAS_DATA = data;

  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

// Keep the test simpler, we do pixel tests in other tests.

// Note that we are inheriting the randomization key ACROSS top-level domains that are cross-domain, because the iframe is a 3rd party domain
let uri = `https://${FRAMER_DOMAIN}/browser/browser/components/resistfingerprinting/test/browser/file_efficientcanvascompare_iframer.html?mode=iframe`;

let shouldBeRandom = {
  shouldBeRandom: true,
};
let noRandom = {
  shouldBeRandom: false,
};
let expectedResults = undefined;

expectedResults = structuredClone(noRandom);
add_task(
  defaultsTest.bind(null, uri, testCanvasRandomization, expectedResults)
);

expectedResults = structuredClone(shouldBeRandom);
add_task(
  defaultsPBMTest.bind(null, uri, testCanvasRandomization, expectedResults)
);

expectedResults = structuredClone(shouldBeRandom);
add_task(
  simpleRFPTest.bind(null, uri, testCanvasRandomization, expectedResults)
);

// Test a private window with RFP enabled in PBMode
expectedResults = structuredClone(shouldBeRandom);
add_task(
  simplePBMRFPTest.bind(null, uri, testCanvasRandomization, expectedResults)
);

expectedResults = structuredClone(shouldBeRandom);
add_task(
  simpleFPPTest.bind(null, uri, testCanvasRandomization, expectedResults)
);

// Test a Private Window with FPP Enabled in PBM
expectedResults = structuredClone(shouldBeRandom);
add_task(
  simplePBMFPPTest.bind(null, uri, testCanvasRandomization, expectedResults)
);

// Test RFP Enabled in PBM and FPP enabled in Normal Browsing Mode, No Protections
expectedResults = structuredClone(noRandom);
add_task(
  RFPPBMFPP_NormalMode_NoProtectionsTest.bind(
    null,
    uri,
    testCanvasRandomization,
    expectedResults
  )
);

// Test RFP Enabled in PBM and FPP enabled in Normal Browsing Mode, Protections Enabled
expectedResults = structuredClone(shouldBeRandom);
add_task(
  RFPPBMFPP_NormalMode_ProtectionsTest.bind(
    null,
    uri,
    testCanvasRandomization,
    expectedResults
  )
);

// And here the we are inheriting the randomization key into an iframe that is same-domain to the parent
uri = `https://${IFRAME_DOMAIN}/browser/browser/components/resistfingerprinting/test/browser/file_efficientcanvascompare_iframer.html?mode=iframe`;

expectedResults = structuredClone(noRandom);
add_task(
  defaultsTest.bind(null, uri, testCanvasRandomization, expectedResults)
);

expectedResults = structuredClone(shouldBeRandom);
add_task(
  simpleRFPTest.bind(null, uri, testCanvasRandomization, expectedResults)
);

// Test a private window with RFP enabled in PBMode
expectedResults = structuredClone(shouldBeRandom);
add_task(
  simplePBMRFPTest.bind(null, uri, testCanvasRandomization, expectedResults)
);

expectedResults = structuredClone(shouldBeRandom);
add_task(
  simpleFPPTest.bind(null, uri, testCanvasRandomization, expectedResults)
);

// Test a Private Window with FPP Enabled in PBM
expectedResults = structuredClone(shouldBeRandom);
add_task(
  simplePBMFPPTest.bind(null, uri, testCanvasRandomization, expectedResults)
);

// Test RFP Enabled in PBM and FPP enabled in Normal Browsing Mode, No Protections
expectedResults = structuredClone(noRandom);
add_task(
  RFPPBMFPP_NormalMode_NoProtectionsTest.bind(
    null,
    uri,
    testCanvasRandomization,
    expectedResults
  )
);

// Test RFP Enabled in PBM and FPP enabled in Normal Browsing Mode, Protections Enabled
expectedResults = structuredClone(shouldBeRandom);
add_task(
  RFPPBMFPP_NormalMode_ProtectionsTest.bind(
    null,
    uri,
    testCanvasRandomization,
    expectedResults
  )
);
