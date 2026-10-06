const { PermissionTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/PermissionTestUtils.sys.mjs"
);

SpecialPowers.addTaskImport(
  "E10SUtils",
  "resource://gre/modules/E10SUtils.sys.mjs"
);

function openPermissionPopup() {
  let promise = BrowserTestUtils.waitForEvent(
    gBrowser.documentGlobal,
    "popupshown",
    true,
    event => event.target == gPermissionPanel._permissionPopup
  );
  gPermissionPanel._identityPermissionBox.click();
  return promise;
}

function closePermissionPopup() {
  let promise = BrowserTestUtils.waitForEvent(
    gPermissionPanel._permissionPopup,
    "popuphidden"
  );
  gPermissionPanel._permissionPopup.hidePopup();
  return promise;
}

// Helpers for testing browser-scoped temporary permissions via the
// Permissions API in a content tab.

async function queryPermissionInTab(browser, permName) {
  return SpecialPowers.spawn(browser, [permName], async name => {
    let status = await content.navigator.permissions.query({ name });
    return status.state;
  });
}

// Browser-scoped permissions are forwarded to the content process via PContent
// IPC, which may arrive after SpecialPowers messages (different protocol).
// Poll the Permissions API until the expected state is visible.
async function waitForPermissionState(browser, permName, expectedState) {
  await BrowserTestUtils.waitForCondition(
    () =>
      queryPermissionInTab(browser, permName).then(s => s === expectedState),
    `Waiting for ${permName} to become "${expectedState}"`
  );
}

// Install an onchange listener in the content process. Resolves once the
// listener is installed. The caller should then trigger the permission change,
// and call waitForPermissionChange() to get the resulting state.
async function installOnChangeListener(browser, permName) {
  await SpecialPowers.spawn(browser, [permName], async name => {
    let status = await content.navigator.permissions.query({ name });
    content._permChangePromise = new Promise(resolve => {
      status.onchange = () => resolve(status.state);
    });
  });
}

async function waitForPermissionChange(browser) {
  return SpecialPowers.spawn(browser, [], () => content._permChangePromise);
}
