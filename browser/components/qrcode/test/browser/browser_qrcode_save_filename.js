/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const MockFilePicker = SpecialPowers.MockFilePicker;
MockFilePicker.init(window);

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/toolkit/content/tests/browser/common/mockTransfer.js",
  this
);

registerCleanupFunction(() => {
  MockFilePicker.cleanup();
});

function createTemporarySaveDirectory() {
  let saveDir = Services.dirsvc.get("TmpD", Ci.nsIFile);
  saveDir.append("testsavedir");
  saveDir.createUnique(Ci.nsIFile.DIRECTORY_TYPE, 0o755);
  return saveDir;
}

// A minimal valid PNG data URI so the dialog reaches the success state and
// the save button works.
const TINY_PNG_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAA" +
  "C0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

async function openQRCodeDialog(browser, url) {
  let dialogBox = gBrowser.getTabDialogBox(browser);
  let dialogManager = dialogBox.getTabDialogManager();

  dialogBox.open(
    "chrome://browser/content/qrcode/qrcode-dialog.html",
    { features: "resizable=no", allowDuplicateDialogs: false },
    { url, qrCodeDataURI: TINY_PNG_DATA_URI }
  );

  await BrowserTestUtils.waitForCondition(
    () => dialogManager._dialogs.length,
    "Waiting for QR code subdialog"
  );

  let dialog = dialogManager._dialogs[0];
  await dialog._dialogReady;
  return dialog;
}

function createPromiseForTransferComplete(destDir, expectedFilename) {
  return new Promise(resolve => {
    MockFilePicker.showCallback = filePicker => {
      Assert.equal(
        filePicker.defaultString,
        expectedFilename,
        "File picker is shown with the QR code filename"
      );

      let destFile = destDir.clone();
      destFile.append(filePicker.defaultString);
      MockFilePicker.setFiles([destFile]);
      MockFilePicker.showCallback = null;

      mockTransferCallback = downloadSuccess => {
        Assert.ok(
          downloadSuccess,
          "QR code is saved via the standard download flow"
        );
        mockTransferCallback = () => {};
        resolve();
      };
    };
  });
}

async function getDefaultFilenameForUrl(url) {
  let captured;

  await BrowserTestUtils.withNewTab("about:blank", async browser => {
    let dialog = await openQRCodeDialog(browser, url);

    let filePickerShown = new Promise(resolve => {
      MockFilePicker.showCallback = filePicker => {
        captured = filePicker.defaultString;
        MockFilePicker.showCallback = null;
        resolve();
        return Ci.nsIFilePicker.returnCancel;
      };
    });

    dialog._frame.contentWindow.QRCodeDialog.saveImage();
    await filePickerShown;
    dialog._frame.contentWindow.close();
  });

  return captured;
}

add_task(async function test_filename_uses_etld_plus_one() {
  const cases = [
    ["https://www.google.com/maps", "qrcode-google.com.png"],
    ["https://sub.example.co.uk/path?q=1", "qrcode-example.co.uk.png"],
    ["https://example.org/", "qrcode-example.org.png"],
  ];

  for (const [url, expected] of cases) {
    const actual = await getDefaultFilenameForUrl(url);
    Assert.equal(actual, expected, `filename for ${url}`);
  }
});

add_task(async function test_filename_uses_host_without_etld_plus_one() {
  // Single-label hosts and raw IPv4 addresses have no eTLD+1, but the host
  // itself is safe to put in a filename.
  const cases = [
    ["https://localhost/", "qrcode-localhost.png"],
    ["https://intranet/", "qrcode-intranet.png"],
    ["https://127.0.0.1/", "qrcode-127.0.0.1.png"],
  ];

  for (const [url, expected] of cases) {
    const actual = await getDefaultFilenameForUrl(url);
    Assert.equal(actual, expected, `filename for ${url}`);
  }
});

add_task(async function test_filename_uses_unicode_for_idn() {
  // IDN domains are returned in their Unicode display form, not Punycode.
  const cases = [
    ["https://bücher.de/", "qrcode-bücher.de.png"],
    ["https://xn--bcher-kva.example/", "qrcode-bücher.example.png"],
  ];

  for (const [url, expected] of cases) {
    const actual = await getDefaultFilenameForUrl(url);
    Assert.equal(actual, expected, `filename for ${url}`);
  }
});

add_task(async function test_filename_sanitizes_unsafe_host() {
  // IPv6 hosts contain ":" which isn't safe in a filename, so sanitize
  // replaces the colons.
  const actual = await getDefaultFilenameForUrl("https://[::1]/");
  Assert.equal(actual, "qrcode-__1.png", "IPv6 host should be sanitized");
});

add_task(async function test_save_uses_download_flow() {
  let destDir = createTemporarySaveDirectory();
  MockFilePicker.displayDirectory = destDir;

  mockTransferRegisterer.register();
  registerCleanupFunction(function () {
    mockTransferRegisterer.unregister();
    MockFilePicker.showCallback = null;
    destDir.remove(true);
  });

  await BrowserTestUtils.withNewTab("about:blank", async browser => {
    let dialog = await openQRCodeDialog(browser, "https://example.org/");

    let transferComplete = createPromiseForTransferComplete(
      destDir,
      "qrcode-example.org.png"
    );
    dialog._frame.contentWindow.QRCodeDialog.saveImage();
    await transferComplete;

    dialog._frame.contentWindow.close();
  });
});
