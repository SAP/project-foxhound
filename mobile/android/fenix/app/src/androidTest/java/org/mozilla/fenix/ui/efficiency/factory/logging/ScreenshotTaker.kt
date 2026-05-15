/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.logging

import android.graphics.Bitmap
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import java.io.File
import java.io.FileOutputStream

/**
 * Utility for capturing full-device screenshots during test execution.
 *
 * Screenshots are stored under the active run's artifact directory, in folders
 * structured by test and step:
 * ```
 * artifacts/<run-id>/<testId>/<leaf>/<name>.png
 * ```
 *
 * Capture strategy:
 * 1. **Preferred:** [UiDevice.takeScreenshot] (works on Android 10+)
 * 2. **Fallback:** [android.app.UiAutomation.takeScreenshot] when the first method fails
 *
 * Failures are silently ignored — factories always continue, returning `null`
 * if capture was unsuccessful. This avoids introducing flakiness into tests.
 *
 * This class requires **no extra permissions**; screenshots are written into
 * the app’s private external files directory managed by [ArtifactManager].
 */
object ScreenshotTaker {

    /**
     * Captures a screenshot and saves it into the artifacts tree.
     *
     * @param testId Identifier of the active test suite (e.g., `"PRIVATE_BROWSING.Presence"`).
     * @param leaf   Optional subfolder name (e.g., `"behavior-2"` or `"presence-0"`).
     * @param name   Base filename (without extension). `.png` will be appended automatically.
     * @return The absolute file path if capture succeeded, or `null` if it failed.
     */
    fun capture(testId: String, leaf: String? = null, name: String = "screenshot"): String? {
        return try {
            // Choose correct subdirectory for this test + step
            val dir = if (leaf.isNullOrBlank()) {
                ArtifactManager.dirForTest(testId)
            } else {
                ArtifactManager.dirForTest(testId, leaf)
            }
            val file = File(dir, "${safe(name)}.png")

            val instrumentation = InstrumentationRegistry.getInstrumentation()
            val device = UiDevice.getInstance(instrumentation)

            // Preferred path: UiDevice.takeScreenshot(File)
            val ok = try {
                // Newer UiAutomator:
                // device.takeScreenshot(file) returns Boolean
                device.takeScreenshot(file)
            } catch (_: Throwable) {
                // Fallback: UiAutomation.takeScreenshot() -> PNG
                tryUiAutomationFallback(file)
            }

            if (ok) file.absolutePath else null
        } catch (_: Throwable) {
            null
        }
    }

    /**
     * Secondary capture path using UiAutomation.takeScreenshot().
     * Used when UiDevice.takeScreenshot() is unavailable or fails silently.
     */
    private fun tryUiAutomationFallback(outFile: File): Boolean {
        return try {
            val bmp: Bitmap = InstrumentationRegistry.getInstrumentation()
                .uiAutomation.takeScreenshot()
                ?: return false
            FileOutputStream(outFile).use { fos ->
                bmp.compress(Bitmap.CompressFormat.PNG, 100, fos)
            }
            true
        } catch (_: Throwable) {
            false
        }
    }

    /** Sanitizes filenames by replacing characters unsafe for most file systems. */
    private fun safe(s: String) = s.replace("""[^\w.\-]+""".toRegex(), "_")
}
