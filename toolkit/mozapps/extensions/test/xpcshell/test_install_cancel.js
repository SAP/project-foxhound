/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */
"use strict";

var testserver = createHttpServer({ hosts: ["example.com"] });

AddonTestUtils.createAppInfo(
  "xpcshell@tests.mozilla.org",
  "XPCShell",
  "1",
  "1.9.2"
);

class TestListener {
  constructor(listener) {
    this.listener = listener;
  }

  onDataAvailable(...args) {
    this.origListener.onDataAvailable(...args);
  }

  onStartRequest(request) {
    if (this.listener.onStartRequest) {
      this.listener.onStartRequest(request);
    }
    this.origListener.onStartRequest(request);
  }

  onStopRequest(request, status) {
    if (this.listener.onStopRequest) {
      this.listener.onStopRequest(request, status);
    }
    this.origListener.onStopRequest(request, status);
  }
}

function startListener(listener) {
  let observer = {
    observe(subject) {
      let channel = subject.QueryInterface(Ci.nsIHttpChannel);
      if (channel.URI.spec.endsWith("/addons/test.xpi")) {
        let channelListener = new TestListener(listener);
        channelListener.origListener = subject
          .QueryInterface(Ci.nsITraceableChannel)
          .setNewListener(channelListener);
        Services.obs.removeObserver(observer, "http-on-modify-request");
      }
    },
  };
  Services.obs.addObserver(observer, "http-on-modify-request");
}

add_setup(async function setup() {
  let xpi = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      name: "Test",
      version: "1.0",
      browser_specific_settings: { gecko: { id: "cancel@test" } },
    },
  });
  testserver.registerFile(`/addons/test.xpi`, xpi);
  await AddonTestUtils.promiseStartupManager();
});

// This test checks that canceling an install after the download is completed fails
// and throws an exception as expected
add_task(async function test_install_cancelled() {
  let url = "http://example.com/addons/test.xpi";
  let install = await AddonManager.getInstallForURL(url, {
    name: "Test",
    version: "1.0",
  });

  let cancelInstall = new Promise(resolve => {
    startListener({
      onStopRequest() {
        resolve(Promise.resolve().then(() => install.cancel()));
      },
    });
  });

  await install.install().then(() => {
    ok(true, "install succeeded");
  });

  await cancelInstall
    .then(() => {
      ok(false, "cancel should not succeed");
    })
    .catch(e => {
      ok(!!e, "cancel threw an exception");
    });
});

add_task(async function test_install_user_cancelled() {
  let url = "http://example.com/addons/test.xpi";
  let install = await AddonManager.getInstallForURL(url, {
    name: "Test",
    version: "1.0",
  });

  install.promptHandler = () => {
    return Promise.reject();
  };

  await promiseCompleteInstall(install);

  await TestUtils.waitForCondition(
    () => !install.file.exists(),
    "wait for temp file to be removed"
  );
});

add_task(async function test_install_cancelled_on_quit_or_offline() {
  const TOPICS = [
    "quit-application-granted",
    "network:offline-about-to-go-offline",
  ];

  const server = AddonTestUtils.createHttpServer({
    hosts: ["slow.example.com"],
  });
  let pendingResponses = [];
  server.registerPathHandler("/addons/test.xpi", (request, response) => {
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Content-Type", "application/x-xpinstall");
    pendingResponses.push(response);
    response.processAsync();
    response.write("Here are some bytes");
  });
  const cleanupResponses = () => {
    pendingResponses.forEach(res => res.finish());
    pendingResponses = [];
  };
  registerCleanupFunction(cleanupResponses);

  for (let topic of TOPICS) {
    info(`Verify DownloadAddonInstall cancelled on topic ${topic}`);

    let url = "http://slow.example.com/addons/test.xpi";
    let install = await AddonManager.getInstallForURL(url, {
      name: "Test",
      version: "1.0",
    });
    let downloadStarted = new Promise(resolve => {
      startListener({
        onStartRequest() {
          resolve();
        },
      });
    });
    let installPromise = install.install();
    await downloadStarted;
    equal(install.state, AddonManager.STATE_DOWNLOADING, "install was started");
    Services.obs.notifyObservers(null, topic);
    await Assert.rejects(
      installPromise,
      /Install failed: onDownloadCancelled/,
      "Got the expected install onDownloadCancelled failure"
    );
    equal(install.state, AddonManager.STATE_CANCELLED, "install was cancelled");
    cleanupResponses();
  }
});
