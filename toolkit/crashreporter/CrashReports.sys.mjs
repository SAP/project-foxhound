/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export var CrashReports = {
  pendingDir: null,
  reportsDir: null,
  submittedDir: null,
  getReports: function CrashReports_getReports() {
    let reports = {};
    let ignored = [];

    try {
      // Ignore any non http/https urls
      if (!/^https?:/i.test(Services.prefs.getCharPref("breakpad.reportURL"))) {
        return [];
      }
    } catch (e) {}

    if (this.submittedDir.exists() && this.submittedDir.isDirectory()) {
      let entries = this.submittedDir.directoryEntries;
      while (entries.hasMoreElements()) {
        let file = entries.nextFile;
        let leaf = file.leafName;
        if (leaf.startsWith("bp-") && leaf.endsWith(".txt")) {
          let entry = {
            id: leaf.slice(0, -4),
            date: file.lastModifiedTime,
            pending: false,
            ignored: false,
          };
          reports[entry.id] = entry;
        }
      }
    }

    if (this.pendingDir.exists() && this.pendingDir.isDirectory()) {
      let uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let entries = this.pendingDir.directoryEntries;
      while (entries.hasMoreElements()) {
        let file = entries.nextFile;
        let leaf = file.leafName;
        let id = leaf.slice(0, 36);
        let extension = leaf.slice(36);
        if (!uuidRegex.test(id)) {
          continue;
        }
        if (extension === ".dmp") {
          let entry = {
            id,
            date: file.lastModifiedTime,
            pending: true,
            ignored: false,
          };
          reports[id] = entry;
        } else if (extension === ".dmp.ignore") {
          ignored.push(id);
        }
      }
    }

    for (let id of ignored) {
      let report = reports[id];
      if (report) {
        report.ignored = true;
      }
    }

    // Sort reports descending by date
    return Object.values(reports).sort((a, b) => b.date - a.date);
  },

  /**
   * Deletes `InstallTime<BuildID>` marker files from the crash reports
   * directory whose last-modified time is older than `maxAgeMs`. Tolerates
   * a missing crash reports directory (e.g. on a fresh profile).
   *
   * @param {number} maxAgeMs Maximum age in milliseconds; files older than
   *                          this (relative to `Date.now()`) are removed.
   */
  async pruneInstallTimeFiles(maxAgeMs) {
    const threshold = Date.now() - maxAgeMs;
    let children;
    try {
      children = await IOUtils.getChildren(this.reportsDir.path);
    } catch (e) {
      if (!DOMException.isInstance(e) || e.name !== "NotFoundError") {
        throw e;
      }
      return;
    }

    for (const childPath of children) {
      if (!PathUtils.filename(childPath).startsWith("InstallTime")) {
        continue;
      }
      const stat = await IOUtils.stat(childPath);
      if (stat.lastModified < threshold) {
        await IOUtils.remove(childPath);
      }
    }
  },

  /**
   * Deletes all files belonging to a single pending crash report:
   * the minidump (`.dmp`), the annotations file (`.extra`), the optional
   * ignore marker (`.dmp.ignore`), and the optional memory report
   * (`.memory.json.gz`). Missing files are tolerated.
   *
   * @param {string} id The crash report's UUID (without any file extension).
   */
  async deletePendingReport(id) {
    const base = PathUtils.join(this.pendingDir.path, id);
    for (const suffix of [".dmp", ".extra", ".dmp.ignore", ".memory.json.gz"]) {
      await IOUtils.remove(base + suffix, { ignoreAbsent: true });
    }
  },

  /**
   * Deletes the `bp-<id>.txt` record of a successfully submitted crash
   * report. Missing file is tolerated.
   *
   * @param {string} id The submitted report identifier as it appears in
   *                    `bp-<id>.txt` (i.e. the full `bp-<UUID>` string
   *                    without the `.txt` extension).
   */
  async deleteSubmittedReport(id) {
    await IOUtils.remove(PathUtils.join(this.submittedDir.path, id + ".txt"), {
      ignoreAbsent: true,
    });
  },
};

function CrashReports_pendingDir() {
  let pendingDir = Services.dirsvc.get("UAppData", Ci.nsIFile);
  pendingDir.append("Crash Reports");
  pendingDir.append("pending");
  return pendingDir;
}

function CrashReports_reportsDir() {
  let reportsDir = Services.dirsvc.get("UAppData", Ci.nsIFile);
  reportsDir.append("Crash Reports");
  return reportsDir;
}

function CrashReports_submittedDir() {
  let submittedDir = Services.dirsvc.get("UAppData", Ci.nsIFile);
  submittedDir.append("Crash Reports");
  submittedDir.append("submitted");
  return submittedDir;
}

CrashReports.pendingDir = CrashReports_pendingDir();
CrashReports.reportsDir = CrashReports_reportsDir();
CrashReports.submittedDir = CrashReports_submittedDir();
