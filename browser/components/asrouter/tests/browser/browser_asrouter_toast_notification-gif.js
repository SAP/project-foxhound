/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { ToastNotification } = ChromeUtils.importESModule(
  "resource:///modules/asrouter/ToastNotification.sys.mjs"
);
const { PanelTestProvider } = ChromeUtils.importESModule(
  "resource:///modules/asrouter/PanelTestProvider.sys.mjs"
);

function getMessage(id) {
  return PanelTestProvider.getMessages().then(msgs =>
    msgs.find(m => m.id === id)
  );
}

// This test is ensuring that when a toast notification is displayed with
// a non-GIF image, the `showAlert` method will not attempt to load or display
// the image as a GIF.
add_task(async function test_isNotAGifFile() {
  const sandbox = sinon.createSandbox();
  const showAlertStub = sandbox.stub();
  sandbox.stub(ToastNotification, "AlertsService").value({
    showAlert: showAlertStub,
  });

  let message = await getMessage("TEST_TOAST_NOTIFICATION_GIF");
  message.content.image_url = "chrome://branding/content/icon32.png";

  await ToastNotification.showToastNotification(message, sinon.stub());
  Assert.ok(showAlertStub.called, "AlertsService init has been called.");

  let [args] = showAlertStub.firstCall.args;
  Assert.strictEqual(
    args.imagePathUnchecked,
    undefined,
    `The image was not a gif file, so it should not be in imagePathUnchecked: ${args.imagePathUnchecked}`
  );

  sandbox.restore();
});

// Tests that a toast notification with a GIF image path is successfully
// displayed and verifies that the AlertsService is called, the GIF image path
// is set and exists on disk, and the display of the toast notification with
// the GIF image passes. It simulates the callback to `alertFinished` to test
// that the image has been deleted as if a real notification was shown and in
// a similar way to how its implemented in ToastNotification.sys.mjs.
add_task(async function test_gif_download_display_delete() {
  const sandbox = sinon.createSandbox();
  const showAlertStub = sinon.stub().callsFake(async (args, obs) => {
    Assert.ok(
      await IOUtils.exists(args.imagePathUnchecked),
      `The GIF image exists on disk: ${args.imagePathUnchecked}`
    );

    obs("subject", "alertfinished");

    Assert.ok(
      !(await IOUtils.exists(args.imagePathUnchecked)),
      `The GIF image was deleted from disk: ${args.imagePathUnchecked}`
    );

    return true;
  });

  sandbox.stub(ToastNotification, "AlertsService").value({
    showAlert: showAlertStub,
  });

  const message = await getMessage("TEST_TOAST_NOTIFICATION_GIF");

  await ToastNotification.showToastNotification(message, sinon.stub());
  Assert.ok(showAlertStub.called, "AlertsService init has been called.");

  let [args] = showAlertStub.firstCall.args;
  Assert.notStrictEqual(
    args.imagePathUnchecked,
    undefined,
    `The graphic ${message.content.image_url} should have been set as imagePathUnchecked.`
  );
  Assert.ok(
    /\.gif$/.test(args.imagePathUnchecked),
    `This GIF file was passed to AlertsService: ${args.imagePathUnchecked}`
  );

  sandbox.restore();
});
