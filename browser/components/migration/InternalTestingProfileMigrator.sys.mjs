/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { MigratorBase } from "resource:///modules/MigratorBase.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  MigrationUtils: "resource:///modules/MigrationUtils.sys.mjs",
});

/**
 * A stub of a migrator used for automated testing only.
 */
export class InternalTestingProfileMigrator extends MigratorBase {
  static get key() {
    return "internal-testing";
  }

  static get displayNameL10nID() {
    return "Internal Testing Migrator";
  }

  // We will create a single MigratorResource for each resource type that
  // just immediately reports a successful migration.
  getResources() {
    return Object.values(lazy.MigrationUtils.resourceTypes).map(type => {
      return {
        type,
        migrate: callback => {
          callback(true /* success */);
        },
      };
    });
  }

  /**
   * Clears the MigratorResources that are normally cached by the
   * MigratorBase parent class after a call to getResources. This
   * allows our automated tests to try different resource availability
   * scenarios between tests.
   */
  flushResourceCache() {
    this._resourcesByProfile = null;
  }
}
