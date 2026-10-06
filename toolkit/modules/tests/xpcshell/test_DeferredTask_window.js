/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

async function promiseMessageEvent(window) {
  let event = await new Promise(resolve => {
    window.addEventListener("message", resolve, { once: true });
  });
  return event.data;
}

add_task(async function test_deferred_task_in_window() {
  const windowlessBrowser = Services.appShell.createWindowlessBrowser(true);
  const { document } = windowlessBrowser;

  const messagePromise = promiseMessageEvent(document.defaultView);

  let script = document.createElement("script");
  script.src = "resource://test/test_DeferredTask_window/test_basics.js";
  document.documentElement.append(script);

  Assert.equal(
    await messagePromise,
    "arm_and_wait_should_run",
    "Basic operations of DeferredTask should work in a window context"
  );

  windowlessBrowser.close();
});

add_task(async function test_deferred_task_past_unload() {
  const windowlessBrowser = Services.appShell.createWindowlessBrowser(true);
  const { document } = windowlessBrowser;

  const results = [];

  await new Promise(resolve => {
    let iframe = document.createElement("iframe");
    document.documentElement.append(iframe);

    iframe.contentWindow.reportTestResult = msg => results.push(msg);

    let script = iframe.contentDocument.createElement("script");
    script.src = "resource://test/test_DeferredTask_window/test_iframe.js";
    script.onload = () => resolve();
    iframe.contentDocument.documentElement.append(script);
  });

  // The DeferredTask in test_iframe.js have short deadlines. Wait a little bit
  // more to see if the script would run and notify us.
  await new Promise(r => document.defaultView.setTimeout(r, 100));

  // Sanity check: the iframe was removed.
  Assert.equal(document.defaultView.frames.length, 0, "Frame was removed");

  // As a sanity check we verify that the iframe can send "removing_iframe",
  // but other than that we should not get any other message.
  Assert.deepEqual(
    results,
    ["removing_iframe"],
    "DeferredTask should not run after the window/iframe unloads"
  );

  windowlessBrowser.close();
});
