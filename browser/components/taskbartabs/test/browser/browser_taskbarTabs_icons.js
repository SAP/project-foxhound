/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  sinon: "resource://testing-common/Sinon.sys.mjs",
  ShellService: "moz-src:///browser/components/shell/ShellService.sys.mjs",
  TaskbarTabs: "resource:///modules/taskbartabs/TaskbarTabs.sys.mjs",
  TaskbarTabsPin: "resource:///modules/taskbartabs/TaskbarTabsPin.sys.mjs",
  TaskbarTabsWindowManager:
    "resource:///modules/taskbartabs/TaskbarTabsWindowManager.sys.mjs",
  TaskbarTabsUtils: "resource:///modules/taskbartabs/TaskbarTabsUtils.sys.mjs",
});

const kBaseUri = Services.io.newURI("https://example.com");
const kInnerUri = Services.io.newURI("https://example.com/somewhere/else");

let gFaviconUri;
let gFaviconImg;

add_setup(async function setup() {
  // Note: we don't want to stub out creating the icon file, so we need to stub
  // out everything else.
  let sandbox = sinon.createSandbox();
  sandbox.stub(ShellService, "shellService").value({
    ...ShellService.shellService,
    createShortcut: sinon.stub().resolves(),
    deleteShortcut: sinon.stub().resolves(),
    pinShortcutToTaskbar: sinon.stub().resolves(),
    unpinShortcutFromTaskbar: sinon.stub().resolves(),
  });
  registerCleanupFunction(() => sandbox.restore());

  gFaviconUri = Services.io.newURI(
    "chrome://mochitests/content/browser/browser/components/taskbartabs/test/browser/favicon-normal16.png"
  );
  gFaviconImg = await TaskbarTabsUtils._imageFromLocalURI(gFaviconUri);
});

add_task(async function test_noFavicon() {
  const sandbox = sinon.createSandbox();

  sandbox.stub(TaskbarTabsUtils, "getFaviconUri").resolves(null);
  await checkTaskbarTabIcon(await TaskbarTabsUtils.getDefaultIcon());

  sandbox.restore();
});

add_task(async function test_typicalFavicon() {
  const sandbox = sinon.createSandbox();

  sandbox.stub(TaskbarTabsUtils, "getFaviconUri").callsFake(async aUri => {
    if (aUri.equals(kBaseUri)) {
      return gFaviconUri;
    }

    return null;
  });

  await checkTaskbarTabIcon(gFaviconImg);

  sandbox.restore();
});

add_task(async function test_faviconOnOtherPage() {
  // Suppose we have a manifest with start_url '/base', and we're on
  // '/base/other'. If '/base' has a favicon, we should use that (since that's
  // what the user will actually open), but if not we should fall back.
  const sandbox = sinon.createSandbox();

  let checkedInnerLast = false;
  sandbox.stub(TaskbarTabsUtils, "getFaviconUri").callsFake(async aUri => {
    checkedInnerLast = false;
    if (aUri.equals(kBaseUri)) {
      return null;
    }

    if (aUri.equals(kInnerUri)) {
      checkedInnerLast = true;
      return gFaviconUri;
    }

    return null;
  });

  await checkTaskbarTabIcon(gFaviconImg, {
    uri: kInnerUri,
    startPath: "/",
  });
  ok(checkedInnerLast, "The inner URL should be checked last");

  sandbox.restore();
});

add_task(async function test_findOrCreateTaskbarTab_noIcon() {
  let sandbox = sinon.createSandbox();
  let fakeImg = {};
  sandbox.stub(TaskbarTabsUtils, "getFaviconUri").resolves(null);
  sandbox.stub(TaskbarTabsUtils, "getDefaultIcon").resolves(fakeImg);
  let pinStub = sandbox.stub(TaskbarTabsPin, "pinTaskbarTab").resolves();

  let result = await TaskbarTabs.findOrCreateTaskbarTab(kBaseUri, 0);
  Assert.equal(
    pinStub.firstCall?.args[2],
    fakeImg,
    "The default icon was selected when no favicon was available"
  );

  await TaskbarTabs.removeTaskbarTab(result.taskbarTab.id);
  sandbox.restore();
});

add_task(async function test_moveTabIntoTaskbarTabLoadsSavedIcon() {
  // We want to mock out replaceTabWithWindow to see what icon will be used,
  // even though that's not directly what we're testing.
  await checkLoadsCorrectIcon("replaceTabWithWindow", 2, async _tt => {
    await BrowserTestUtils.withNewTab(kBaseUri.spec, async browser => {
      let tab = window.gBrowser.getTabForBrowser(browser);
      await TaskbarTabs.moveTabIntoTaskbarTab(tab);
    });
  });
});

add_task(async function test_openWindowLoadsSavedIcon() {
  await checkLoadsCorrectIcon("openWindow", 1, async tt => {
    await TaskbarTabs.openWindow(tt);
  });
});

add_task(async function test_replaceTabWithWindowLoadsSavedIcon() {
  await checkLoadsCorrectIcon("replaceTabWithWindow", 2, async tt => {
    await BrowserTestUtils.withNewTab(kBaseUri.spec, async browser => {
      let tab = window.gBrowser.getTabForBrowser(browser);
      await TaskbarTabs.replaceTabWithWindow(tt, tab);
    });
  });
});

/**
 * Checks that loading the given URI and start path and creating a Taskbar Tab
 * results in the given image, and that it can be loaded from disk correctly.
 *
 * You will likely want to mock out TaskbarTabsUtils.getFaviconUri.
 *
 * @param {imgIContainer} aImage - The expected image for this Taskbar Tab.
 * @param {object} [aDetails] - Additional options for the test.
 * @param {nsIURI} [aDetails.uri] - The URI to load.
 * @param {string} [aDetails.startPath] - The "start_url" to set in the fake
 * Web App Manifest.
 */
async function checkTaskbarTabIcon(
  aImage,
  { uri = kBaseUri, startPath = null } = {}
) {
  const sandbox = sinon.createSandbox();

  // We want to wait for the pin to fully complete before continuing, as
  // otherwise e.g. the image might not have saved.
  let pendingPin;
  let pinStub = sandbox
    .stub(TaskbarTabsPin, "pinTaskbarTab")
    .callsFake((...args) => {
      pendingPin = TaskbarTabsPin.pinTaskbarTab.wrappedMethod(...args);
    });

  let replaceStub = sandbox
    .stub(TaskbarTabsWindowManager.prototype, "replaceTabWithWindow")
    .resolves({});

  let tt = await TaskbarTabs.findTaskbarTab(uri, 0);
  Assert.strictEqual(tt, null, "No Taskbar Tab exists under url");

  // The first run should create a Taskbar Tab.
  await openAndMoveIntoTaskbarTab(uri, startPath);
  await pendingPin;
  tt = await TaskbarTabs.findTaskbarTab(uri, 0);
  Assert.notEqual(tt, null, "A new Taskbar Tab was created");
  let priorId = tt.id;

  Assert.equal(pinStub.callCount, 1, "Tried to pin taskbar tab");
  Assert.strictEqual(
    pinStub.firstCall.args[2]?.width,
    aImage.width,
    "Correct image width was used when pinning"
  );
  Assert.strictEqual(
    pinStub.firstCall.args[2]?.height,
    aImage.height,
    "Correct image height was used when pinning"
  );

  Assert.equal(
    replaceStub.callCount,
    1,
    "Tried to replace the tab with a window"
  );
  Assert.strictEqual(
    replaceStub.getCall(0).args[2]?.width,
    aImage.width,
    "Correct image width was used for the window"
  );
  Assert.strictEqual(
    replaceStub.getCall(0).args[2]?.height,
    aImage.height,
    "Correct image height was used for the window"
  );

  // This time, we expect to reuse the same one, read from the disk (and thus
  // scaled to 256x256).
  await openAndMoveIntoTaskbarTab(uri, startPath);
  await pendingPin;
  tt = await TaskbarTabs.findTaskbarTab(uri, 0);
  Assert.equal(tt?.id, priorId, "The Taskbar Tab was reused");

  Assert.equal(pinStub.callCount, 1, "Did not try to pin the second time");

  Assert.equal(
    replaceStub.callCount,
    2,
    "Tried to replace the tab with a window"
  );
  Assert.strictEqual(
    replaceStub.getCall(1).args[2]?.width,
    256,
    "Correct image width was used for the window"
  );
  Assert.strictEqual(
    replaceStub.getCall(1).args[2]?.height,
    256,
    "Correct image height was used for the window"
  );

  await TaskbarTabs.removeTaskbarTab(priorId);
  sandbox.restore();
}

/**
 * Opens aUri in a new tab and moves it into a Taskbar Tab. Additionally, uses
 * aStartPath as the "start_url" of the page's manifest.
 *
 * @param {nsIURI} aUri - The URI to load.
 * @param {string} aStartPath - The value to use as "start_url".
 */
async function openAndMoveIntoTaskbarTab(aUri, aStartPath) {
  await BrowserTestUtils.withNewTab(aUri.spec, async browser => {
    await SpecialPowers.spawn(browser, [aStartPath], async path => {
      if (path !== null) {
        content.document.body.innerHTML = `<link rel="manifest" href='data:application/json,{"start_url": "${path}"}'>`;
      }
    });

    let tab = window.gBrowser.getTabForBrowser(browser);
    await TaskbarTabs.moveTabIntoTaskbarTab(tab);
  });
}

/**
 * This is used for test_openWindowLoadsSavedIcon and
 * test_replaceTabWithWindowLoadsSavedIcon; it ensures that the saved icon is
 * loaded if it exists, and otherwise that the default icon is used.
 *
 * @param {string} methodName - A name to use in assertion methods and to mock
 * out under TaskbarTabsWindowManager.
 * @param {number} index - The argument index of the options object.
 * @param {Function} callback - A function that calls the method under test.
 */
async function checkLoadsCorrectIcon(methodName, index, callback) {
  let sandbox = sinon.createSandbox();

  sandbox.stub(TaskbarTabsPin, "pinTaskbarTab").resolves();
  let { taskbarTab } = await TaskbarTabs.findOrCreateTaskbarTab(kBaseUri, 0);

  let fakeImg = { which: "fakeImg" };
  let defaultImg = { which: "defaultImg" };

  let openStub = sandbox.stub(TaskbarTabsWindowManager.prototype, methodName);
  let loadStub = sandbox
    .stub(TaskbarTabsUtils, "_imageFromLocalURI")
    .resolves(fakeImg);
  sandbox.stub(TaskbarTabsUtils, "getDefaultIcon").resolves(defaultImg);

  await callback(taskbarTab);

  Assert.ok(
    loadStub.firstCall?.args[0]?.spec?.includes(taskbarTab.id),
    "Attempted to load image (probably) corresponding to a Taskbar Tab"
  );
  Assert.equal(openStub.callCount, 1, `${methodName} was called once`);
  Assert.equal(
    openStub.firstCall?.args[index],
    fakeImg,
    `The result from _imageFromLocalURI was passed to ${methodName}`
  );

  loadStub.restore();
  loadStub = sandbox.stub(TaskbarTabsUtils, "_imageFromLocalURI").rejects();

  await callback(taskbarTab);

  Assert.equal(openStub.callCount, 2, `${methodName} was called a second time`);
  Assert.equal(
    openStub.secondCall?.args[index],
    defaultImg,
    `When the image couldn't be loaded, the default icon was passed to ${methodName}`
  );

  await TaskbarTabs.removeTaskbarTab(taskbarTab.id);
  sandbox.restore();
}
