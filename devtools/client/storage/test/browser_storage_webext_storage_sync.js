/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals browser */

"use strict";

add_setup(async function () {
  // Always on top mode mess up with toolbox focus and openStoragePanelForAddon would timeout
  // waiting for toolbox focus.
  await pushPref("devtools.toolbox.alwaysOnTop", false);
});

/**
 * storage.sync serializes item values with JSON before persisting them, so the
 * panel always receives plain JSON. This test verifies that those values are
 * displayed as expected in the table and sidebar, and that they can be edited
 * unless their parsed structure is nested too deeply for the panel to handle.
 */
add_task(
  async function test_extension_toolbox_only_supported_values_editable_in_sync() {
    async function background() {
      browser.test.onMessage.addListener(async (msg, ...args) => {
        switch (msg) {
          case "storage-sync-set":
            await browser.storage.sync.set(args[0]);
            break;
          case "storage-sync-get": {
            const items = await browser.storage.sync.get(args[0]);
            for (const [key, val] of Object.entries(items)) {
              browser.test.assertTrue(
                val === args[1],
                `New value ${val} is set for key ${key}.`
              );
            }
            break;
          }
          case "storage-sync-fireOnChanged": {
            const listener = () => {
              browser.storage.onChanged.removeListener(listener);
              browser.test.sendMessage("storage-sync-onChanged");
            };
            browser.storage.onChanged.addListener(listener);
            // Call an API method implemented in the parent process
            // to ensure that the listener has been registered
            // in the main process before the test proceeds.
            await browser.runtime.getPlatformInfo();
            break;
          }
          default:
            browser.test.fail(`Unexpected test message: ${msg}`);
        }

        browser.test.sendMessage(`${msg}:done`);
      });
      browser.test.sendMessage("extension-origin", window.location.origin);
    }
    const extension = ExtensionTestUtils.loadExtension({
      manifest: {
        permissions: ["storage"],
        // The storage.sync API requires an explicit add-on ID.
        browser_specific_settings: {
          gecko: { id: "webext-storage-sync@mochitest" },
        },
      },
      background,
      useAddonManager: "temporary",
    });

    await extension.startup();

    const host = await extension.awaitMessage("extension-origin");

    const itemsSupported = {
      arr: [1, 2],
      bool: true,
      null: null,
      num: 4,
      obj: { a: 123 },
      str: "hi",
      // Nested objects or arrays at most 2 levels deep should be editable
      nestedArr: [
        {
          a: "b",
        },
        "c",
      ],
      nestedObj: {
        a: [1, 2, "long-".repeat(500)],
        b: 3,
      },
      // Unlike the IndexedDB backend used by storage.local, the storage.sync
      // backend serializes values with JSON.stringify before storing them (see
      // ExtensionStorageSync.callRustStoreFn). These complex types are therefore
      // reduced to plain JSON by the time they reach the panel, which makes them
      // editable.
      arrBuffer: new ArrayBuffer(8),
      blob: new Blob(
        [
          JSON.stringify(
            {
              hello: "world",
            },
            null,
            2
          ),
        ],
        {
          type: "application/json",
        }
      ),
      date: new Date(0),
      map: new Map().set("a", "b"),
      regexp: /regexp/,
      set: new Set().add(1).add("a"),
      arrWithMap: [1, new Map().set("a", 1)],
      objWithArrayBuffer: { a: new ArrayBuffer(8) },
    };

    // storage.local also exercises BigInt and undefined values here, but neither
    // can be stored via storage.sync: JSON.stringify throws on a BigInt and silently
    // drops undefined entries. They are therefore omitted.
    const itemsUnsupported = {
      deepNestedArr: [[{ a: "b" }, 3], 4],
      deepNestedObj: {
        a: {
          b: [1, 2],
        },
      },
    };

    info("Add storage items from the extension");
    const allItems = { ...itemsSupported, ...itemsUnsupported };
    extension.sendMessage("storage-sync-fireOnChanged");
    await extension.awaitMessage("storage-sync-fireOnChanged:done");
    extension.sendMessage("storage-sync-set", allItems);
    info(
      "Wait for the extension to add storage items and receive the 'onChanged' event"
    );
    await extension.awaitMessage("storage-sync-set:done");
    await extension.awaitMessage("storage-sync-onChanged");

    info("Open the addon toolbox storage panel");
    const { toolbox } = await openStoragePanelForAddon(extension.id);

    await selectTreeItem(["extensionStorage", host]);
    await waitForStorageData(getExtensionStorageUniqueKey("sync", "str"), "hi");

    info("Verify that values are displayed as expected in the sidebar");
    const expectedRenderedData = {
      arr: {
        sidebarItems: [
          { name: "arr", value: "Array" },
          { name: "arr.0", value: "1" },
          { name: "arr.1", value: "2" },
        ],
        parsed: true,
      },
      arrBuffer: {
        sidebarItems: [{ name: "arrBuffer", value: "Object" }],
        parsed: true,
      },
      arrWithMap: {
        sidebarItems: [
          { name: "arrWithMap", value: "Array" },
          { name: "arrWithMap.0", value: "1" },
          { name: "arrWithMap.1", value: "Object" },
        ],
        parsed: true,
      },
      blob: { sidebarItems: [{ name: "blob", value: "Object" }], parsed: true },
      bool: {
        sidebarItems: [{ name: "bool", value: "true" }],
      },
      date: {
        sidebarItems: [{ name: "date", value: "1970-01-01T00:00:00.000Z" }],
      },
      deepNestedArr: {
        sidebarItems: [
          { name: "deepNestedArr", value: "Array" },
          { name: "deepNestedArr.0", value: "Array" },
          { name: "deepNestedArr.1", value: "4" },
          { name: "deepNestedArr.length", value: "2" },
        ],
        parsed: true,
      },
      deepNestedObj: {
        sidebarItems: [
          { name: "deepNestedObj", value: "Object" },
          { name: "deepNestedObj.a", value: "Object" },
        ],
        parsed: true,
      },
      map: { sidebarItems: [{ name: "map", value: "Object" }], parsed: true },
      nestedArr: {
        sidebarItems: [
          { name: "nestedArr", value: "Array" },
          { name: "nestedArr.0", value: "Object" },
          { name: "nestedArr.0.a", value: "b" },
          { name: "nestedArr.1", value: "c" },
        ],
        parsed: true,
      },
      nestedObj: {
        sidebarItems: [
          { name: "nestedObj", value: "Object" },
          { name: "nestedObj.a", value: "Array" },
          { name: "nestedObj.a.0", value: "1" },
          { name: "nestedObj.a.1", value: "2" },
          // sync storage has a quota, so this value is smaller than in storage.local.
          { name: "nestedObj.a.2", value: "long-".repeat(500) },
          { name: "nestedObj.b", value: "3" },
        ],
        parsed: true,
      },
      null: {
        sidebarItems: [{ name: "null", value: "null" }],
      },
      num: {
        sidebarItems: [{ name: "num", value: itemsSupported.num }],
      },
      obj: {
        sidebarItems: [
          { name: "obj", value: "Object" },
          { name: "obj.a", value: "123" },
        ],
        parsed: true,
      },
      objWithArrayBuffer: {
        sidebarItems: [
          { name: "objWithArrayBuffer", value: "Object" },
          { name: "objWithArrayBuffer.a", value: "Object" },
        ],
        parsed: true,
      },
      regexp: {
        sidebarItems: [{ name: "regexp", value: "Object" }],
        parsed: true,
      },
      set: { sidebarItems: [{ name: "set", value: "Object" }], parsed: true },
      str: {
        sidebarItems: [{ name: "str", value: itemsSupported.str }],
      },
    };

    for (const [id, { sidebarItems, parsed }] of Object.entries(
      expectedRenderedData
    )) {
      info(`Verify "${id}" entry`);
      await selectTableItem(getExtensionStorageUniqueKey("sync", id));
      await findVariableViewProperties(sidebarItems, parsed);
    }

    info("Verify that value types supported by the storage actor are editable");
    let validate = true;
    const newValue = "anotherValue";
    const supportedIds = Object.keys(itemsSupported).map(key =>
      getExtensionStorageUniqueKey("sync", key)
    );

    for (const id of supportedIds) {
      startCellEdit(id, "value", newValue);
      await editCell(id, "value", newValue, validate);
    }

    info("Verify that associated values have been changed in the extension");
    extension.sendMessage(
      "storage-sync-get",
      Object.keys(itemsSupported),
      newValue
    );
    await extension.awaitMessage("storage-sync-get:done");

    info(
      "Verify that value types not supported by the storage actor are uneditable"
    );
    const expectedValStrings = {
      deepNestedArr: '[[{"a":"b"},3],4]',
      deepNestedObj: '{"a":{"b":[1,2]}}',
    };
    validate = false;
    for (const id of Object.keys(itemsUnsupported)) {
      const rowId = getExtensionStorageUniqueKey("sync", id);
      startCellEdit(rowId, "value", validate);
      checkCellUneditable(rowId, "value");
      checkCell(rowId, "value", expectedValStrings[id]);
    }

    info("Shut down the test");
    await toolbox.destroy();
    await extension.unload();
  }
);
