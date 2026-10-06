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

// We have two images, each of which are a solid colour. This tries to ensure
// that they always encode to the same values when scaled.
//
// Often, we'll want to access these through a local URI:
const kGoodFaviconLocalUri = Services.io.newURI(
  "chrome://mochitests/content/browser/browser/components/taskbartabs/test/browser/blue-150.png"
);
const kBadFaviconLocalUri = Services.io.newURI(
  "chrome://mochitests/content/browser/browser/components/taskbartabs/test/browser/red-50.png"
);
// However, for manifest icons especially, they sometimes need to use HTTP:
const kGoodFaviconHttpUri = Services.io.newURI(
  "https://example.com/browser/browser/components/taskbartabs/test/browser/blue-150.png"
);
const kBadFaviconHttpUri = Services.io.newURI(
  "https://example.com/browser/browser/components/taskbartabs/test/browser/red-50.png"
);
// And for the cross-origin test, we need one on a different origin (note .org
// instead of .com):
const kGoodFaviconCrossOriginUri = Services.io.newURI(
  "https://example.org/browser/browser/components/taskbartabs/test/browser/blue-150.png"
);

let gGoodFaviconImg;
let gBadFaviconImg;

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
  sandbox.stub(ShellService, "requestCreateAndPinSecondaryTile").resolves();
  sandbox.stub(ShellService, "requestDeleteSecondaryTile").resolves();
  registerCleanupFunction(() => sandbox.restore());

  gGoodFaviconImg = encodeImagePNG(
    await TaskbarTabsUtils._imageFromLocalURI(kGoodFaviconLocalUri),
    256
  );
  gBadFaviconImg = encodeImagePNG(
    await TaskbarTabsUtils._imageFromLocalURI(kBadFaviconLocalUri),
    256
  );
});

/**
 * Encodes the provided image into a Uint8Array. This is meant for comparisons
 * with compareImageBytes.
 *
 * @param {imgIContainer} aImage - The image to encode.
 * @param {number} [aFinalSize] - The size to scale the image to.
 * @returns {Uint8Array} The bytes of the 'image/png' encoded image.
 */
function encodeImagePNG(aImage, aFinalSize = 0) {
  let stream = Cc["@mozilla.org/image/tools;1"]
    .getService(Ci.imgITools)
    .encodeScaledImage(aImage, "image/png", aFinalSize, aFinalSize);

  let size = stream.available();
  let bis = Cc["@mozilla.org/binaryinputstream;1"].createInstance(
    Ci.nsIBinaryInputStream
  );
  bis.setInputStream(stream);

  let arrayBuffer = new ArrayBuffer(size);
  bis.readArrayBuffer(size, arrayBuffer);

  return new Uint8Array(arrayBuffer);
}

/**
 * Asserts that the two byte arrays have the same content at all positions.
 *
 * @param {Uint8Array} aActual - The first image to compare.
 * @param {Uint8Array} aExpected - The second image to compare.
 */
function assertBytesEqual(aActual, aExpected) {
  Assert.equal(
    aActual.length,
    aExpected.length,
    "Byte arrays have the same length"
  );
  if (aActual.length !== aExpected.length) {
    return;
  }

  for (let i = 0; i < aActual.length; i++) {
    if (aActual[i] !== aExpected[i]) {
      Assert.ok(
        false,
        `Position ${i}: got ${aActual[i]}, wanted ${aExpected[i]}`
      );
      return;
    }
  }

  Assert.ok(true, "Byte arrays were equal");
}

add_task(async function test_noFavicon() {
  const sandbox = sinon.createSandbox();

  sandbox.stub(TaskbarTabsUtils, "getFaviconUri").resolves(null);
  await checkTaskbarTabIcon(null);

  sandbox.restore();
});

add_task(async function test_typicalFavicon() {
  const sandbox = sinon.createSandbox();

  sandbox.stub(TaskbarTabsUtils, "getFaviconUri").callsFake(async aUri => {
    return aUri.equals(kBaseUri) ? kGoodFaviconLocalUri : null;
  });

  await checkTaskbarTabIcon(gGoodFaviconImg);

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
      return kGoodFaviconLocalUri;
    }

    return null;
  });

  await checkTaskbarTabIcon(gGoodFaviconImg, {
    uri: kInnerUri,
    manifest: {
      start_url: "/",
    },
  });
  ok(checkedInnerLast, "The inner URL should be checked last");

  sandbox.restore();
});

add_task(async function test_manifestIcon_none() {
  // It should fall back to the 'bad' icon due to the favicon mock.
  await checkManifestIcon(gBadFaviconImg, gBadFaviconImg, {
    icons: [],
  });
});

add_task(async function test_manifestIcon_lone() {
  await checkManifestIcon(gGoodFaviconImg, gGoodFaviconImg, {
    icons: [
      {
        // This needs to be HTTP since it's from the manifest, so in theory
        // it could be given from random Web content and thus it can't access
        // chrome: URIs.
        src: kGoodFaviconHttpUri.spec,
      },
    ],
  });
});

add_task(async function test_manifestIcon_sized() {
  await checkManifestIcon(gGoodFaviconImg, gGoodFaviconImg, {
    icons: [
      {
        src: kGoodFaviconHttpUri.spec,
        sizes: "1x1 2x2 3x3 250x250",
      },
    ],
  });
});

add_task(async function test_manifestIcon_selectsBestSize() {
  await checkManifestIcon(gGoodFaviconImg, gGoodFaviconImg, {
    icons: [
      {
        src: kBadFaviconHttpUri.spec,
        sizes: "255x255 257x257",
      },
      {
        src: kGoodFaviconHttpUri.spec,
        sizes: "256x256",
      },
    ],
  });
});

add_task(async function test_manifestIcon_differentOrigin() {
  await checkManifestIcon(gBadFaviconImg, gGoodFaviconImg, {
    icons: [
      {
        // The test is done from kBaseUri (example.com), but this icon is on
        // example.org, so it should fail (falling back to gBadFaviconImg) if
        // we have a tab since it's cross-origin. If we don't have a tab, we
        // should permit it, since it's probably from our servers.
        src: kGoodFaviconCrossOriginUri.spec,
      },
    ],
  });
});

add_task(async function test_manifestIcon_unwantedPurposesDisqualifies() {
  // We _don't_ want to pick the one from the manifest in this case, since we
  // want 'purpose: "any"' only.
  await checkManifestIcon(gBadFaviconImg, gBadFaviconImg, {
    icons: [
      {
        src: kGoodFaviconHttpUri.spec,
        purpose: "monochrome maskable",
      },
    ],
  });
});

add_task(async function test_manifestIcon_unwantedPurposesFallback() {
  // Even though the 256x256 is enticing, we want to go with the 1x1 since its
  // purpose matches.
  await checkManifestIcon(gGoodFaviconImg, gGoodFaviconImg, {
    icons: [
      {
        src: kBadFaviconHttpUri.spec,
        purpose: "monochrome maskable",
      },
      {
        src: kGoodFaviconHttpUri.spec,
        purpose: "any any any",
      },
    ],
  });
});

add_task(async function test_manifestIcon_extraPurposes() {
  await checkManifestIcon(gGoodFaviconImg, gGoodFaviconImg, {
    icons: [
      {
        src: kGoodFaviconHttpUri.spec,
        purpose: "any maskable",
      },
    ],
  });
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
 * Checks that the manifest provided results in the dimensions matching the
 * given image if (a) a browser is given, and (b) if it is not.
 *
 * The favicon will be hardcoded to gBigFaviconImg, so that should be the
 * 'something went wrong' icon.
 *
 * @param {imgIContainer} aImageWithTab - The image to use with
 * moveTabIntoTaskbarTab.
 * @param {imgIContainer} aImageWithoutTab - The image to use with
 * findOrCreateTaskbarTab.
 * @param {object} aManifest - The Web App Manifest to use.
 */
async function checkManifestIcon(aImageWithTab, aImageWithoutTab, aManifest) {
  let sandbox = sinon.createSandbox();
  sandbox.stub(TaskbarTabsUtils, "getFaviconUri").resolves(kBadFaviconLocalUri);

  // This case checks moveTabIntoTaskbarTab.
  await checkTaskbarTabIcon(aImageWithTab, { manifest: aManifest });

  let pinStub = sandbox.stub(TaskbarTabsPin, "pinTaskbarTab").resolves();

  let { taskbarTab } = await TaskbarTabs.findOrCreateTaskbarTab(kBaseUri, 0, {
    manifest: aManifest,
  });

  await TaskbarTabs.removeTaskbarTab(taskbarTab.id);
  Assert.equal(pinStub.callCount, 1, "The taskbar tab was pinned once");
  assertBytesEqual(
    encodeImagePNG(pinStub.firstCall?.args[2]),
    aImageWithoutTab
  );

  sandbox.restore();
}

/**
 * Checks that loading the given URI and start path and creating a Taskbar Tab
 * results in the given image, and that it can be loaded from disk correctly.
 *
 * You will likely want to mock out TaskbarTabsUtils.getFaviconUri.
 *
 * @param {imgIContainer?} aImage - The expected image for this Taskbar Tab, or
 * null if the default icon should be used.
 * @param {object} [aDetails] - Additional options for the test.
 * @param {nsIURI} [aDetails.uri] - The URI to load.
 * @param {string} [aDetails.manifest] - The Web App Manifest to associate with
 * the Taskbar Tab.
 */
async function checkTaskbarTabIcon(
  aImage,
  { uri = kBaseUri, manifest = null } = {}
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
  await openAndMoveIntoTaskbarTab(uri, manifest);
  await pendingPin;
  tt = await TaskbarTabs.findTaskbarTab(uri, 0);
  Assert.notEqual(tt, null, "A new Taskbar Tab was created");
  let priorId = tt.id;

  Assert.equal(pinStub.callCount, 1, "Tried to pin taskbar tab");
  if (aImage) {
    assertBytesEqual(encodeImagePNG(pinStub.firstCall.args[2]), aImage);
  } else {
    assertBytesEqual(
      encodeImagePNG(pinStub.firstCall.args[2]),
      encodeImagePNG(await TaskbarTabsUtils.getDefaultIcon())
    );
  }

  Assert.equal(
    replaceStub.callCount,
    1,
    "Tried to replace the tab with a window"
  );
  if (aImage) {
    assertBytesEqual(encodeImagePNG(replaceStub.firstCall.args[2]), aImage);
  } else {
    assertBytesEqual(
      encodeImagePNG(replaceStub.firstCall.args[2]),
      encodeImagePNG(await TaskbarTabsUtils.getDefaultIcon())
    );
  }

  // This time, we expect to reuse the same one, read from the disk (and thus
  // scaled to 256x256).
  await openAndMoveIntoTaskbarTab(uri, manifest);
  await pendingPin;
  tt = await TaskbarTabs.findTaskbarTab(uri, 0);
  Assert.equal(tt?.id, priorId, "The Taskbar Tab was reused");

  Assert.equal(pinStub.callCount, 1, "Did not try to pin the second time");

  Assert.equal(
    replaceStub.callCount,
    2,
    "Tried to replace the tab with a window"
  );
  if (aImage) {
    assertBytesEqual(encodeImagePNG(replaceStub.secondCall.args[2]), aImage);
  } else {
    // This time, the default icon needs to be scaled up.
    assertBytesEqual(
      encodeImagePNG(replaceStub.secondCall.args[2]),
      encodeImagePNG(await TaskbarTabsUtils.getDefaultIcon(), 256)
    );
  }

  await TaskbarTabs.removeTaskbarTab(priorId);
  sandbox.restore();
}

/**
 * Opens aUri in a new tab and moves it into a Taskbar Tab, possibly with a
 * Web App Manifest.
 *
 * @param {nsIURI} aUri - The URI to load.
 * @param {string} aManifest - The Web App Manifest to put on the page.
 */
async function openAndMoveIntoTaskbarTab(aUri, aManifest) {
  await BrowserTestUtils.withNewTab(aUri.spec, async browser => {
    let json = aManifest ? JSON.stringify(aManifest) : null;
    await SpecialPowers.spawn(browser, [json], async manifest => {
      if (manifest !== null) {
        content.document.body.innerHTML = `<link rel="manifest" href='data:application/json,${manifest}'>`;
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
    .stub(TaskbarTabsUtils, "_remoteDecodeImageFromFile")
    .resolves(fakeImg);
  sandbox.stub(TaskbarTabsUtils, "getDefaultIcon").resolves(defaultImg);

  await callback(taskbarTab);

  Assert.ok(
    loadStub.firstCall?.args[0]?.path?.includes(taskbarTab.id),
    "Attempted to load image (probably) corresponding to a Taskbar Tab"
  );
  Assert.equal(openStub.callCount, 1, `${methodName} was called once`);
  Assert.equal(
    openStub.firstCall?.args[index],
    fakeImg,
    `The result from _remoteDecodeImageFromFile was passed to ${methodName}`
  );

  loadStub.restore();
  loadStub = sandbox
    .stub(TaskbarTabsUtils, "_remoteDecodeImageFromFile")
    .rejects();

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
