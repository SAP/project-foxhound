/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// eslint-disable-next-line import/no-unresolved
import { html } from "lit.all.mjs";
import "chrome://global/content/elements/moz-card.mjs";
import { ERRORS } from "chrome://browser/content/backup/backup-constants.mjs";
import "./enable-backup-encryption.mjs";

window.MozXULElement.insertFTLIfNeeded("browser/backupSettings.ftl");
window.MozXULElement.insertFTLIfNeeded("branding/brand.ftl");

const SELECTABLE_ERRORS = {
  "(none)": 0,
  ...ERRORS,
};

export default {
  title: "Domain-specific UI Widgets/Backup/Enable Encryption",
  component: "enable-backup-encryption",
  argTypes: {
    type: {
      control: { type: "select" },
      options: ["set-password", "change-password"],
    },
    enableEncryptionErrorCode: {
      options: Object.keys(SELECTABLE_ERRORS),
      mapping: SELECTABLE_ERRORS,
      control: { type: "select" },
    },
  },
};

const Template = ({ type, enableEncryptionErrorCode }) => html`
  <moz-card style="width: 23.94rem; position: relative;">
    <enable-backup-encryption
      type=${type}
      .enableEncryptionErrorCode=${enableEncryptionErrorCode}
    ></enable-backup-encryption>
  </moz-card>
`;

export const SetPassword = Template.bind({});
SetPassword.args = {
  type: "set-password",
};

export const ChangePassword = Template.bind({});
ChangePassword.args = {
  type: "change-password",
};

export const SetPasswordError = Template.bind({});
SetPasswordError.args = {
  type: "set-password",
  enableEncryptionErrorCode: ERRORS.INVALID_PASSWORD,
};
