/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests that the basic console.log() works for workers

"use strict";

const TEST_URI =
  "http://example.com/browser/devtools/client/webconsole/" +
  "test/browser/test-console-workers.html";

add_task(async function() {
  info("Run the test with worker events dispatched to main thread");
  await pushPref("dom.worker.console.dispatch_events_to_main_thread", true);
  await testWorkerMessage();

  info("Run the test with worker events NOT dispatched to main thread");
  await pushPref("dom.worker.console.dispatch_events_to_main_thread", false);
  await testWorkerMessage(true);
});

async function testWorkerMessage(directConnectionToWorkerThread = false) {
  await addTab(TEST_URI);
  // Open the debugger first as it can cause some message to be duplicated (See Bug 1778852)
  await openDebugger();

  info("Open the console");
  const hud = await openConsole();

  const cachedMessage = await waitFor(() =>
    findConsoleAPIMessage(hud, "initial-message-from-worker")
  );
  is(
    findConsoleAPIMessages(hud, "initial-message-from-worker").length,
    1,
    "We get a single cached message from the worker"
  );

  ok(
    cachedMessage
      .querySelector(".message-body")
      .textContent.includes(`Object { foo: "bar" }`),
    "The simple object is logged as expected"
  );

  if (directConnectionToWorkerThread) {
    const scopeOi = cachedMessage.querySelector(
      ".object-inspector:last-of-type"
    );
    ok(
      scopeOi.textContent.includes(
        `DedicatedWorkerGlobalScope {`,
        `The worker scope is logged as expected: ${scopeOi.textContent}`
      )
    );
  }

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    content.wrappedJSObject.logFromWorker("live-message");
  });

  const liveMessage = await waitFor(() =>
    findConsoleAPIMessage(hud, "log-from-worker")
  );
  ok(true, "We get the cached message from the worker");

  ok(
    liveMessage
      .querySelector(".message-body")
      .textContent.includes(`live-message`),
    "The message is logged as expected"
  );

  if (directConnectionToWorkerThread) {
    const scopeOi = liveMessage.querySelector(".object-inspector:last-of-type");
    ok(
      scopeOi.textContent.includes(
        `DedicatedWorkerGlobalScope {`,
        `The worker scope is logged as expected: ${scopeOi.textContent}`
      )
    );

    info("Check that Symbol are properly logged");
    await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
      content.wrappedJSObject.logFromWorker("live-message");
    });

    const symbolMessage = await waitFor(() =>
      findConsoleAPIMessage(hud, 'Symbol("logged-symbol-from-worker")')
    );
    ok(symbolMessage, "Symbol logged from worker is visible in the console");
  }

  info("Click on the clear button and wait for messages to be removed");
  const onMessagesCacheCleared = hud.ui.once("messages-cache-cleared");
  hud.ui.window.document.querySelector(".devtools-clear-icon").click();
  await waitFor(
    () =>
      !findConsoleAPIMessage(hud, "initial-message-from-worker") &&
      !findConsoleAPIMessage(hud, "log-from-worker")
  );
  await onMessagesCacheCleared;
  ok(true, "Messages were removed");

  info("Close and reopen the console to check messages were cleared properly");
  await closeConsole();
  const toolbox = await openToolboxForTab(gBrowser.selectedTab, "webconsole");
  const newHud = toolbox.getCurrentPanel().hud;

  info(
    "Log a message and wait for it to appear so older messages would have been displayed"
  );
  const onSmokeMessage = waitForMessageByType(newHud, "smoke", ".console-api");
  SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    content.wrappedJSObject.console.log("smoke");
  });
  await onSmokeMessage;

  is(
    findConsoleAPIMessage(newHud, "initial-message-from-worker"),
    undefined,
    "Message cache was cleared"
  );
  is(
    findConsoleAPIMessage(newHud, "log-from-worker"),
    undefined,
    "Live message were cleared as well"
  );
  await closeTabAndToolbox();
}
