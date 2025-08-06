/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that the wizard switches to the NO_BROWSERS_FOUND page
 * when no migrators are detected.
 */
add_task(async function test_browser_no_programs() {
  let sandbox = sinon.createSandbox();
  registerCleanupFunction(() => {
    sandbox.restore();
  });

  sandbox.stub(MigrationUtils, "availableMigratorKeys").get(() => {
    return [];
  });

  await withMigrationWizardDialog(async prefsWin => {
    let dialog = prefsWin.document.querySelector("#migrationWizardDialog");
    let wizard = dialog.querySelector("migration-wizard");
    let shadow = wizard.openOrClosedShadowRoot;
    let deck = shadow.querySelector("#wizard-deck");

    await BrowserTestUtils.waitForMutationCondition(
      deck,
      { attributeFilter: ["selected-view"] },
      () => {
        return (
          deck.getAttribute("selected-view") ==
          "page-" + MigrationWizardConstants.PAGES.NO_BROWSERS_FOUND
        );
      }
    );

    Assert.ok(
      true,
      "Went to no browser page after attempting to search for migrators."
    );
    let chooseImportFromFile = shadow.querySelector("#choose-import-from-file");
    Assert.ok(
      !chooseImportFromFile.hidden,
      "Selecting a file migrator should still be possible."
    );
  });

  sandbox.restore();
});
