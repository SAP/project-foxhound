/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Classes exported here are registered as a resource that can be
 * backed up and restored in the BackupService.
 *
 * They must extend the BackupResource base class.
 */

import { AddonsBackupResource } from "resource:///modules/backup/AddonsBackupResource.sys.mjs";
import { BookmarksBackupResource } from "resource:///modules/backup/BookmarksBackupResource.sys.mjs";
import { CredentialsAndSecurityBackupResource } from "resource:///modules/backup/CredentialsAndSecurityBackupResource.sys.mjs";
import { FormHistoryBackupResource } from "resource:///modules/backup/FormHistoryBackupResource.sys.mjs";
import { MiscDataBackupResource } from "resource:///modules/backup/MiscDataBackupResource.sys.mjs";
import { PlacesBackupResource } from "resource:///modules/backup/PlacesBackupResource.sys.mjs";
import { PreferencesBackupResource } from "resource:///modules/backup/PreferencesBackupResource.sys.mjs";
import { SessionStoreBackupResource } from "resource:///modules/backup/SessionStoreBackupResource.sys.mjs";
import { SelectableProfileBackupResource } from "resource:///modules/backup/SelectableProfileBackupResource.sys.mjs";
import { SiteSettingsBackupResource } from "resource:///modules/backup/SiteSettingsBackupResource.sys.mjs";

export {
  AddonsBackupResource,
  BookmarksBackupResource,
  CredentialsAndSecurityBackupResource,
  FormHistoryBackupResource,
  MiscDataBackupResource,
  PlacesBackupResource,
  PreferencesBackupResource,
  SessionStoreBackupResource,
  SelectableProfileBackupResource,
  SiteSettingsBackupResource,
};
