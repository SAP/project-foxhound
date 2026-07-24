/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// eslint-disable-next-line import/no-unresolved
import { html, ifDefined } from "lit.all.mjs";
import "chrome://global/content/elements/moz-card.mjs";
import { ERRORS } from "chrome://browser/content/backup/backup-constants.mjs";
import "./turn-on-scheduled-backups.mjs";

window.MozXULElement.insertFTLIfNeeded("browser/backupSettings.ftl");
window.MozXULElement.insertFTLIfNeeded("branding/brand.ftl");

const SELECTABLE_ERRORS = {
  "(none)": 0,
  ...ERRORS,
};

export default {
  title: "Domain-specific UI Widgets/Backup/Turn On Scheduled Backups",
  component: "turn-on-scheduled-backups",
  argTypes: {
    enableBackupErrorCode: {
      options: Object.keys(SELECTABLE_ERRORS),
      mapping: SELECTABLE_ERRORS,
      control: { type: "select" },
    },
    hideFilePathChooser: { control: "boolean" },
    embeddedFxBackupOptIn: { control: "boolean" },
    isEncryptedBackup: { control: "boolean" },
  },
};

const Template = ({
  defaultPath,
  defaultLabel,
  _newPath,
  _newLabel,
  enableBackupErrorCode,
  hideFilePathChooser,
  embeddedFxBackupOptIn,
}) => html`
  <turn-on-scheduled-backups
    defaultPath=${defaultPath}
    defaultLabel=${defaultLabel}
    _newPath=${ifDefined(_newPath)}
    _newLabel=${ifDefined(_newLabel)}
    .enableBackupErrorCode=${enableBackupErrorCode}
    ?hide-file-path-chooser=${hideFilePathChooser}
    ?embedded-fx-backup-opt-in=${embeddedFxBackupOptIn}
  ></turn-on-scheduled-backups>
`;

// ---------------------- Default / legacy stories ----------------------
export const Default = Template.bind({});
Default.args = {
  defaultPath: "/Some/User/Documents",
  defaultLabel: "Documents",
  hideFilePathChooser: false,
  embeddedFxBackupOptIn: false,
  enableBackupErrorCode: 0,
};

export const CustomLocation = Template.bind({});
CustomLocation.args = {
  ...Default.args,
  _newPath: "/Some/Test/Custom/Dir",
  _newLabel: "Dir",
};

export const EnableError = Template.bind({});
EnableError.args = {
  ...CustomLocation.args,
  enableBackupErrorCode: ERRORS.FILE_SYSTEM_ERROR,
};

// ---------------------- Embedded Fx Backup Opt-In Stories ----------------------
export const EmbeddedFx_UnencryptedBackup = Template.bind({});
EmbeddedFx_UnencryptedBackup.args = {
  ...Default.args,
  embeddedFxBackupOptIn: true,
  hideFilePathChooser: false, // Shows file path chooser, password section hidden via CSS
};

export const EmbeddedFx_EncryptedBackup_HideFilePathChooser = Template.bind({});
EmbeddedFx_EncryptedBackup_HideFilePathChooser.args = {
  ...Default.args,
  embeddedFxBackupOptIn: true,
  hideFilePathChooser: true, // Hide file path chooser, show password input
};
