"use strict";

const PAGE_MANAGE_ADDRESSES = "about:preferences#manageAddresses";

const SELECTORS = {
  records: "#address-item",
  add: "#add-address-button",
  edit: "#edit-address-button",
  delete: "#delete-address-button",
};

const TEST_ADDRESSES = [
  TEST_ADDRESS_1,
  TEST_ADDRESS_2,
  TEST_ADDRESS_3,
  TEST_ADDRESS_4,
  TEST_ADDRESS_5,
];

async function clearAddresses() {
  await removeAllRecords();
}

async function addAddresses(addresses) {
  for (let address of addresses) {
    await setStorage(address);
  }
}

async function withManageAddressesPage(taskFn) {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: PAGE_MANAGE_ADDRESSES },
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        const page = content.document.querySelector(
          '[data-category="paneManageAddresses"]'
        );

        await ContentTaskUtils.waitForCondition(
          () => page && !page.hidden,
          "Manage Addresses page did not become visible"
        );
      });

      await taskFn(browser);
    }
  );
}

add_task(async function test_manageAddresses_initial_state() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });

  await clearAddresses();

  await withManageAddressesPage(async browser => {
    await SpecialPowers.spawn(browser, [SELECTORS], async selectors => {
      const records = content.document.querySelectorAll(selectors.records);
      const addBtn = content.document.querySelector(selectors.add);
      const editBtn = content.document.querySelectorAll(selectors.edit);
      const deleteBtn = content.document.querySelectorAll(selectors.delete);

      is(records.length, 0, "No addresses initially");
      ok(!addBtn.disabled, "Add enabled");
      is(
        editBtn.length,
        0,
        "No edit buttons present since no addresses initially"
      );
      is(
        deleteBtn.length,
        0,
        "No delete buttons present since no addresses initially"
      );
    });
  });
});

add_task(async function test_remove_single_and_multiple_addresses() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });

  await clearAddresses();

  await addAddresses(TEST_ADDRESSES.slice(0, 3));

  await withManageAddressesPage(async browser => {
    info("Deleting first address");
    let dialogPromise = BrowserTestUtils.promiseAlertDialog("accept");

    await SpecialPowers.spawn(browser, [SELECTORS], async selectors => {
      content.document.querySelectorAll(selectors.delete)[0].click();
    });

    await dialogPromise;
    ok(true, "First address deleted through confirmation dialog");

    await SpecialPowers.spawn(browser, [SELECTORS], async selectors => {
      await ContentTaskUtils.waitForCondition(
        () => content.document.querySelectorAll(selectors.records).length === 2,
        "First address removed"
      );
    });

    info("Deleting second address");
    dialogPromise = BrowserTestUtils.promiseAlertDialog("accept");

    await SpecialPowers.spawn(browser, [SELECTORS], async selectors => {
      content.document.querySelectorAll(selectors.delete)[0].click();
    });

    await dialogPromise;
    ok(true, "Second address deleted through confirmation dialog");

    await SpecialPowers.spawn(browser, [SELECTORS], async selectors => {
      await ContentTaskUtils.waitForCondition(
        () => content.document.querySelectorAll(selectors.records).length === 1,
        "Second address removed"
      );
    });

    info("Deleting third address");
    dialogPromise = BrowserTestUtils.promiseAlertDialog("accept");

    await SpecialPowers.spawn(browser, [SELECTORS], async selectors => {
      content.document.querySelectorAll(selectors.delete)[0].click();
    });

    await dialogPromise;
    ok(true, "Third address deleted through confirmation dialog");

    await SpecialPowers.spawn(browser, [SELECTORS], async selectors => {
      await ContentTaskUtils.waitForCondition(
        () => content.document.querySelectorAll(selectors.records).length === 0,
        "Third address removed"
      );
    });

    ok(true, "All addresses successfully removed");
  });
});

add_task(async function test_manageAddresses_watches_storage_changes() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });

  await clearAddresses();

  await withManageAddressesPage(async browser => {
    await SpecialPowers.spawn(browser, [SELECTORS], async selectors => {
      let records = content.document.querySelectorAll(selectors.records);
      is(records.length, 0, "Initially no addresses");
    });
    await setStorage(TEST_ADDRESS_1);
    await SpecialPowers.spawn(browser, [SELECTORS], async selectors => {
      await ContentTaskUtils.waitForCondition(
        () => content.document.querySelectorAll(selectors.records).length === 1,
        "Address added via storage"
      );
    });
    await removeAllRecords();
    await SpecialPowers.spawn(browser, [SELECTORS], async selectors => {
      await ContentTaskUtils.waitForCondition(
        () => content.document.querySelectorAll(selectors.records).length === 0,
        "Address removed via storage"
      );
    });
  });
});
