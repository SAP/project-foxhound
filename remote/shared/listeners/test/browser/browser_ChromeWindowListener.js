/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const { ChromeWindowListener } = ChromeUtils.importESModule(
  "chrome://remote/content/shared/listeners/ChromeWindowListener.sys.mjs"
);

add_task(async function test_openedOnNewWindow() {
  const listener = new ChromeWindowListener();
  const opened = listener.once("opened");

  listener.startListening();

  const win = await BrowserTestUtils.openNewBrowserWindow();

  const { window } = await opened;
  is(window, win, "Received expected window");

  listener.stopListening();
  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_closedOnWindowClose() {
  const listener = new ChromeWindowListener();
  const closed = listener.once("closed");

  const win = await BrowserTestUtils.openNewBrowserWindow();

  listener.startListening();

  await BrowserTestUtils.closeWindow(win);

  const { window } = await closed;
  is(window, win, "Received expected window");

  listener.stopListening();
});

add_task(async function test_multipleWindows() {
  const listener = new ChromeWindowListener();
  const openedEvents = [];

  listener.on("opened", (_eventName, data) => {
    openedEvents.push(data);
  });

  listener.startListening();

  const win1 = await BrowserTestUtils.openNewBrowserWindow();
  const win2 = await BrowserTestUtils.openNewBrowserWindow();

  await TestUtils.waitForCondition(() => openedEvents.length === 2);

  is(openedEvents.length, 2, "Received two opened events");
  is(openedEvents[0].window, win1, "First event has correct window");
  is(openedEvents[1].window, win2, "Second event has correct window");

  listener.stopListening();
  await BrowserTestUtils.closeWindow(win1);
  await BrowserTestUtils.closeWindow(win2);
});

add_task(async function test_noEventsBeforeStartListening() {
  const listener = new ChromeWindowListener();
  let eventReceived = false;

  listener.on("opened", () => {
    eventReceived = true;
  });

  const win = await BrowserTestUtils.openNewBrowserWindow();

  await TestUtils.waitForTick();

  ok(!eventReceived, "No event received when not listening");

  listener.startListening();

  await TestUtils.waitForTick();

  ok(
    !eventReceived,
    "No event received for windows opened before startListening"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_noEventsAfterStopListening() {
  const listener = new ChromeWindowListener();
  let eventCount = 0;

  listener.on("opened", () => {
    eventCount++;
  });

  listener.startListening();

  const win1 = await BrowserTestUtils.openNewBrowserWindow();

  await TestUtils.waitForCondition(() => eventCount === 1);

  listener.stopListening();

  const win2 = await BrowserTestUtils.openNewBrowserWindow();

  await TestUtils.waitForTick();

  is(eventCount, 1, "Only one event received before stopListening");

  await BrowserTestUtils.closeWindow(win1);
  await BrowserTestUtils.closeWindow(win2);
});

add_task(async function test_startListeningIdempotent() {
  const listener = new ChromeWindowListener();
  let eventCount = 0;

  listener.on("opened", () => {
    eventCount++;
  });

  listener.startListening();
  listener.startListening();

  const win = await BrowserTestUtils.openNewBrowserWindow();

  await TestUtils.waitForCondition(() => eventCount === 1);

  is(
    eventCount,
    1,
    "Only one event received despite multiple startListening calls"
  );

  listener.stopListening();
  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_stopListeningIdempotent() {
  const listener = new ChromeWindowListener();

  listener.startListening();
  listener.stopListening();
  listener.stopListening();

  ok(true, "Multiple stopListening calls do not throw");
});

add_task(async function test_destroyStopsListening() {
  const listener = new ChromeWindowListener();
  let eventCount = 0;

  listener.on("opened", () => {
    eventCount++;
  });

  listener.startListening();

  const win1 = await BrowserTestUtils.openNewBrowserWindow();

  await TestUtils.waitForCondition(() => eventCount === 1);

  listener.destroy();

  const win2 = await BrowserTestUtils.openNewBrowserWindow();

  await TestUtils.waitForTick();

  is(eventCount, 1, "No events received after destroy");

  await BrowserTestUtils.closeWindow(win1);
  await BrowserTestUtils.closeWindow(win2);
});
