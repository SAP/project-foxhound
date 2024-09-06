/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// Remove this import after BackupResource is referenced elsewhere.
// eslint-disable-next-line no-unused-vars
import { BackupResource } from "resource:///modules/backup/BackupResource.sys.mjs";

/**
 * Classes exported here are registered as a resource that can be
 * backed up and restored in the BackupService.
 *
 * They must extend the BackupResource base class.
 */
export {};
