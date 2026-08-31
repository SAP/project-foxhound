/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { TaskbarTabs } = ChromeUtils.importESModule(
  "resource:///modules/taskbartabs/TaskbarTabs.sys.mjs"
);

add_task(async function test_PIN_TASKBAR_TAB_success() {
  const stub = sinon
    .stub(TaskbarTabs, "findOrCreateTaskbarTab")
    .resolves({ created: true });

  const action = {
    type: "PIN_TASKBAR_TAB",
    data: {
      url: EXAMPLE_URL,
      name: "Example",
      iconUrl: "https://example.com/icon.png",
    },
  };

  const result = await SMATestUtils.executeAndValidateAction(action);

  Assert.equal(
    stub.callCount,
    1,
    "findOrCreateTaskbarTab called once for a fresh pin"
  );
  Assert.equal(result, true, "returns true when the tab is newly created");

  stub.restore();
});

add_task(async function test_PIN_TASKBAR_TAB_already_pinned() {
  const stub = sinon
    .stub(TaskbarTabs, "findOrCreateTaskbarTab")
    .resolves({ created: false });

  const action = {
    type: "PIN_TASKBAR_TAB",
    data: {
      url: EXAMPLE_URL,
      name: "Example",
      iconUrl: "https://example.com/icon.png",
    },
  };

  const result = await SMATestUtils.executeAndValidateAction(action);

  Assert.strictEqual(
    result,
    null,
    "returns null when the Taskbar Tab already exists and is pinned"
  );

  stub.restore();
});

add_task(async function test_PIN_TASKBAR_TAB_error() {
  const stub = sinon
    .stub(TaskbarTabs, "findOrCreateTaskbarTab")
    .rejects(new Error("OS error"));

  const action = {
    type: "PIN_TASKBAR_TAB",
    data: {
      url: EXAMPLE_URL,
      name: "Example",
      iconUrl: "https://example.com/icon.png",
    },
  };

  const result = await SMATestUtils.executeAndValidateAction(action);

  Assert.equal(
    result,
    false,
    "returns false when findOrCreateTaskbarTab throws"
  );

  stub.restore();
});

add_task(async function test_PIN_TASKBAR_TAB_builds_manifest() {
  const stub = sinon
    .stub(TaskbarTabs, "findOrCreateTaskbarTab")
    .resolves({ created: true });

  const action = {
    type: "PIN_TASKBAR_TAB",
    data: {
      url: "https://example.com/app/index.html",
      name: "Example App",
      iconUrl: "https://example.com/icon.png",
    },
  };

  await SMATestUtils.executeAndValidateAction(action);

  Assert.equal(stub.callCount, 1, "findOrCreateTaskbarTab called once");

  const [uri, userContextId, options] = stub.firstCall.args;
  Assert.equal(
    uri.spec,
    "https://example.com/app/index.html",
    "URI passed through unchanged"
  );
  Assert.equal(userContextId, 0, "userContextId is 0");
  Assert.deepEqual(
    options.manifest,
    {
      name: "Example App",
      start_url: "https://example.com/app/index.html",
      scope: "https://example.com/",
      icons: [
        {
          src: "https://example.com/icon.png",
          sizes: "256x256",
          type: "image/png",
        },
      ],
    },
    "manifest is constructed from action data with prePath-based scope"
  );

  stub.restore();
});

add_task(async function test_PIN_TASKBAR_TAB_rejects_non_http_url() {
  const stub = sinon.stub(TaskbarTabs, "findOrCreateTaskbarTab");

  const action = {
    type: "PIN_TASKBAR_TAB",
    data: {
      url: "file:///etc/passwd",
      name: "Bad",
      iconUrl: "https://example.com/icon.png",
    },
  };

  const result = await SMATestUtils.executeAndValidateAction(action);

  Assert.equal(result, false, "returns false for non-HTTP/HTTPS URLs");
  Assert.equal(stub.callCount, 0, "findOrCreateTaskbarTab not called");

  stub.restore();
});
