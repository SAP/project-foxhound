/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  BaseStorageActor,
  SEPARATOR_GUID,
} = require("resource://devtools/server/actors/resources/storage/index.js");
const {
  parseItemValue,
} = require("resource://devtools/shared/storage/utils.js");
const {
  LongStringActor,
} = require("resource://devtools/server/actors/string.js");
// Use global: "shared" for these extension modules, because these
// are singletons with shared state, and we must not create a new instance if a
// dedicated loader was used to load this module.
loader.lazyGetter(this, "ExtensionParent", () => {
  return ChromeUtils.importESModule(
    "resource://gre/modules/ExtensionParent.sys.mjs",
    { global: "shared" }
  ).ExtensionParent;
});
loader.lazyGetter(this, "ExtensionProcessScript", () => {
  return ChromeUtils.importESModule(
    "resource://gre/modules/ExtensionProcessScript.sys.mjs",
    { global: "shared" }
  ).ExtensionProcessScript;
});
loader.lazyGetter(this, "ExtensionStorageIDB", () => {
  return ChromeUtils.importESModule(
    "resource://gre/modules/ExtensionStorageIDB.sys.mjs",
    { global: "shared" }
  ).ExtensionStorageIDB;
});
loader.lazyGetter(this, "extensionStorageSync", () => {
  return ChromeUtils.importESModule(
    "resource://gre/modules/ExtensionStorageSync.sys.mjs",
    { global: "shared" }
  ).extensionStorageSync;
});

/**
 * The Extension Storage actor.
 */
class ExtensionStorageActor extends BaseStorageActor {
  constructor(storageActor) {
    super(storageActor, "extensionStorage");

    this.addonId = this.storageActor.parentActor.addonId;

    // Retrieve the base moz-extension url for the extension
    // (and also remove the final '/' from it).
    this.extensionHostURL = this.getExtensionPolicy().getURL().slice(0, -1);

    // Map<host, ExtensionStorageIDB db connection>
    // Bug 1542038: managed storage area will need its own
    // backend.
    this.dbConnectionForHost = new Map();

    this.onExtensionStartup = this.onExtensionStartup.bind(this);

    this.onLocalStorageChange = changes =>
      this.onStorageChange(changes, this.AREA_LOCAL);
    this.onSyncStorageChange = changes =>
      this.onStorageChange(changes, this.AREA_SYNC);
  }

  AREA_LOCAL = "local";
  AREA_SYNC = "sync";

  getExtensionPolicy() {
    return WebExtensionPolicy.getByID(this.addonId);
  }

  destroy() {
    ExtensionStorageIDB.removeOnChangedListener(
      this.addonId,
      this.onLocalStorageChange
    );
    extensionStorageSync.removeOnChangedListener(
      { id: this.addonId },
      this.onSyncStorageChange
    );
    ExtensionParent.apiManager.off("startup", this.onExtensionStartup);

    super.destroy();
  }

  /**
   * We need to override this method as we ignore BaseStorageActor's hosts
   * and only care about the extension host.
   */
  async populateStoresForHosts() {
    // Ensure the actor's target is an extension and it is enabled
    if (!this.addonId || !this.getExtensionPolicy()) {
      return;
    }

    // Subscribe a listener for event notifications from the WE storage API when
    // storage local data has been changed by the extension, and keep track of the
    // listener to remove it when the debugger is being disconnected.
    ExtensionStorageIDB.addOnChangedListener(
      this.addonId,
      this.onLocalStorageChange
    );
    extensionStorageSync.addOnChangedListener(
      { id: this.addonId },
      this.onSyncStorageChange
    );

    try {
      // Make sure the extension storage APIs have been loaded,
      // otherwise the DevTools storage panel would not be updated
      // automatically when the extension storage data is being changed
      // if the parent ext-storage.js module wasn't already loaded
      // (See Bug 1802929).
      const { extension } = WebExtensionPolicy.getByID(this.addonId);
      await extension.apiManager.asyncGetAPI("storage", extension);
      // Also watch for addon reload in order to also do that
      // on next addon startup, otherwise we may also miss updates
      ExtensionParent.apiManager.on("startup", this.onExtensionStartup);
    } catch (e) {
      console.error(
        "Exception while trying to initialize webext storage API",
        e
      );
    }

    await this.populateStoresForHost(this.extensionHostURL);
  }

  /**
   * AddonManager listener used to force instantiating storage API
   * implementation in the parent process so that it forward content process
   * messages to ExtensionStorageIDB.
   *
   * Without this, we may miss storage updated after the addon reload.
   */
  async onExtensionStartup(_evtName, extension) {
    if (extension.id != this.addonId) {
      return;
    }
    await extension.apiManager.asyncGetAPI("storage", extension);
  }

  /**
   * This method asynchronously reads the storage data for the target extension
   * and caches this data into this.hostVsStores.
   *
   * @param {string} host - the hostname for the extension
   */
  async populateStoresForHost(host) {
    if (host !== this.extensionHostURL) {
      return;
    }

    const extension = ExtensionProcessScript.getExtensionChild(this.addonId);
    if (!extension || !extension.hasPermission("storage")) {
      return;
    }

    // Make sure storeMap is defined and set in this.hostVsStores before subscribing
    // a storage onChanged listener in the parent process
    const storeMap = new Map();
    this.hostVsStores.set(host, storeMap);

    const storagePrincipal = await this.getStoragePrincipal();

    if (!storagePrincipal) {
      // This could happen if the extension fails to be migrated to the
      // IndexedDB backend
      return;
    }

    const db = await ExtensionStorageIDB.open(storagePrincipal);
    this.dbConnectionForHost.set(host, db);
    const localData = await db.get();

    for (const [name, value] of Object.entries(localData)) {
      const uniqueKey = this.getUniqueKey(this.AREA_LOCAL, name);
      storeMap.set(uniqueKey, {
        uniqueKey,
        name,
        value,
        area: this.AREA_LOCAL,
      });
    }

    const syncData = await extensionStorageSync.get(
      { id: this.addonId },
      /* spec */ null
    );

    for (const [name, value] of Object.entries(syncData)) {
      const uniqueKey = this.getUniqueKey(this.AREA_SYNC, name);
      storeMap.set(uniqueKey, {
        uniqueKey,
        name,
        value,
        area: this.AREA_SYNC,
      });
    }

    // Bug 1542038: Populate storage.managed from its backend.
  }

  // Use a compound key like the cookies storage actor.
  getUniqueKey(area, name) {
    return name + SEPARATOR_GUID + area;
  }

  getAreaAndName(uniqueKey) {
    const separatorIndex = uniqueKey.lastIndexOf(SEPARATOR_GUID);
    return {
      area: uniqueKey.slice(separatorIndex + SEPARATOR_GUID.length),
      name: uniqueKey.slice(0, separatorIndex),
    };
  }

  /**
   * This fires when the extension changes storage data while the storage
   * inspector is open. Ensures this.hostVsStores stays up-to-date and
   * passes the changes on to update the client.
   */
  onStorageChange(changes, area) {
    const host = this.extensionHostURL;
    const storeMap = this.hostVsStores.get(host);

    function isStructuredCloneHolder(value) {
      return (
        value &&
        typeof value === "object" &&
        Cu.getClassName(value, true) === "StructuredCloneHolder"
      );
    }

    for (const name in changes) {
      const storageChange = changes[name];
      let { newValue, oldValue } = storageChange;
      if (isStructuredCloneHolder(newValue)) {
        newValue = newValue.deserialize(this, true /* keepData */);
      }
      if (isStructuredCloneHolder(oldValue)) {
        oldValue = oldValue.deserialize(this, true /* keepData */);
      }

      const uniqueKey = this.getUniqueKey(area, name);
      let action;
      if (typeof newValue === "undefined") {
        action = "deleted";
        storeMap.delete(uniqueKey);
      } else if (typeof oldValue === "undefined") {
        action = "added";
        storeMap.set(uniqueKey, { uniqueKey, name, value: newValue, area });
      } else {
        action = "changed";
        storeMap.set(uniqueKey, { uniqueKey, name, value: newValue, area });
      }

      this.storageActor.update(action, this.typeName, { [host]: [uniqueKey] });
    }
  }

  async getStoragePrincipal() {
    const { extension } = this.getExtensionPolicy();
    const { backendEnabled, storagePrincipal } =
      await ExtensionStorageIDB.selectBackend({ extension });

    if (!backendEnabled) {
      // IDB backend disabled; give up.
      return null;
    }

    // Received as a StructuredCloneHolder, so we need to deserialize
    return storagePrincipal.deserialize(this, true);
  }

  getValuesForHost(host, uniqueKey) {
    if (!this.hostVsStores.has(host)) {
      return [];
    }

    if (uniqueKey) {
      return [this.hostVsStores.get(host).get(uniqueKey)];
    }

    return Array.from(this.hostVsStores.get(host).values());
  }

  /**
   * Converts a storage item to an "extensionobject" as defined in
   * devtools/shared/specs/storage.js. Behavior largely mirrors the "indexedDB" storage actor,
   * except where it would throw an unhandled error (i.e. for a `BigInt` or `undefined`
   * `item.value`).
   *
   * @param {object} item - The storage item to convert
   * @param {string} item.name - The storage item key
   * @param {*} item.value - The storage item value
   * @return {extensionobject}
   */
  toStoreObject(item) {
    if (!item) {
      return null;
    }

    let { uniqueKey, name, value, area } = item;
    const isValueEditable = extensionStorageHelpers.isEditable(value);

    // `JSON.stringify()` throws for `BigInt`, adds extra quotes to strings and `Date` strings,
    // and doesn't modify `undefined`.
    switch (typeof value) {
      case "bigint":
        value = `${value.toString()}n`;
        break;
      case "string":
        break;
      case "undefined":
        value = "undefined";
        break;
      default:
        value = JSON.stringify(value);
        if (
          // can't use `instanceof` across frame boundaries
          Object.prototype.toString.call(item.value) === "[object Date]"
        ) {
          value = JSON.parse(value);
        }
    }

    return {
      uniqueKey,
      name,
      value: new LongStringActor(this.conn, value),
      area,
      isValueEditable,
    };
  }

  getFields() {
    return [
      { name: "uniqueKey", editable: false, private: true },
      { name: "name", editable: false },
      { name: "value", editable: true },
      { name: "area", editable: false },
      { name: "isValueEditable", editable: false, private: true },
    ];
  }

  onItemUpdated(action, host, names) {
    this.storageActor.update(action, this.typeName, {
      [host]: names,
    });
  }

  async editItem({ host, items }) {
    const { area, name } = this.getAreaAndName(items.uniqueKey);
    const { value } = items;

    let parsedValue = parseItemValue(value);
    if (parsedValue === value) {
      const { typesFromString } = extensionStorageHelpers;
      for (const { test, parse } of Object.values(typesFromString)) {
        if (test(value)) {
          parsedValue = parse(value);
          break;
        }
      }
    }
    if (area === this.AREA_LOCAL) {
      const db = this.dbConnectionForHost.get(host);
      if (!db) {
        return;
      }
      const changes = await db.set({ [name]: parsedValue });
      this.fireOnChangedExtensionEvent(host, changes);
    } else if (area === this.AREA_SYNC) {
      await extensionStorageSync.set(
        { id: this.addonId },
        { [name]: parsedValue }
      );
    } else {
      // For now, we only support local and sync
      return;
    }

    this.onItemUpdated("changed", host, [this.getUniqueKey(area, name)]);
  }

  async removeItem(host, uniqueKey) {
    const { area, name } = this.getAreaAndName(uniqueKey);
    if (area === this.AREA_LOCAL) {
      const db = this.dbConnectionForHost.get(host);
      if (!db) {
        return;
      }
      const changes = await db.remove(name);
      this.fireOnChangedExtensionEvent(host, changes);
    } else if (area === this.AREA_SYNC) {
      await extensionStorageSync.remove({ id: this.addonId }, name);
    } else {
      // For now, we only support local and sync
      return;
    }

    this.onItemUpdated("deleted", host, [this.getUniqueKey(area, name)]);
  }

  async removeAll(host) {
    const db = this.dbConnectionForHost.get(host);
    if (!db) {
      return;
    }

    const changes = await db.clear();
    this.fireOnChangedExtensionEvent(host, changes);

    await extensionStorageSync.clear({ id: this.addonId });

    this.onItemUpdated("cleared", host, []);
  }

  /**
   * Let the extension know that storage data has been changed by the user from
   * the storage inspector.
   * storage.sync does not need this because its backend notifies listeners
   * directly.
   */
  fireOnChangedExtensionEvent(host, changes) {
    // Bug 1542038: storage.managed may need its own notification path.
    const uuid = new URL(host).host;
    Services.cpmm.sendAsyncMessage(
      `Extension:StorageLocalOnChanged:${uuid}`,
      changes
    );
  }
}
exports.ExtensionStorageActor = ExtensionStorageActor;

const extensionStorageHelpers = {
  /**
   * Editing is supported only for serializable types. Examples of unserializable
   * types include Map, Set and ArrayBuffer.
   */
  isEditable(value) {
    // Bug 1542038: the managed storage area is never editable
    for (const { test } of Object.values(this.supportedTypes)) {
      if (test(value)) {
        return true;
      }
    }
    return false;
  },
  isPrimitive(value) {
    const primitiveValueTypes = ["string", "number", "boolean"];
    return primitiveValueTypes.includes(typeof value) || value === null;
  },
  isObjectLiteral(value) {
    return (
      value &&
      typeof value === "object" &&
      Cu.getClassName(value, true) === "Object"
    );
  },
  // Nested arrays or object literals are only editable 2 levels deep
  isArrayOrObjectLiteralEditable(obj) {
    const topLevelValuesArr = Array.isArray(obj) ? obj : Object.values(obj);
    if (
      topLevelValuesArr.some(
        value =>
          !this.isPrimitive(value) &&
          !Array.isArray(value) &&
          !this.isObjectLiteral(value)
      )
    ) {
      // At least one value is too complex to parse
      return false;
    }
    const arrayOrObjects = topLevelValuesArr.filter(
      value => Array.isArray(value) || this.isObjectLiteral(value)
    );
    if (arrayOrObjects.length === 0) {
      // All top level values are primitives
      return true;
    }

    // One or more top level values was an array or object literal.
    // All of these top level values must themselves have only primitive values
    // for the object to be editable
    for (const nestedObj of arrayOrObjects) {
      const secondLevelValuesArr = Array.isArray(nestedObj)
        ? nestedObj
        : Object.values(nestedObj);
      if (secondLevelValuesArr.some(value => !this.isPrimitive(value))) {
        return false;
      }
    }
    return true;
  },
  typesFromString: {
    // Helper methods to parse string values in editItem
    jsonifiable: {
      test(str) {
        try {
          JSON.parse(str);
        } catch (e) {
          return false;
        }
        return true;
      },
      parse(str) {
        return JSON.parse(str);
      },
    },
  },
  supportedTypes: {
    // Helper methods to determine the value type of an item in isEditable
    array: {
      test(value) {
        if (Array.isArray(value)) {
          return extensionStorageHelpers.isArrayOrObjectLiteralEditable(value);
        }
        return false;
      },
    },
    boolean: {
      test(value) {
        return typeof value === "boolean";
      },
    },
    null: {
      test(value) {
        return value === null;
      },
    },
    number: {
      test(value) {
        return typeof value === "number";
      },
    },
    object: {
      test(value) {
        if (extensionStorageHelpers.isObjectLiteral(value)) {
          return extensionStorageHelpers.isArrayOrObjectLiteralEditable(value);
        }
        return false;
      },
    },
    string: {
      test(value) {
        return typeof value === "string";
      },
    },
  },
};
