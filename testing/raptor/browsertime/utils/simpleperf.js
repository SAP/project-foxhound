/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { execSync } = require("child_process");

async function pullJitMarkerFiles(context, commands, dirname = "") {
  const packageName =
    context.options.browser === "firefox"
      ? context.options.firefox?.android?.package
      : context.options.chrome?.android?.package;
  if (!packageName) {
    context.log.warn("packageName is not defined");
  }
  const filesDir = `/storage/emulated/0/Android/data/${packageName}/files`;
  const destDir = dirname
    ? `${context.storageManager.directory}/${dirname}`
    : `${context.storageManager.directory}`;
  try {
    const timeoutMs = 15000;
    const listing = await commands.android.shell(
      `ls ${filesDir}/jit-*.dump ${filesDir}/marker-*.txt 2>/dev/null`
    );
    for (const file of listing.split("\n").filter(f => f.trim())) {
      const fileName = file.trim().split("/").pop();
      execSync(`adb pull "${file.trim()}" "${destDir}/${fileName}"`, {
        timeout: timeoutMs,
      });
    }
  } catch (e) {
    if (e.signal === "SIGTERM") {
      context.log.error("adb timed out");
    } else {
      context.log.error(`Failed to pull jit/marker files: ${e}`);
    }
  }
}

module.exports = { pullJitMarkerFiles };
