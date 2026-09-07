/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const CORRUPT_FILE_PATH = PathUtils.join(
  PathUtils.profileDir,
  "places.sqlite.corrupt"
);

add_setup(async function setup() {
  registerCleanupFunction(async function () {
    Services.prefs.clearUserPref("places.database.lastMaintenance");
    Services.prefs.clearUserPref("storage.vacuum.last.places.sqlite");
    await IOUtils.remove(CORRUPT_FILE_PATH);
  });
});

add_task(async function test_places_db_stats_table() {
  await doTestOnAboutSupportPage(async function (browser) {
    const [initialToggleText, toggleTextAfterShow, toggleTextAfterHide] =
      await SpecialPowers.spawn(browser, [], async function () {
        const toggleButton = content.document.getElementById(
          "place-database-stats-toggle"
        );
        const getToggleText = () =>
          content.document.l10n.getAttributes(toggleButton).id;
        const toggleTexts = [];
        const table = content.document.getElementById(
          "place-database-stats-tbody"
        );
        await ContentTaskUtils.waitForCondition(
          () => ContentTaskUtils.isHidden(table),
          "Stats table is hidden initially"
        );
        toggleTexts.push(getToggleText());
        toggleButton.click();
        await ContentTaskUtils.waitForCondition(
          () => ContentTaskUtils.isVisible(table),
          "Stats table is shown after first toggle"
        );
        toggleTexts.push(getToggleText());
        toggleButton.click();
        await ContentTaskUtils.waitForCondition(
          () => ContentTaskUtils.isHidden(table),
          "Stats table is hidden after second toggle"
        );
        toggleTexts.push(getToggleText());
        return toggleTexts;
      });
    Assert.equal(initialToggleText, "place-database-stats-show");
    Assert.equal(toggleTextAfterShow, "place-database-stats-hide");
    Assert.equal(toggleTextAfterHide, "place-database-stats-show");
  });
});

add_task(async function test_lastMaintenanceDate() {
  const TEST_DATA = [
    {
      date: 0,
      expected: "Missing",
    },
    {
      date: Math.floor(new Date("2025-11-21T12:16:30").getTime() / 1000),
      expected: "11/21/2025, 12:16 PM",
    },
  ];

  for (const { date, expected } of TEST_DATA) {
    Services.prefs.setIntPref("places.database.lastMaintenance", date);

    await doTestOnAboutSupportPage(async function (browser) {
      await waitUntilContentLabelUpdated({
        browser,
        id: "place-database-last-idle-maintenance-data",
        expected,
      });
      Assert.ok(true, "The lastMaintenance is displayed correctly");
    });
  }
});

add_task(async function test_lastVacuumDate() {
  const TEST_DATA = [
    {
      date: 0,
      expected: "Missing",
    },
    {
      date: Math.floor(new Date("2025-11-21T12:16:30").getTime() / 1000),
      expected: "11/21/2025, 12:16 PM",
    },
  ];

  for (const { date, expected } of TEST_DATA) {
    Services.prefs.setIntPref("storage.vacuum.last.places.sqlite", date);

    await doTestOnAboutSupportPage(async function (browser) {
      await waitUntilContentLabelUpdated({
        browser,
        id: "place-database-last-vacuum-date",
        expected,
      });
      Assert.ok(true, "The lastVacuumDate is displayed correctly");
    });
  }
});

add_task(async function test_lastIntegrityCorruptionDate() {
  const TEST_DATA = [
    {
      // No corruption file.
      date: 0,
      expected: "Missing",
    },
    {
      date: new Date("2025-11-21T12:16:30").getTime(),
      expected: "11/21/2025, 12:16 PM",
    },
  ];

  for (const { date, expected } of TEST_DATA) {
    if (date) {
      await IOUtils.writeUTF8(CORRUPT_FILE_PATH, "test");
      await IOUtils.setModificationTime(CORRUPT_FILE_PATH, date);
    }

    await doTestOnAboutSupportPage(async function (browser) {
      await waitUntilContentLabelUpdated({
        browser,
        id: "place-database-last-integrity-corruption-date",
        expected,
      });
      Assert.ok(true, "The lastIntegrityCorruptionDate is displayed correctly");
    });
  }
});

async function doTestOnAboutSupportPage(func) {
  await BrowserTestUtils.withNewTab({ gBrowser, url: "about:support" }, func);
}

async function waitUntilContentLabelUpdated({ browser, id, expected }) {
  await SpecialPowers.spawn(browser, [id, expected], async (i, e) => {
    const target = content.document.getElementById(i);
    await ContentTaskUtils.waitForMutationCondition(
      target,
      {
        characterData: true,
        childList: true,
        subtree: true,
      },
      () => target.textContent == e
    );
  });
}
