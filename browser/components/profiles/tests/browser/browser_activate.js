/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

add_task(
  async function test_activate_expects_no_new_window_when_browser_opened() {
    let sawWindow = false;
    let observer = () => (sawWindow = true);

    Services.ww.registerNotification(observer);
    let profile = Services.dirsvc.get("ProfD", Ci.nsIFile).path;

    let process = Cc["@mozilla.org/process/util;1"].createInstance(
      Ci.nsIProcess
    );
    let executable = Services.dirsvc.get("XREExeF", Ci.nsIFile);
    process.init(executable);

    await new Promise(resolve =>
      process.runwAsync(
        ["--profile", profile, "--profiles-activate"],
        3,
        resolve
      )
    );

    Services.ww.unregisterNotification(observer);

    Assert.ok(!sawWindow, "Should not see a new window open");
  }
);

add_task(async function test_activate_expects_new_window_when_browser_closed() {
  const root = document.documentElement;
  const origType = root.getAttribute("windowtype");
  root.setAttribute("windowtype", "test:nonbrowser");
  registerCleanupFunction(() => root.setAttribute("windowtype", origType));

  let windowOpenedPromise = BrowserTestUtils.waitForNewWindow();

  let profile = Services.dirsvc.get("ProfD", Ci.nsIFile).path;
  let process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
  let executable = Services.dirsvc.get("XREExeF", Ci.nsIFile);
  process.init(executable);

  await new Promise(resolve =>
    process.runwAsync(["--profile", profile, "--profiles-activate"], 3, resolve)
  );

  const newWindow = await windowOpenedPromise;
  Assert.ok(newWindow, "Got reference to new browser window");
  Assert.notStrictEqual(
    newWindow,
    window,
    "Most recent window is not the test runner window"
  );
  await BrowserTestUtils.closeWindow(newWindow);
});
