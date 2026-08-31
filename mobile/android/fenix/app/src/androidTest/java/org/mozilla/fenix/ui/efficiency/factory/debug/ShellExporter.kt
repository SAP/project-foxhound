/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.debug

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import java.io.File

/**
 * Provides a minimal shell-based file export mechanism for test artifacts.
 *
 * `ShellExporter` mirrors the current test run’s artifacts directory to
 * a public folder (`/sdcard/TestFactoryArtifacts/<runId>`) using shell commands
 * executed by [UiDevice]. This approach avoids requiring any Gradle or manifest
 * changes and works on both emulators and physical devices.
 *
 * Artifacts exported here persist after the test APK is uninstalled, making
 * them useful for local debugging and developer inspection.
 *
 * **Implementation notes:**
 * - Uses `mkdir -p` to ensure target directories exist.
 * - Uses `cp -r` to recursively copy the run directory contents.
 * - Relies on `toybox`/`busybox` tools included on most Android 8+ images.
 * - Returns `null` if the command fails silently or device shell is unavailable.
 */
object ShellExporter {

    /** Root directory under public external storage for exported test artifacts. */
    private const val PUBLIC_ROOT = "/sdcard/TestFactoryArtifacts"

    /**
     * Copies the entire artifacts run directory from the app’s sandbox into a
     * public location.
     *
     * Typical source:
     * ```
     * /storage/emulated/0/Android/data/<package>/files/artifacts/<runId>/
     * ```
     * Copied to:
     * ```
     * /sdcard/TestFactoryArtifacts/<runId>/
     * ```
     *
     * This method is intentionally simple and platform-agnostic; it executes
     * standard shell commands using [UiDevice.executeShellCommand] to perform
     * the copy. If the operation succeeds, the full destination path is returned.
     *
     * @param runId      Identifier for the current test run, used to name the export folder.
     * @param srcRunDir  Source directory produced by [ArtifactManager] containing logs
     *                   and screenshots for the current run.
     * @return Absolute path to the exported folder if successful, or `null` on failure.
     */
    fun exportRunDir(runId: String, srcRunDir: File): String? {
        return try {
            val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
            val dst = "$PUBLIC_ROOT/$runId"

            // Ensure destination exists before copying.
            device.executeShellCommand("mkdir -p \"$dst\"")

            // Copy directory recursively. The trailing '/.' ensures only the contents
            // of the folder are copied, not the parent directory itself.
            val cmd = "cp -r \"${srcRunDir.absolutePath}/.\" \"$dst/\""
            device.executeShellCommand(cmd)

            dst
        } catch (_: Throwable) {
            null
        }
    }
}
