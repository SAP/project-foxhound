/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_URL =
  "https://example.org/document-builder.sjs?html=<input type='file'>";

const MockFilePicker = SpecialPowers.MockFilePicker;
MockFilePicker.init(window.browsingContext);

add_task(async _ => {
  registerCleanupFunction(() => MockFilePicker.cleanup());

  await testPickerOpeningNotification(gBrowser, { method: "input.click()" });
  await testPickerOpeningNotification(gBrowser, {
    method: "input.showPicker()",
  });
});

async function testPickerOpeningNotification(gBrowser, { method }) {
  info("Test the input-file-picker-opening notification for method=" + method);
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: TEST_URL,
    },
    async function (browser) {
      const onPickerCanceled = new Promise(resolve => {
        MockFilePicker.showCallback = function () {
          resolve();
          return Ci.nsIFilePicker.returnCancel;
        };
      });
      await SpecialPowers.spawn(browser, [method], async function (_method) {
        const fileInputElement = content.document.querySelector("input");

        const waitForPickerOpeningNotification = () => {
          return new Promise(resolve => {
            Services.obs.addObserver(function onPickerOpening(subject) {
              info(
                "Received a file-input-picker-opening notification for subject: " +
                  subject.outerHTML
              );
              is(
                subject,
                fileInputElement,
                "Notification received for the expected input element"
              );

              Services.obs.removeObserver(
                onPickerOpening,
                "file-input-picker-opening"
              );
              resolve();
            }, "file-input-picker-opening");
          });
        };

        let onPickerOpeningNotification = waitForPickerOpeningNotification();
        content.document.notifyUserGestureActivation();

        info("Trigger the file picker to be displayed via " + _method);
        if (_method == "input.click()") {
          fileInputElement.click();
        } else if (_method == "input.showPicker()") {
          fileInputElement.showPicker();
        } else {
          throw new Error(
            "Unsupported method for testPickerOpeningNotification: " + _method
          );
        }
        info("Wait for the mock file picker showCallback to cancel the picker");
        await onPickerOpeningNotification;
      });

      info("Wait for the file-input-picker-opening notification");
      await onPickerCanceled;
    }
  );
}
