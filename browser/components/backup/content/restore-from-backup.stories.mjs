/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// eslint-disable-next-line import/no-unresolved
import { html } from "lit.all.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-card.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "./restore-from-backup.mjs";
// eslint-disable-next-line import/no-unassigned-import
import { ERRORS } from "chrome://browser/content/backup/backup-constants.mjs";

window.MozXULElement.insertFTLIfNeeded("browser/backupSettings.ftl");
window.MozXULElement.insertFTLIfNeeded("branding/brand.ftl");

export default {
  title: "Domain-specific UI Widgets/Backup/Restore from Backup",
  component: "restore-from-backup",
  argTypes: {
    aboutWelcomeEmbedded: { control: "boolean" },
    backupServiceState: { control: "object" },
  },
};

const Template = ({ aboutWelcomeEmbedded, backupServiceState }) => html`
  <moz-card style="width: fit-content;">
    <restore-from-backup
      .aboutWelcomeEmbedded=${aboutWelcomeEmbedded}
      .backupServiceState=${backupServiceState}
    ></restore-from-backup>
  </moz-card>
`;

export const BackupFound = Template.bind({});
BackupFound.args = {
  aboutWelcomeEmbedded: false,
  backupServiceState: {
    backupDirPath: "/Some/User/Documents",
    backupFileToRestore: "/Some/User/Documents/Firefox Backup/backup.html",
    backupFileInfo: { date: new Date(), isEncrypted: null },
    recoveryErrorCode: 0,
    recoveryInProgress: false,
  },
};

export const EncryptedBackupFound = Template.bind({});
EncryptedBackupFound.args = {
  aboutWelcomeEmbedded: false,
  backupServiceState: {
    backupDirPath: "/Some/User/Documents",
    backupFileToRestore: "/Some/User/Documents/Firefox Backup/backup.html",
    backupFileInfo: { date: new Date(), isEncrypted: true },
    recoveryErrorCode: 0,
    recoveryInProgress: false,
  },
};

export const IncorrectPasswordError = Template.bind({});
IncorrectPasswordError.args = {
  aboutWelcomeEmbedded: false,
  backupServiceState: {
    backupFileToRestore: "/Some/User/Documents/Firefox Backup/backup.html",
    backupFileInfo: { date: new Date(), isEncrypted: true },
    recoveryErrorCode: ERRORS.UNAUTHORIZED,
    recoveryInProgress: false,
  },
};

export const RecoveryInProgress = Template.bind({});
RecoveryInProgress.args = {
  aboutWelcomeEmbedded: false,
  backupServiceState: {
    backupDirPath: "/Some/User/Documents",
    backupFileToRestore: "/Some/User/Documents/Firefox Backup/backup.html",
    backupFileInfo: { date: new Date() },
    recoveryErrorCode: 0,
    recoveryInProgress: true,
  },
};

export const EmbeddedInAboutWelcome = Template.bind({});
EmbeddedInAboutWelcome.args = {
  aboutWelcomeEmbedded: true,
  backupServiceState: {
    backupDirPath: "/Some/User/Documents",
    backupFileToRestore: "/Some/User/Documents/Firefox Backup/backup.html",
    backupFileInfo: { date: new Date(), isEncrypted: true },
    recoveryErrorCode: 0,
    recoveryInProgress: false,
  },
};

export const EmbeddedInAboutWelcomeWithNoBackup = Template.bind({});
EmbeddedInAboutWelcomeWithNoBackup.args = {
  aboutWelcomeEmbedded: true,
  backupServiceState: {
    backupDirPath: "/Some/User/Documents",
    backupFileToRestore: null,
    backupFileInfo: null,
    recoveryErrorCode: 0,
    recoveryInProgress: false,
  },
};

export const NoBackupFound = Template.bind({});
NoBackupFound.args = {
  aboutWelcomeEmbedded: false,
  backupServiceState: {
    backupDirPath: "/Some/User/Documents",
    backupFileToRestore: null,
    backupFileInfo: null,
    recoveryErrorCode: 0,
    recoveryInProgress: false,
  },
};
