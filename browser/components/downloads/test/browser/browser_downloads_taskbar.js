/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let { MockRegistrar } = ChromeUtils.importESModule(
  "resource://testing-common/MockRegistrar.sys.mjs"
);

let { DownloadsTaskbar } = ChromeUtils.importESModule(
  "moz-src:///browser/components/downloads/DownloadsTaskbar.sys.mjs"
);

let gProgress = {};
function setProgressState(platform, id, state, current, maximum) {
  gProgress[id].state = state;
  gProgress[id].current = current;
  gProgress[id].maximum = maximum;
  gProgress[id].platform = platform;
}

let gMockWinTaskbar = null;
let gMockMacTaskbar = null;
let gMockGtkTaskbar = null;
add_setup(function registerMock() {
  gMockWinTaskbar = MockRegistrar.register("@mozilla.org/windows-taskbar;1", {
    get available() {
      return true;
    },
    getTaskbarProgress(aDocShell) {
      gProgress[aDocShell.outerWindowID] = {};
      return {
        setProgressState: setProgressState.bind(
          null,
          "windows",
          aDocShell.outerWindowID
        ),
      };
    },
    QueryInterface: ChromeUtils.generateQI([Ci.nsIWinTaskbar]),
  });

  gMockMacTaskbar = MockRegistrar.register(
    "@mozilla.org/widget/macdocksupport;1",
    {
      setProgressState(state, current, maximum) {
        setProgressState("mac", -1, state, current, maximum);
      },
      QueryInterface: ChromeUtils.generateQI([Ci.nsITaskbarProgress]),
    }
  );

  gMockGtkTaskbar = MockRegistrar.register(
    "@mozilla.org/widget/taskbarprogress/gtk;1",
    {
      setProgressState() {
        setProgressState("linux", this._currentWindowId, ...arguments);
      },
      setPrimaryWindow(aWindow) {
        this._currentWindowId = aWindow.docShell.outerWindowID;
        if (!(this._currentWindowId in gProgress)) {
          gProgress[this._currentWindowId] = {};
        }
      },
      QueryInterface: ChromeUtils.generateQI([Ci.nsIGtkTaskbarProgress]),
    }
  );
});

registerCleanupFunction(async function () {
  MockRegistrar.unregister(gMockWinTaskbar);
  MockRegistrar.unregister(gMockMacTaskbar);
  MockRegistrar.unregister(gMockGtkTaskbar);
  await resetBetweenTests();
});

add_setup(function () {
  startServer();
});

function isProgressEqualTo(progress, platform, kind, state, fraction) {
  is(
    progress.platform,
    platform,
    `${kind} taskbar progress platform is ${platform}`
  );
  is(progress.state, state, `${kind} taskbar progress state is ${state}`);

  if (fraction == 0 || state == Ci.nsITaskbarProgress.STATE_NO_PROGRESS) {
    // special-case since progress.maximum could also be zero
    is(progress.current, 0, `${kind} taskbar state is 0%`);
  } else {
    is(
      (progress.current / progress.maximum).toFixed(3),
      fraction.toFixed(3),
      `${kind} taskbar state is ${fraction * 100}%`
    );
  }
}

async function getDownloadsList({ isPrivate }) {
  return await Downloads.getList(
    isPrivate ? Downloads.PRIVATE : Downloads.PUBLIC
  );
}

async function addDownload({ isPrivate }) {
  let realBumpProgress = null;
  let untilDownloadStart = Promise.withResolvers();
  gProgressResponseCallback = bump => {
    realBumpProgress = bump;
    untilDownloadStart.resolve();
  };

  let download = await Downloads.createDownload({
    source: {
      url: httpUrl("progress"),
      isPrivate,
    },
    target: {
      path: gTestTargetFile.path,
    },
  });

  const downloadsList = await getDownloadsList({ isPrivate });
  await downloadsList.add(download);

  let downloadPromise = download.start();

  await untilDownloadStart.promise;
  let percent = 0;
  return {
    download,
    bumpProgress() {
      // Workaround for bug 1975797; see kProgressUpdateIntervalMs
      // in DownloadCore.sys.mjs. This timeout can be removed once that
      // is fixed.
      const { promise, resolve } = Promise.withResolvers();
      // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
      setTimeout(resolve, 400);
      return promise
        .then(() => realBumpProgress())
        .then(() => {
          percent += 10;
          if (percent == 100) {
            return downloadPromise;
          }

          return promiseDownloadHasProgress(download, percent);
        });
    },
  };
}

async function removeDownload(download) {
  let list = await getDownloadsList({ isPrivate: download.source.isPrivate });
  return await list.remove(download);
}

async function resetBetweenTests() {
  // Remove all DownloadsTaskbar instances.
  DownloadsTaskbar.resetBetweenTests();

  // Reset progress bar state.
  gProgress = {};
}

// Ensures that the download progress is correctly assigned to all windows
// that the download applies to. For example, a private download should go
// to a private window.
//
// Note that this test is only valid on Windows, since it is in the only
// platform that shows progress on multiple windows.
async function testActiveAndInactiveOnWindows({
  isPrivateDownload,
  publicWindows,
  privateWindows,
}) {
  const PLATFORM = "windows";
  await resetBetweenTests();

  for (let publicWindow of publicWindows) {
    await DownloadsTaskbar.registerIndicator(publicWindow, PLATFORM);
  }

  for (let privateWindow of privateWindows) {
    await DownloadsTaskbar.registerIndicator(privateWindow, PLATFORM);
  }

  // One set of bars will be 'active' and the other 'inactive'. If the download
  // is public, then all public bars will be active, and vice versa.
  let activeWindows = isPrivateDownload ? privateWindows : publicWindows;
  let inactiveWindows = isPrivateDownload ? publicWindows : privateWindows;

  let activeProgresses = activeWindows.map(
    window => gProgress[window.docShell.outerWindowID]
  );
  let inactiveProgresses = inactiveWindows.map(
    window => gProgress[window.docShell.outerWindowID]
  );

  for (let activeProgress of activeProgresses) {
    isProgressEqualTo(
      activeProgress,
      PLATFORM,
      "active",
      Ci.nsITaskbarProgress.STATE_NO_PROGRESS,
      0
    );
  }
  for (let inactiveProgress of inactiveProgresses) {
    isProgressEqualTo(
      inactiveProgress,
      PLATFORM,
      "inactive",
      Ci.nsITaskbarProgress.STATE_NO_PROGRESS,
      0
    );
  }

  let { download, downloadPromise, bumpProgress } = await addDownload({
    isPrivate: isPrivateDownload,
  });
  for (let i = 1; i <= 10; i++) {
    await bumpProgress();
    for (let activeProgress of activeProgresses) {
      isProgressEqualTo(
        activeProgress,
        PLATFORM,
        "active",
        i === 10
          ? Ci.nsITaskbarProgress.STATE_NO_PROGRESS
          : Ci.nsITaskbarProgress.STATE_NORMAL,
        i === 10 ? 0 : i / 10
      );
    }
    for (let inactiveProgress of inactiveProgresses) {
      isProgressEqualTo(
        inactiveProgress,
        PLATFORM,
        "inactive",
        Ci.nsITaskbarProgress.STATE_NO_PROGRESS,
        0
      );
    }
  }

  await downloadPromise;
  await removeDownload(download);
}

// Tests that a download is visible on the correct window.
//
// Linux (the GTK backend) only supports a single window to display progress
// on. As such, it can't use testActiveAndInactiveOnWindows; this is a
// simplified version of that test that checks whether _any_ progress is set.
async function testRepresentative({
  isPrivateDownload,
  representative,
  platform,
}) {
  await resetBetweenTests();

  await DownloadsTaskbar.registerIndicator(representative, platform);

  let progress = gProgress[representative.docShell.outerWindowID];

  isProgressEqualTo(
    progress,
    platform,
    "active",
    Ci.nsITaskbarProgress.STATE_NO_PROGRESS,
    0
  );

  let { download, downloadPromise, bumpProgress } = await addDownload({
    isPrivate: isPrivateDownload,
  });
  for (let i = 1; i <= 10; i++) {
    await bumpProgress();
    isProgressEqualTo(
      progress,
      platform,
      "active",
      i === 10
        ? Ci.nsITaskbarProgress.STATE_NO_PROGRESS
        : Ci.nsITaskbarProgress.STATE_NORMAL,
      i === 10 ? 0 : i / 10
    );
  }

  await downloadPromise;
  await removeDownload(download);
}

async function testPerAppProgress(aWindow) {
  await resetBetweenTests();
  gProgress[-1] = {};

  await DownloadsTaskbar.registerIndicator(
    aWindow,
    AppConstants.platform == "mac" ? null : "mac"
  );

  // 'public' and 'private' are JS keywords
  let priv = await addDownload({ isPrivate: true });
  let pub = await addDownload({ isPrivate: false });
  isProgressEqualTo(
    gProgress[-1],
    "mac",
    "perapp",
    Ci.nsITaskbarProgress.STATE_NO_PROGRESS,
    0
  );

  for (let i = 1; i <= 5; i++) {
    await priv.bumpProgress();
    isProgressEqualTo(
      gProgress[-1],
      "mac",
      "perapp",
      Ci.nsITaskbarProgress.STATE_NORMAL,
      i / 10
    );
  }

  for (let i = 1; i <= 9; i++) {
    await pub.bumpProgress();
    isProgressEqualTo(
      gProgress[-1],
      "mac",
      "perapp",
      Ci.nsITaskbarProgress.STATE_NORMAL,
      (i + 5) / 20
    );
  }

  for (let i = 6; i <= 9; i++) {
    await priv.bumpProgress();
    isProgressEqualTo(
      gProgress[-1],
      "mac",
      "perapp",
      Ci.nsITaskbarProgress.STATE_NORMAL,
      // This download finishes as the other continues.
      (i + 9) / 20
    );
  }

  await pub.bumpProgress();
  await priv.bumpProgress();
  isProgressEqualTo(
    gProgress[-1],
    "mac",
    "perapp",
    Ci.nsITaskbarProgress.STATE_NO_PROGRESS,
    0
  );

  await removeDownload(priv.download);
  await removeDownload(pub.download);
  await resetBetweenTests();
}

add_task(async function test_downloadsTaskbar() {
  // Test with one public and two private windows just to make sure the single
  // and multiple window cases work.
  let publicWindows = [window];
  let privateWindows = [
    await BrowserTestUtils.openNewBrowserWindow({
      private: true,
    }),
    await BrowserTestUtils.openNewBrowserWindow({
      private: true,
    }),
  ];

  if (AppConstants.platform == "win") {
    await testActiveAndInactiveOnWindows({
      isPrivateDownload: false,
      publicWindows,
      privateWindows,
    });

    await testActiveAndInactiveOnWindows({
      isPrivateDownload: true,
      publicWindows,
      privateWindows,
    });
  }

  if (AppConstants.platform == "linux") {
    await testRepresentative({
      isPrivateDownload: false,
      representative: publicWindows[0],
      platform: "linux",
    });

    await testRepresentative({
      isPrivateDownload: true,
      representative: publicWindows[0],
      platform: "linux",
    });
  }

  await testPerAppProgress(window);

  await BrowserTestUtils.closeWindow(privateWindows[0]);
  await BrowserTestUtils.closeWindow(privateWindows[1]);
});
