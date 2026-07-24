/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

"use strict";

const ONBOARDING_MESSAGE_MASK_PREF =
  "browser.ipProtection.onboardingMessageMask";

/**
 * Opens the dialog for a specified permission type with a set capabilityFilter.
 *
 * @param {Browser} browser
 *  The current browser instance.
 * @param {1 | 2} capabilityFilter
 *  1 for Ci.nsIPermissionManager.ALLOW_ACTION or 2 for Ci.nsIPermissionManager.DENY_ACTION.
 * @returns {Window} The dialog window.
 */
async function openDialogWithFilter(permissionType, browser, capabilityFilter) {
  let params = {
    hideStatusColumn: true,
    prefilledHost: "",
    permissionType,
    capabilityFilter,
  };

  let dialogLoaded = TestUtils.topicObserved("subdialog-loaded");

  browser.contentWindow.gSubDialog.open(
    "chrome://browser/content/preferences/dialogs/permissions.xhtml",
    { features: "resizable=yes" },
    params
  );

  let [dialogWin] = await dialogLoaded;
  return dialogWin;
}

function addMockPrincipal(permissionType, site, capability) {
  let principal =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(site);
  Services.perms.addFromPrincipal(principal, permissionType, capability);
}

/**
 * Returns an array of 2 sites origins that match the specified permission capability
 * action and 1 site origin that does not match the capability action.
 *
 *  @param {string} permissionType
 *  The name of the permission type.
 * @param {1 | 2} capabilityToFilter
 *  1 for Ci.nsIPermissionManager.ALLOW_ACTION or 2 for Ci.nsIPermissionManager.DENY_ACTION.
 * @returns {Array<string>}
 *  An array of site origins.
 *
 * @see MODE_PREF
 */
function getMockSiteOrigins(permissionType, capabilityToFilter) {
  const site1 = "https://www.example.com";
  const site2 = "https://www.another.example.com";
  const site3 = "https://www.shouldbeignored.example.org";

  const DENY_ACTION = Ci.nsIPermissionManager.DENY_ACTION;
  const ALLOW_ACTION = Ci.nsIPermissionManager.ALLOW_ACTION;

  let expectedCapability;
  let unexpectedCapability;

  if (capabilityToFilter === DENY_ACTION) {
    expectedCapability = DENY_ACTION;
    unexpectedCapability = ALLOW_ACTION;
  } else {
    expectedCapability = ALLOW_ACTION;
    unexpectedCapability = DENY_ACTION;
  }

  // Let's add 2 permissions of the specified capability
  addMockPrincipal(permissionType, site1, expectedCapability);
  addMockPrincipal(permissionType, site2, expectedCapability);

  // And let's add 1 permission opposite of the specified capability.
  // Eg. if capabilityFilter is ALLOW_ACTION, then the 1 opposite permission has DENY_ACTION.
  addMockPrincipal(permissionType, site3, unexpectedCapability);

  // Before we test our dialog, let's double check that permissions were loaded correctly.
  let expectedSites = Services.perms
    .getAllByTypes([permissionType])
    .filter(perm => perm.capability === expectedCapability);
  let unexpectedSites = Services.perms
    .getAllByTypes([permissionType])
    .filter(perm => perm.capability === unexpectedCapability);

  let expectedTypeName =
    capabilityToFilter === ALLOW_ACTION ? "ALLOW_ACTION" : "DENY_ACTION";
  let unexpectedTypeName =
    capabilityToFilter === ALLOW_ACTION ? "DENY_ACTION" : "ALLOW_ACTION";

  Assert.equal(
    expectedSites.length,
    2,
    `There should be 2 permissions with ${expectedTypeName}`
  );
  Assert.equal(
    unexpectedSites.length,
    1,
    `There should be 1 permission with ${unexpectedTypeName}`
  );

  let sites = [
    expectedSites.map(permission => permission.principal.prePath),
    unexpectedSites.map(permission => permission.principal.prePath),
  ].flat();

  return sites;
}

/**
 * Opens the permissions dialog with a capabilityFilter and checks that only sites with
 * the specified capability action are displayed.
 *
 * @param {Array<string>} sitesArray
 *  An array of site origins.
 * @param {1 | 2} capabilityFilter
 *  1 for Ci.nsIPermissionManager.ALLOW_ACTION or 2 for Ci.nsIPermissionManager.DENY_ACTION.
 */
async function testFilteredPermissionsInDialog(
  permissionType,
  sitesArray,
  capabilityFilter
) {
  await BrowserTestUtils.withNewTab("about:preferences", async browser => {
    let dialog = await openDialogWithFilter(
      permissionType,
      browser,
      capabilityFilter
    );
    Assert.ok(dialog, "Dialog was found");

    let permissionsBox = dialog.document.getElementById("permissionsBox");

    // Wait for all permissions to load
    await BrowserTestUtils.waitForMutationCondition(
      permissionsBox,
      { childList: true, subtree: true },
      () => {
        return permissionsBox.itemCount === 2;
      }
    );

    let numberOfPermissions = permissionsBox.itemCount;
    Assert.equal(
      numberOfPermissions,
      2,
      "There should be 2 permissions in the dialog"
    );

    let displayedSites = Array.from(permissionsBox.children).map(entry =>
      entry.getAttribute("origin")
    );
    Assert.ok(
      displayedSites.includes(sitesArray[0]),
      `${sitesArray[0]} was displayed in the dialog`
    );
    Assert.ok(
      displayedSites.includes(sitesArray[1]),
      `${sitesArray[1]} was displayed in the dialog`
    );
    Assert.ok(
      !displayedSites.includes(sitesArray[2]),
      `${sitesArray[2]} was not displayed in the dialog`
    );
  });
}

function cleanupPermissions(permissionType) {
  Services.perms.removeByType(permissionType);
}

/**
 * Tests that we can filter the permissions dialog to only show
 * permissions with DENY_ACTION capability.
 */
add_task(async function test_filter_dialog_DENY_ACTION_only() {
  // capabilityFilter isn't exclusive to any permission type.
  // Let's use ipp-vpn as an example to test the filter.
  const permissionType = "ipp-vpn";
  const capabilityFilter = Ci.nsIPermissionManager.DENY_ACTION;

  let sites = getMockSiteOrigins(permissionType, capabilityFilter);

  await testFilteredPermissionsInDialog(
    permissionType,
    sites,
    capabilityFilter
  );

  cleanupPermissions(permissionType);
  // Since we're using ipp-vpn for this test, clear any prefs related to the permission.
  // We can remove this line if we change the permission type.
  Services.prefs.clearUserPref(ONBOARDING_MESSAGE_MASK_PREF);
});

/**
 * Tests that we can filter the permissions dialog to only show
 * permissions with ALLOW_ACTION capability.
 */
add_task(async function test_filter_dialog_ALLOW_ACTION_only() {
  // capabilityFilter isn't exclusive to any permission type.
  // Let's use ipp-vpn as an example to test the filter.
  const permissionType = "ipp-vpn";
  const capabilityFilter = Ci.nsIPermissionManager.ALLOW_ACTION;

  let sites = getMockSiteOrigins(permissionType, capabilityFilter);

  await testFilteredPermissionsInDialog(
    permissionType,
    sites,
    capabilityFilter
  );

  cleanupPermissions(permissionType);
  // Since we're using ipp-vpn for this test, clear any prefs related to the permission.
  // We can remove this line if we change the permission type.
  Services.prefs.clearUserPref(ONBOARDING_MESSAGE_MASK_PREF);
});
