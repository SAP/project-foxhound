/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

async function openLibrary() {
  return new Promise(resolve => {
    let library = window.openDialog(
      "chrome://browser/content/places/places.xhtml",
      "",
      "chrome,toolbar=yes,dialog=no,resizable"
    );
    waitForFocus(() => resolve(library), library);
  });
}

add_setup(async function setup() {
  await setupPolicyEngineWithJson({
    policies: {
      DisableProfileImport: true,
    },
  });
});

add_task(async function test_disable_profile_import() {
  let library = await openLibrary();

  let menu = library.document.getElementById("maintenanceButtonPopup");
  let promisePopupShown = BrowserTestUtils.waitForEvent(menu, "popupshown");
  menu.openPopup();
  await promisePopupShown;

  let profileImportButton = library.document.getElementById("browserImport");
  is(
    profileImportButton.disabled,
    true,
    "Profile Import button should be disabled"
  );

  let promisePopupHidden = BrowserTestUtils.waitForEvent(menu, "popuphidden");
  menu.hidePopup();
  await promisePopupHidden;

  await BrowserTestUtils.closeWindow(library);

  checkLockedPref("browser.newtabpage.activity-stream.migrationExpired", true);
});

add_task(async function test_file_menu() {
  gFileMenu.updateImportCommandEnabledState();

  let command = document.getElementById("cmd_file_importFromAnotherBrowser");
  ok(
    command.getAttribute("disabled"),
    "The `Import from Another Browser…` File menu item command should be disabled"
  );

  if (Services.appinfo.OS == "Darwin") {
    // We would need to have a lot of boilerplate to open the menus on Windows
    // and Linux to test this there.
    let menuitem = document.getElementById("menu_importFromAnotherBrowser");
    ok(
      menuitem.disabled,
      "The `Import from Another Browser…` File menu item should be disabled"
    );
  }
});

add_task(async function test_import_button() {
  await PlacesUIUtils.maybeAddImportButton();
  ok(
    !document.getElementById("import-button"),
    "Import button should be hidden."
  );
});

add_task(async function test_about_logins() {
  await BrowserTestUtils.withNewTab("about:logins", async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      await ContentTaskUtils.waitForCondition(
        () =>
          content.document.documentElement.classList.contains("initialized"),
        "waiting for about:logins to initialize"
      );
      let menuButton = Cu.waiveXrays(
        content.document.querySelector("menu-button")
      );
      Assert.ok(
        menuButton.shadowRoot.querySelector(".menuitem-import-browser").hidden,
        "Import from another browser menu item should be hidden"
      );
    });
  });
});

add_task(async function test_import_button_hidden_in_palette() {
  let customizationReady = BrowserTestUtils.waitForEvent(
    gNavToolbox,
    "customizationready"
  );
  gCustomizeMode.enter();
  await customizationReady;

  ok(
    document.documentElement.hasAttribute("disableprofileimport"),
    "Root should have disableprofileimport attribute in customize mode."
  );
  let wrapper = document.getElementById("wrapper-import-button");
  ok(wrapper, "Import button wrapper should exist in palette.");
  ok(
    BrowserTestUtils.isHidden(wrapper),
    "Import button wrapper should be hidden in palette."
  );

  let afterCustomization = BrowserTestUtils.waitForEvent(
    gNavToolbox,
    "aftercustomization"
  );
  gCustomizeMode.exit();
  await afterCustomization;
});

add_task(async function test_import_button_existing_profile() {
  // Simulate an existing profile that had the import button previously added.
  await SpecialPowers.pushPrefEnv({
    set: [["browser.bookmarks.addedImportButton", true]],
  });
  CustomizableUI.addWidgetToArea(
    "import-button",
    CustomizableUI.AREA_BOOKMARKS,
    0
  );
  ok(
    document.getElementById("import-button"),
    "Import button should be present before calling maybeAddImportButton."
  );

  const { PlacesBrowserStartup } = ChromeUtils.importESModule(
    "moz-src:///browser/components/places/PlacesBrowserStartup.sys.mjs"
  );
  await PlacesBrowserStartup.maybeAddImportButton();

  ok(
    !document.getElementById("import-button"),
    "Import button should be removed when DisableProfileImport policy is set."
  );
  ok(
    !Services.prefs.prefHasUserValue("browser.bookmarks.addedImportButton"),
    "addedImportButton pref should be cleared."
  );

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_prefs_entrypoint() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.migrate.preferences-entrypoint.enabled", true]],
  });

  let finalPaneEvent = Services.prefs.getBoolPref("identity.fxaccounts.enabled")
    ? "sync-pane-loaded"
    : "privacy-pane-loaded";
  let finalPrefPaneLoaded = TestUtils.topicObserved(finalPaneEvent, () => true);
  await BrowserTestUtils.withNewTab(
    "about:preferences#general-migrate",
    async browser => {
      await finalPrefPaneLoaded;
      await browser.contentWindow.customElements.whenDefined(
        "migration-wizard"
      );
      let doc = browser.contentDocument;
      const entrypoint = Services.prefs.getBoolPref(
        "browser.settings-redesign.enabled",
        false
      )
        ? doc.querySelector('setting-group[groupid="importBrowserData"]')
        : doc.getElementById("dataMigrationGroup");
      ok(entrypoint, "Import entrypoint group should exist.");
      ok(
        BrowserTestUtils.isHidden(entrypoint),
        "Import entrypoint should be hidden in prefs if disabled via policy."
      );
      ok(
        !doc.getElementById("migrationWizardDialog").open,
        "Should not have opened the migration wizard."
      );
    }
  );
});
