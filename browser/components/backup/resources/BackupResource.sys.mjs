/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// Convert from bytes to kilobytes (not kibibytes).
export const BYTES_IN_KB = 1000;

/**
 * Convert bytes to the nearest 10th kilobyte to make the measurements fuzzier.
 *
 * @param {number} bytes - size in bytes.
 * @returns {number} - size in kilobytes rounded to the nearest 10th kilobyte.
 */
export function bytesToFuzzyKilobytes(bytes) {
  let sizeInKb = Math.ceil(bytes / BYTES_IN_KB);
  let nearestTenthKb = Math.round(sizeInKb / 10) * 10;
  return Math.max(nearestTenthKb, 1);
}

/**
 * An abstract class representing a set of data within a user profile
 * that can be persisted to a separate backup archive file, and restored
 * to a new user profile from that backup archive file.
 */
export class BackupResource {
  /**
   * This must be overridden to return a simple string identifier for the
   * resource, for example "places" or "extensions". This key is used as
   * a unique identifier for the resource.
   *
   * @type {string}
   */
  static get key() {
    throw new Error("BackupResource::key needs to be overridden.");
  }

  /**
   * This must be overridden to return a boolean indicating whether the
   * resource requires encryption when being backed up. Encryption should be
   * required for particularly sensitive data, such as passwords / credentials,
   * cookies, or payment methods. If you're not sure, talk to someone from the
   * Privacy team.
   *
   * @type {boolean}
   */
  static get requiresEncryption() {
    throw new Error(
      "BackupResource::requiresEncryption needs to be overridden."
    );
  }

  /**
   * Get the size of a file.
   *
   * @param {string} filePath - path to a file.
   * @returns {Promise<number|null>} - the size of the file in kilobytes, or null if the
   * file does not exist, the path is a directory or the size is unknown.
   */
  static async getFileSize(filePath) {
    if (!(await IOUtils.exists(filePath))) {
      return null;
    }

    let { size } = await IOUtils.stat(filePath);

    if (size < 0) {
      return null;
    }

    let nearestTenthKb = bytesToFuzzyKilobytes(size);

    return nearestTenthKb;
  }

  /**
   * Get the total size of a directory.
   *
   * @param {string} directoryPath - path to a directory.
   * @param {object}   options - A set of additional optional parameters.
   * @param {Function} [options.shouldExclude] - an optional callback which based on file path and file type should return true
   * if the file should be excluded from the computed directory size.
   * @returns {Promise<number|null>} - the size of all descendants of the directory in kilobytes, or null if the
   * directory does not exist, the path is not a directory or the size is unknown.
   */
  static async getDirectorySize(
    directoryPath,
    { shouldExclude = () => false } = {}
  ) {
    if (!(await IOUtils.exists(directoryPath))) {
      return null;
    }

    let { type } = await IOUtils.stat(directoryPath);

    if (type != "directory") {
      return null;
    }

    let children = await IOUtils.getChildren(directoryPath, {
      ignoreAbsent: true,
    });

    let size = 0;
    for (const childFilePath of children) {
      let { size: childSize, type: childType } = await IOUtils.stat(
        childFilePath
      );

      if (shouldExclude(childFilePath, childType, directoryPath)) {
        continue;
      }

      if (childSize >= 0) {
        let nearestTenthKb = bytesToFuzzyKilobytes(childSize);

        size += nearestTenthKb;
      }

      if (childType == "directory") {
        let childDirectorySize = await this.getDirectorySize(childFilePath, {
          shouldExclude,
        });
        if (Number.isInteger(childDirectorySize)) {
          size += childDirectorySize;
        }
      }
    }

    return size;
  }

  constructor() {}

  /**
   * This must be overridden to record telemetry on the size of any
   * data associated with this BackupResource.
   *
   * @param {string} profilePath - path to a profile directory.
   * @returns {Promise<undefined>}
   */
  // eslint-disable-next-line no-unused-vars
  async measure(profilePath) {
    throw new Error("BackupResource::measure needs to be overridden.");
  }

  /**
   * Perform a safe copy of the resource(s) and write them into the backup
   * database. The Promise should resolve with an object that can be serialized
   * to JSON, as it will be written to the manifest file. This same object will
   * be deserialized and passed to restore() when restoring the backup. This
   * object can be null if no additional information is needed to restore the
   * backup.
   *
   * @param {string} stagingPath
   *   The path to the staging folder where copies of the datastores for this
   *   BackupResource should be written to.
   * @param {string} [profilePath=null]
   *   This is null if the backup is being run on the currently running user
   *   profile. If, however, the backup is being run on a different user profile
   *   (for example, it's being run from a BackgroundTask on a user profile that
   *   just shut down, or during test), then this is a string set to that user
   *   profile path.
   *
   * @returns {Promise<object|null>}
   */
  // eslint-disable-next-line no-unused-vars
  async backup(stagingPath, profilePath = null) {
    throw new Error("BackupResource::backup must be overridden");
  }
}
