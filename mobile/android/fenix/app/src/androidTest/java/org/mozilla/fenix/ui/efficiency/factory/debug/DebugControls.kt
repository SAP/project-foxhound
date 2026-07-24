/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.debug

import androidx.test.platform.app.InstrumentationRegistry
import org.mozilla.fenix.ui.efficiency.factory.logging.ArtifactManager
import org.mozilla.fenix.ui.efficiency.factory.logging.StepLogger
import java.io.File

/**
 * Provides developer-facing debug utilities for factory test runs.
 *
 * `DebugControls` lets engineers modify runtime behavior of test factories via
 * instrumentation arguments, without touching source code or build scripts.
 * This makes it easier to debug locally on emulators and physical devices,
 * where Firebase-style artifact export may not yet be available.
 *
 * Supported runtime arguments:
 * ```
 * -e factoryExportPublic true        # Export artifacts to /sdcard/TestFactoryArtifacts/<runId>
 * -e factoryPauseAfterRunSec 15      # Pause (in seconds) after suite finishes for inspection
 * ```
 *
 * Example Gradle invocation:
 * ```
 * ./gradlew :app:connectedDebugAndroidTest \
 *   -Pandroid.testInstrumentationRunnerArguments.factoryExportPublic=true \
 *   -Pandroid.testInstrumentationRunnerArguments.factoryPauseAfterRunSec=15
 * ```
 *
 * During a test run, the factories call [onSuiteEnd] after each Presence,
 * Interaction, or Behavior suite completes. This hook optionally mirrors
 * artifacts to public storage and delays teardown to allow adb inspection.
 */
object DebugControls {

    /**
     * Parsed runtime flags from the instrumentation arguments.
     *
     * @property exportPublic Whether to copy artifacts from the app sandbox to a
     *                        public location under `/sdcard/TestFactoryArtifacts`.
     * @property pauseSeconds How long (in seconds) to sleep after the suite ends
     *                        to give developers time to inspect files.
     */
    data class Flags(
        val exportPublic: Boolean = false,
        val pauseSeconds: Long = 0L,
    )

    /**
     * Reads instrumentation arguments and builds a [Flags] instance.
     *
     * @return Parsed [Flags] with defaults if arguments are missing or invalid.
     */
    fun flags(): Flags {
        val args = InstrumentationRegistry.getArguments()
        val export = args.getString("factoryExportPublic")?.equals("true", ignoreCase = true) == true
        val pause = args.getString("factoryPauseAfterRunSec")?.toLongOrNull() ?: 0L
        return Flags(exportPublic = export, pauseSeconds = pause)
    }

    /**
     * Executes developer-mode actions after a suite (Presence, Interaction, or Behavior)
     * has completed.
     *
     * 1. **Export:** If [Flags.exportPublic] is `true`, copies all artifacts from the
     *    sandbox directory (under the app’s private external storage) to a stable,
     *    public path: `/sdcard/TestFactoryArtifacts/<runId>/`. This copy survives
     *    app uninstall and can be viewed through the Android file system or pulled
     *    via `adb pull`.
     * 2. **Pause:** If [Flags.pauseSeconds] > 0, blocks the test thread for that
     *    duration to allow manual inspection or debugging.
     *
     * @param logger The active [StepLogger], used to record export or pause activity.
     * @param flags  Runtime configuration read from [flags].
     */
    fun onSuiteEnd(logger: StepLogger, flags: Flags) {
        if (flags.exportPublic) {
            val runDir = ArtifactManager.base() // .../artifacts/<run-id>
            val runId = runDir.name
            val exported = ShellExporter.exportRunDir(runId, runDir)
            if (exported != null) {
                logger.info("Exported artifacts to $exported")
            } else {
                logger.warn("Public export failed", mapOf("src" to runDir.absolutePath))
            }
        }
        if (flags.pauseSeconds > 0) {
            logger.info("Pausing after run", mapOf("seconds" to flags.pauseSeconds))
            try {
                Thread.sleep(flags.pauseSeconds * 1000)
            } catch (_: InterruptedException) {
                // Ignored; used only for debug inspection
                null
            }
        }
    }
}
