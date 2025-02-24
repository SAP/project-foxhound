/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/toolkit/components/printing/tests/head.js",
  this
);

const PSSVC = Cc["@mozilla.org/gfx/printsettings-service;1"].getService(
  Ci.nsIPrintSettingsService
);

let mockCA = makeMockContentAnalysis();

add_setup(async function test_setup() {
  mockCA = mockContentAnalysisService(mockCA);
});

const TEST_PAGE_URL = PrintHelper.getTestPageUrlHTTPS(
  "changing_page_for_print.html"
);

function addUniqueSuffix(prefix) {
  return `${prefix}-${Services.uuid
    .generateUUID()
    .toString()
    .slice(1, -1)}.pdf`;
}

async function printToDestination(aBrowser, aDestination) {
  let tmpDir = Services.dirsvc.get("TmpD", Ci.nsIFile);
  let fileName = addUniqueSuffix(`printDestinationTest-${aDestination}`);
  let filePath = PathUtils.join(tmpDir.path, fileName);

  info(`Printing to ${filePath}`);

  let settings = PSSVC.createNewPrintSettings();
  settings.outputFormat = Ci.nsIPrintSettings.kOutputFormatPDF;
  settings.outputDestination = aDestination;

  settings.headerStrCenter = "";
  settings.headerStrLeft = "";
  settings.headerStrRight = "";
  settings.footerStrCenter = "";
  settings.footerStrLeft = "";
  settings.footerStrRight = "";

  settings.unwriteableMarginTop = 1; /* Just to ensure settings are respected on both */
  let outStream = null;
  if (aDestination == Ci.nsIPrintSettings.kOutputDestinationFile) {
    settings.toFileName = PathUtils.join(tmpDir.path, fileName);
  } else {
    is(aDestination, Ci.nsIPrintSettings.kOutputDestinationStream);
    outStream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(
      Ci.nsIFileOutputStream
    );
    let tmpFile = tmpDir.clone();
    tmpFile.append(fileName);
    outStream.init(tmpFile, -1, 0o666, 0);
    settings.outputStream = outStream;
  }

  await aBrowser.browsingContext.print(settings);

  return filePath;
}

function assertContentAnalysisRequest(request) {
  is(request.url.spec, TEST_PAGE_URL, "request has correct URL");
  is(
    request.analysisType,
    Ci.nsIContentAnalysisRequest.ePrint,
    "request has print analysisType"
  );
  is(
    request.operationTypeForDisplay,
    Ci.nsIContentAnalysisRequest.eOperationPrint,
    "request has print operationTypeForDisplay"
  );
  is(request.textContent, "", "request textContent should be empty");
  is(request.filePath, "", "request filePath should be empty");
  isnot(request.printDataHandle, 0, "request printDataHandle should not be 0");
  isnot(request.printDataSize, 0, "request printDataSize should not be 0");
  ok(!!request.requestToken.length, "request requestToken should not be empty");
}

add_task(
  async function testPrintToStreamWithContentAnalysisActiveAndAllowing() {
    await PrintHelper.withTestPage(
      async helper => {
        mockCA.setupForTest(true);

        let filePath = await printToDestination(
          helper.sourceBrowser,
          Ci.nsIPrintSettings.kOutputDestinationFile
        );
        is(
          mockCA.calls.length,
          1,
          "Correct number of calls to Content Analysis"
        );
        assertContentAnalysisRequest(mockCA.calls[0]);

        // This effectively tests that the PDF content sent to Content Analysis
        // and the content that is actually printed matches. This is necessary
        // because a previous iteration of the Content Analysis code didn't use
        // a static Document clone for this and so the content would differ. (since
        // the .html file in question adds content to the page when print events
        // happen)
        await waitForFileToAlmostMatchSize(
          filePath,
          mockCA.calls[0].printDataSize
        );

        await IOUtils.remove(filePath);
      },
      TEST_PAGE_URL,
      true
    );
  }
);

add_task(
  async function testPrintToStreamWithContentAnalysisActiveAndBlocking() {
    await PrintHelper.withTestPage(
      async helper => {
        mockCA.setupForTest(false);

        try {
          await printToDestination(
            helper.sourceBrowser,
            Ci.nsIPrintSettings.kOutputDestinationFile
          );
          ok(false, "Content analysis should make this fail to print");
        } catch (e) {
          ok(
            /NS_ERROR_CONTENT_BLOCKED/.test(e.toString()),
            "Got content blocked error"
          );
        }
        is(
          mockCA.calls.length,
          1,
          "Correct number of calls to Content Analysis"
        );
        assertContentAnalysisRequest(mockCA.calls[0]);
      },
      TEST_PAGE_URL,
      true
    );
  }
);

add_task(async function testPrintToStreamWithContentAnalysisReturningError() {
  await PrintHelper.withTestPage(
    async helper => {
      expectUncaughtException();
      mockCA.setupForTestWithError(Cr.NS_ERROR_NOT_AVAILABLE);

      try {
        await printToDestination(
          helper.sourceBrowser,
          Ci.nsIPrintSettings.kOutputDestinationFile
        );
        ok(false, "Content analysis should make this fail to print");
      } catch (e) {
        ok(
          /NS_ERROR_NOT_AVAILABLE/.test(e.toString()),
          "Error in mock CA was propagated out"
        );
      }
      is(mockCA.calls.length, 1, "Correct number of calls to Content Analysis");
      assertContentAnalysisRequest(mockCA.calls[0]);
    },
    TEST_PAGE_URL,
    true
  );
});

add_task(async function testPrintThroughDialogWithContentAnalysisActive() {
  await PrintHelper.withTestPage(
    async helper => {
      mockCA.setupForTest(true);

      let fileName = addUniqueSuffix(`printDialogTest`);
      let file = helper.mockFilePicker(fileName);
      info(`Printing to ${file.path}`);
      await helper.startPrint();
      await helper.assertPrintToFile(file, () => {
        EventUtils.sendKey("return", helper.win);
      });

      is(mockCA.calls.length, 1, "Correct number of calls to Content Analysis");
      assertContentAnalysisRequest(mockCA.calls[0]);

      await waitForFileToAlmostMatchSize(
        file.path,
        mockCA.calls[0].printDataSize
      );
    },
    TEST_PAGE_URL,
    true
  );
});

add_task(
  async function testPrintThroughDialogWithContentAnalysisActiveAndBlocking() {
    await PrintHelper.withTestPage(
      async helper => {
        mockCA.setupForTest(false);

        await helper.startPrint();
        let fileName = addUniqueSuffix(`printDialogTest`);
        let file = helper.mockFilePicker(fileName);
        info(`Printing to ${file.path}`);
        try {
          await helper.assertPrintToFile(file, () => {
            EventUtils.sendKey("return", helper.win);
          });
        } catch (e) {
          ok(
            /Wait for target file to get created/.test(e.toString()),
            "Target file should not get created"
          );
        }
        ok(!file.exists(), "File should not exist");

        is(
          mockCA.calls.length,
          1,
          "Correct number of calls to Content Analysis"
        );
        assertContentAnalysisRequest(mockCA.calls[0]);
      },
      TEST_PAGE_URL,
      true
    );
  }
);

add_task(
  async function testPrintThroughDialogWithContentAnalysisReturningError() {
    await PrintHelper.withTestPage(
      async helper => {
        expectUncaughtException();
        mockCA.setupForTestWithError(Cr.NS_ERROR_NOT_AVAILABLE);

        await helper.startPrint();
        let fileName = addUniqueSuffix(`printDialogTest`);
        let file = helper.mockFilePicker(fileName);
        info(`Printing to ${file.path}`);
        try {
          await helper.assertPrintToFile(file, () => {
            EventUtils.sendKey("return", helper.win);
          });
        } catch (e) {
          ok(
            /Wait for target file to get created/.test(e.toString()),
            "Target file should not get created"
          );
        }
        ok(!file.exists(), "File should not exist");

        is(
          mockCA.calls.length,
          1,
          "Correct number of calls to Content Analysis"
        );
        assertContentAnalysisRequest(mockCA.calls[0]);
      },
      TEST_PAGE_URL,
      true
    );
  }
);
