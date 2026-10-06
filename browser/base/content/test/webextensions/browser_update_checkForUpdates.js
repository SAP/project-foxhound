// Invoke the "Check for Updates" menu item
async function checkAll(win) {
  await triggerPageOptionsAction(win, "check-for-updates");
  return new Promise(resolve => {
    let observer = {
      observe() {
        Services.obs.removeObserver(observer, "EM-update-check-finished");
        resolve();
      },
    };
    Services.obs.addObserver(observer, "EM-update-check-finished");
  });
}

// Test "Check for Updates" with both auto-update settings
add_task(() => interactiveUpdateTest(true, checkAll));
add_task(() => interactiveUpdateTest(false, checkAll));
