/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { IPProtectionToolbarButton } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPProtectionToolbarButton.sys.mjs"
);

/**
 * Tests that we can set a state, pass it to a fake element,
 * and correctly update CSS classes based on the state.
 */
add_task(function test_update_icon_status() {
  Services.prefs.setBoolPref(
    "browser.ipProtection.features.siteExceptions",
    true
  );

  const browser = Services.appShell.createWindowlessBrowser(true);
  const principal = Services.scriptSecurityManager.getSystemPrincipal();
  browser.docShell.createAboutBlankDocumentViewer(principal, principal);
  const document = browser.docShell.docViewer.DOMDocument;

  // Create a fake window with minimal gBrowser for the toolbar button
  const fakeWindow = {
    gBrowser: {
      addTabsProgressListener: () => {},
      removeTabsProgressListener: () => {},
      contentPrincipal: principal,
    },
    document,
  };

  let fakeToolbarItem = document.createXULElement("toolbaritem");
  // Create a fake toolbarButton instance
  let fakeToolbarButton = new IPProtectionToolbarButton(
    fakeWindow,
    "test-toolbarbutton"
  );

  Assert.equal(
    fakeToolbarItem.classList.length,
    0,
    "Toolbaritem class list should be empty"
  );

  // IP Protection is on
  fakeToolbarButton.updateIconStatus(fakeToolbarItem, {
    isActive: true,
    isError: false,
    isExcluded: false,
  });

  Assert.ok(
    fakeToolbarItem.classList.contains("ipprotection-on"),
    "Toolbaritem classlist should include ipprotection-on"
  );

  // IP Protection is excluded
  // isExcluded should override the active status even if isActive is set to true
  fakeToolbarButton.updateIconStatus(fakeToolbarItem, {
    isActive: true,
    isError: false,
    isExcluded: true,
  });

  Assert.ok(
    fakeToolbarItem.classList.contains("ipprotection-excluded"),
    "Toolbaritem classlist should include ipprotection-excluded"
  );

  // IP Protection error
  // isError should override the active status even if isActive is set to true
  fakeToolbarButton.updateIconStatus(fakeToolbarItem, {
    isActive: true,
    isError: true,
    isExcluded: false,
  });

  Assert.ok(
    fakeToolbarItem.classList.contains("ipprotection-error"),
    "Toolbaritem classlist should include ipprotection-error"
  );
  Assert.ok(
    !fakeToolbarItem.classList.contains("ipprotection-on"),
    "Toolbaritem classlist should not include ipprotection-on"
  );
  Assert.ok(
    !fakeToolbarItem.classList.contains("ipprotection-excluded"),
    "Toolbaritem classlist should not include ipprotection-excluded"
  );

  // IP Protection is off
  fakeToolbarButton.updateIconStatus(fakeToolbarItem, {
    isActive: false,
    isError: false,
    isExcluded: false,
  });

  Assert.ok(
    !fakeToolbarItem.classList.contains("ipprotection-error"),
    "Toolbaritem classlist should not include ipprotection-error"
  );
  Assert.ok(
    !fakeToolbarItem.classList.contains("ipprotection-on"),
    "Toolbaritem classlist should not include ipprotection-on"
  );
  Assert.ok(
    !fakeToolbarItem.classList.contains("ipprotection-excluded"),
    "Toolbaritem classlist should not include ipprotection-excluded"
  );

  // Cleanup
  fakeToolbarButton.uninit();
  Services.prefs.clearUserPref("browser.ipProtection.features.siteExceptions");
});
