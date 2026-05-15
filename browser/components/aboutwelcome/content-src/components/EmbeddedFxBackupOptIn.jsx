/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import React, { useEffect, useRef } from "react";

export const EmbeddedFxBackupOptIn = ({
  handleAction,
  isEncryptedBackup,
  options,
}) => {
  const backupRef = useRef(null);
  const {
    // hide_password_input means it is the file chooser screen
    hide_password_input,
    hide_secondary_button,
    file_path_label,
    turn_on_backup_header,
    create_password_label,
    turn_on_backup_confirm_btn_label,
    turn_on_backup_cancel_btn_label,
  } = options || {};

  useEffect(() => {
    const { current } = backupRef;
    const handleEnableScheduledBackups = () => {
      handleAction({
        currentTarget: { value: "tile_button" },
        action: { navigate: true },
        source: "backup_enabled",
      });
    };

    const handleAdvanceScreens = () => {
      handleAction({
        currentTarget: { value: "tile_button" },
        action: { navigate: true },
        source: "advance_screens",
      });
    };

    const handleStateUpdate = ({ detail: { state } }) => {
      if (!current || !state) {
        return;
      }
      let { fileName, path, iconURL } = state.defaultParent;
      current.setAttribute("defaultlabel", fileName);
      current.setAttribute("defaultpath", path);
      current.setAttribute("defaulticonurl", iconURL);
      current.supportBaseLink = state.supportBaseLink;
    };

    current?.addEventListener("BackupUI:StateWasUpdated", handleStateUpdate);
    current?.addEventListener(
      "BackupUI:EnableScheduledBackups",
      handleEnableScheduledBackups
    );
    current?.addEventListener(
      "SpotlightOnboardingAdvanceScreens",
      handleAdvanceScreens
    );

    return () => {
      current?.removeEventListener(
        "BackupUI:EnableScheduledBackups",
        handleEnableScheduledBackups
      );
      current?.removeEventListener(
        "BackupUI:StateWasUpdated",
        handleStateUpdate
      );
      current?.removeEventListener(
        "SpotlightOnboardingAdvanceScreens",
        handleAdvanceScreens
      );
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <turn-on-scheduled-backups
      ref={backupRef}
      hide-headers={""}
      hide-password-input={
        !isEncryptedBackup || hide_password_input ? "" : undefined
      }
      hide-secondary-button={
        !isEncryptedBackup || hide_secondary_button ? "" : undefined
      }
      hide-file-path-chooser={
        isEncryptedBackup && !hide_password_input ? "" : undefined
      }
      embedded-fx-backup-opt-in={""}
      backup-is-encrypted={isEncryptedBackup ? "" : undefined}
      file-path-label-l10n-id={file_path_label}
      turn-on-backup-header-l10n-id={turn_on_backup_header}
      create-password-label-l10n-id={create_password_label}
      turn-on-backup-confirm-btn-l10n-id={turn_on_backup_confirm_btn_label}
      turn-on-backup-cancel-btn-l10n-id={turn_on_backup_cancel_btn_label}
    ></turn-on-scheduled-backups>
  );
};
