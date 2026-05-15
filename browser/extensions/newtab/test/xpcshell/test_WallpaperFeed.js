/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  actionCreators: "resource://newtab/common/Actions.mjs",
  actionTypes: "resource://newtab/common/Actions.mjs",
  Utils: "resource://services-settings/Utils.sys.mjs",
  reducers: "resource://newtab/common/Reducers.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
  WallpaperFeed: "resource://newtab/lib/Wallpapers/WallpaperFeed.sys.mjs",
});

const PREF_WALLPAPERS_ENABLED =
  "browser.newtabpage.activity-stream.newtabWallpapers.enabled";

const PREF_WALLPAPERS_CUSTOM_WALLPAPER_UUID =
  "browser.newtabpage.activity-stream.newtabWallpapers.customWallpaper.uuid";

function getWallpaperFeedForTest() {
  let feed = new WallpaperFeed();

  feed.store = {
    dispatch: sinon.spy(),
  };

  return feed;
}

add_task(async function test_construction() {
  let feed = new WallpaperFeed();

  info("WallpaperFeed constructor should create initial values");

  Assert.ok(feed, "Could construct a WallpaperFeed");
  Assert.strictEqual(feed.loaded, false, "WallpaperFeed is not loaded");
  Assert.strictEqual(
    feed.wallpaperClient,
    null,
    "wallpaperClient is initialized as null"
  );
});

add_task(async function test_onAction_INIT() {
  let sandbox = sinon.createSandbox();
  let feed = new WallpaperFeed();
  Services.prefs.setBoolPref(PREF_WALLPAPERS_ENABLED, true);
  const attachment = {
    attachment: {
      location: "attachment",
    },
  };
  sandbox.stub(feed, "RemoteSettings").returns({
    get: () => [attachment],
    on: () => {},
  });
  feed.store = {
    dispatch: sinon.spy(),
  };
  sandbox
    .stub(Utils, "baseAttachmentsURL")
    .returns("http://localhost:8888/base_url/");

  info("WallpaperFeed.onAction INIT should initialize wallpapers");

  await feed.onAction({
    type: actionTypes.INIT,
  });

  Assert.greaterOrEqual(feed.store.dispatch.callCount, 3);

  const matchingCall = feed.store.dispatch
    .getCalls()
    .find(call => call.args[0].type === actionTypes.WALLPAPERS_SET);

  Assert.ok(matchingCall, "Expected a WALLPAPERS_SET dispatch call");
  Assert.deepEqual(
    matchingCall.args[0],
    actionCreators.BroadcastToContent({
      type: actionTypes.WALLPAPERS_SET,
      data: [
        {
          ...attachment,
          background_position: "center",
          category: "",
          order: 0,
          wallpaperUrl: "http://localhost:8888/base_url/attachment",
          thumbnail: null,
        },
      ],
      meta: {
        isStartup: true,
      },
    })
  );

  Services.prefs.clearUserPref(PREF_WALLPAPERS_ENABLED);
  sandbox.restore();
});

add_task(async function test_onAction_PREF_CHANGED() {
  let sandbox = sinon.createSandbox();
  let feed = new WallpaperFeed();
  Services.prefs.setBoolPref(PREF_WALLPAPERS_ENABLED, true);
  sandbox.stub(feed, "wallpaperSetup").returns();

  info("WallpaperFeed.onAction PREF_CHANGED should call wallpaperSetup");

  feed.onAction({
    type: actionTypes.PREF_CHANGED,
    data: { name: "newtabWallpapers.enabled" },
  });

  Assert.ok(feed.wallpaperSetup.calledOnce);
  Assert.ok(feed.wallpaperSetup.calledWith(false));

  Services.prefs.clearUserPref(PREF_WALLPAPERS_ENABLED);
  sandbox.restore();
});

add_task(async function test_onAction_WALLPAPER_UPLOAD() {
  let sandbox = sinon.createSandbox();
  let feed = new WallpaperFeed();
  const fileData = {};

  Services.prefs.setBoolPref(PREF_WALLPAPERS_ENABLED, true);
  sandbox.stub(feed, "wallpaperUpload").returns();

  info("WallpaperFeed.onAction WALLPAPER_UPLOAD should call wallpaperUpload");

  feed.onAction({
    type: actionTypes.WALLPAPER_UPLOAD,
    data: { file: fileData },
  });

  Assert.ok(feed.wallpaperUpload.calledOnce);
  Assert.ok(feed.wallpaperUpload.calledWith(fileData));

  Services.prefs.clearUserPref(PREF_WALLPAPERS_ENABLED);

  sandbox.restore();
});

add_task(async function test_Wallpaper_Upload() {
  let sandbox = sinon.createSandbox();
  let feed = getWallpaperFeedForTest(sandbox);

  info(
    "File uploaded via WallpaperFeed.wallpaperUpload should match the saved file"
  );

  const fakeWorker = {
    post: sandbox.stub().resolves("light"),
    terminate: sandbox.stub(),
  };

  sandbox.stub(feed, "BasePromiseWorker").callsFake(() => fakeWorker);
  // Create test file to upload with custom contents to verify the same file was stored in the /wallpaper dir successfully
  const testUploadContents = "custom-wallpaper-upload-test";
  const testFileName = "test-wallpaper.jpg";

  const testWallpaperFile = await IOUtils.createUniqueFile(
    PathUtils.tempDir,
    testFileName
  );

  await IOUtils.writeUTF8(testWallpaperFile, testUploadContents);
  let testNsIFile = await IOUtils.getFile(testWallpaperFile);
  let testFileToUpload = await File.createFromNsIFile(testNsIFile);

  // Upload test file
  let writtenFile = await feed.wallpaperUpload(testFileToUpload);

  // Check if test file exists in WallpaperFeed directory
  Assert.ok(await IOUtils.exists(writtenFile));

  // Check if stored file has the same unique contents as the original test file contents
  const storedWallpaperFeedFileContent = await IOUtils.readUTF8(writtenFile);
  Assert.equal(storedWallpaperFeedFileContent, testUploadContents);

  // Check UUID of file name matches stored PREF_WALLPAPERS_CUSTOM_WALLPAPER_UUID pref value
  const writtenUUID = PathUtils.filename(writtenFile);
  const storedUUID = Services.prefs.getStringPref(
    PREF_WALLPAPERS_CUSTOM_WALLPAPER_UUID
  );

  // Confirm written filename UUID matches the stored UUID pref
  Assert.equal(writtenUUID, storedUUID);

  Assert.ok(
    feed.store.dispatch.calledWith(
      actionCreators.SetPref("newtabWallpapers.customWallpaper.theme", "light")
    )
  );

  // Cleanup files
  await IOUtils.remove(testWallpaperFile);
  await IOUtils.remove(writtenFile);
  Services.prefs.clearUserPref(PREF_WALLPAPERS_CUSTOM_WALLPAPER_UUID);

  sandbox.restore();
});

/**
 * Tests that the parent process sends down a moz-newtab-wallpaper:// protocol URI
 * to newtab to render as the background.
 */
add_task(async function test_Wallpaper_protocolURI() {
  let sandbox = sinon.createSandbox();
  let feed = getWallpaperFeedForTest(sandbox);

  const fakeWorker = {
    post: sandbox.stub().resolves("light"),
    terminate: sandbox.stub(),
  };

  sandbox.stub(feed, "BasePromiseWorker").callsFake(() => fakeWorker);

  // Stub out a fake RemoteClient so that updateWallpapers won't complain
  // when we eventually call it.
  feed.wallpaperClient = {
    async get() {
      return [];
    },
  };

  const testUploadContents = "custom-wallpaper-upload-test";
  const testFileName = "test-wallpaper.jpg";

  const testWallpaperFile = await IOUtils.createUniqueFile(
    PathUtils.tempDir,
    testFileName
  );

  await IOUtils.writeUTF8(testWallpaperFile, testUploadContents);
  let testNsIFile = await IOUtils.getFile(testWallpaperFile);
  let testFileToUpload = await File.createFromNsIFile(testNsIFile);

  // Upload test file
  let writtenFile = await feed.wallpaperUpload(testFileToUpload);

  Assert.ok(
    feed.store.dispatch.calledWith(
      actionCreators.BroadcastToContent({
        type: actionTypes.WALLPAPERS_CUSTOM_SET,
        data: sandbox.match("moz-newtab-wallpaper://"),
      })
    ),
    "Should dispatch WALLPAPERS_CUSTOM_SET with moz-newtab-wallpaper:// URI"
  );

  // Verify the protocol URI uses the correct scheme and gets stored in state
  const [action] = feed.store.dispatch.getCall(0).args;
  const wallpaperURI = action.data;

  Assert.ok(
    wallpaperURI.startsWith("moz-newtab-wallpaper://"),
    "Wallpaper URI should use moz-newtab-wallpaper:// protocol"
  );

  const state = reducers.Wallpapers(null, action);
  Assert.equal(
    state.uploadedWallpaper,
    wallpaperURI,
    "Should have updated the state to include the protocol URI"
  );

  // Cleanup files
  await IOUtils.remove(testWallpaperFile);
  await IOUtils.remove(writtenFile);
  Services.prefs.clearUserPref(PREF_WALLPAPERS_CUSTOM_WALLPAPER_UUID);
});
