/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ERRORS } from "chrome://browser/content/backup/backup-constants.mjs";

/**
 * Any recovery error messaging should be defined in Fluent with both
 * a `heading` attribute and a `message` attribute.
 */
export const ERROR_L10N_IDS = Object.freeze({
  [ERRORS.UNAUTHORIZED]: "backup-service-error-incorrect-password",
  [ERRORS.CORRUPTED_ARCHIVE]: "backup-service-error-corrupt-file",
  [ERRORS.UNSUPPORTED_BACKUP_VERSION]:
    "backup-service-error-unsupported-version",
  [ERRORS.UNINITIALIZED]: "backup-service-error-went-wrong2",
  [ERRORS.FILE_SYSTEM_ERROR]: "backup-service-error-went-wrong2",
  [ERRORS.DECRYPTION_FAILED]: "backup-service-error-went-wrong2",
  [ERRORS.RECOVERY_FAILED]: "backup-service-error-recovery-failed",
  [ERRORS.UNKNOWN]: "backup-service-error-went-wrong2",
  [ERRORS.INTERNAL_ERROR]: "backup-service-error-went-wrong2",
  [ERRORS.UNSUPPORTED_APPLICATION]:
    "backup-service-error-unsupported-application",
});

/**
 * @param {number} errorCode
 *   Error code from backup-constants.mjs:ERRORS
 * @returns {string}
 *   L10N ID for error messaging for the given error code; the L10N
 *   ID should have both a `heading` and a `message` attribute
 */
export function getErrorL10nId(errorCode) {
  return ERROR_L10N_IDS[errorCode] ?? ERROR_L10N_IDS[ERRORS.UNKNOWN];
}
