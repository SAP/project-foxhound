/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const {
  STUBS_UPDATE_ENV,
  createCommandsForTab,
  getCleanedPacket,
  getSerializedPacket,
  getStubFile,
  writeStubsToFile,
} = require(`${CHROME_URL_ROOT}stub-generator-helpers`);

const TEST_URI =
  "https://example.com/browser/devtools/client/webconsole/test/browser/test-console-api.html";
const STUB_FILE = "pageError.js";

add_task(async function () {
  await pushPref("javascript.options.asyncstack_capture_debuggee_only", false);

  const isStubsUpdate = Services.env.get(STUBS_UPDATE_ENV) == "true";
  info(`${isStubsUpdate ? "Update" : "Check"} ${STUB_FILE}`);

  const generatedStubs = await generatePageErrorStubs();

  if (isStubsUpdate) {
    await writeStubsToFile(STUB_FILE, generatedStubs);
    ok(true, `${STUB_FILE} was updated`);
    return;
  }

  const existingStubs = getStubFile(STUB_FILE);
  const FAILURE_MSG =
    "The pageError stubs file needs to be updated by running `" +
    `mach test ${getCurrentTestFilePath()} --headless --setenv WEBCONSOLE_STUBS_UPDATE=true` +
    "`";

  if (generatedStubs.size !== existingStubs.rawPackets.size) {
    ok(false, FAILURE_MSG);
    return;
  }

  let failed = false;
  for (const [key, packet] of generatedStubs) {
    const packetStr = getSerializedPacket(packet, {
      sortKeys: true,
      replaceActorIds: true,
    });
    const existingPacketStr = getSerializedPacket(
      existingStubs.rawPackets.get(key),
      { sortKeys: true, replaceActorIds: true }
    );
    is(packetStr, existingPacketStr, `"${key}" packet has expected value`);
    failed = failed || packetStr !== existingPacketStr;
  }

  if (failed) {
    ok(false, FAILURE_MSG);
  } else {
    ok(true, "Stubs are up to date");
  }
});

async function generatePageErrorStubs() {
  const stubs = new Map();

  const tab = await addTab(TEST_URI);
  const commands = await createCommandsForTab(tab);
  await commands.targetCommand.startListening();
  const resourceCommand = commands.resourceCommand;

  // Ensure waiting for sources in order to populate message.sourceId correctly.
  await resourceCommand.watchResources([resourceCommand.TYPES.SOURCE], {
    onAvailable() {},
  });

  // The resource-watcher only supports a single call to watch/unwatch per
  // instance, so we attach a unique watch callback, which will forward the
  // resource to `handleErrorMessage`, dynamically updated for each command.
  let handleErrorMessage = function () {};

  const onErrorMessageAvailable = resources => {
    for (const resource of resources) {
      handleErrorMessage(resource);
    }
  };
  await resourceCommand.watchResources([resourceCommand.TYPES.ERROR_MESSAGE], {
    onAvailable: onErrorMessageAvailable,
  });

  for (const [key, code] of getCommands()) {
    const onPageError = new Promise(resolve => {
      handleErrorMessage = packet => resolve(packet);
    });

    // On e10s, the exception is triggered in child process
    // and is ignored by test harness
    // expectUncaughtException should be called for each uncaught exception.
    if (!Services.appinfo.browserTabsRemoteAutostart) {
      expectUncaughtException();
    }

    // Note: This needs to use ContentTask rather than SpecialPowers.spawn
    // because the latter includes cross-process stack information.
    await ContentTask.spawn(gBrowser.selectedBrowser, code, function (subCode) {
      const script = content.document.createElement("script");
      script.append(content.document.createTextNode(subCode));
      content.document.body.append(script);
      script.remove();
    });

    const packet = await onPageError;
    stubs.set(key, getCleanedPacket(key, packet));
  }

  return stubs;
}

function getCommands() {
  const pageError = new Map();

  pageError.set(
    "ReferenceError: asdf is not defined",
    `
  function bar() {
    asdf()
  }
  function foo() {
    bar()
  }

  foo()
`
  );

  pageError.set(
    "TypeError longString message",
    `throw new Error("Long error ".repeat(10000))`
  );
  return pageError;
}
