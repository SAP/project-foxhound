/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.crash.service

import android.content.Context
import androidx.annotation.VisibleForTesting
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.DecodeSequenceMode
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.decodeFromStream
import kotlinx.serialization.json.decodeToSequence
import kotlinx.serialization.json.encodeToStream
import mozilla.components.lib.crash.Crash
import mozilla.components.lib.crash.GleanMetrics.CrashMetrics
import mozilla.components.lib.crash.NativeCrashTools
import mozilla.components.lib.crash.service.CrashReport.Annotation
import mozilla.components.support.base.ext.getStacktraceAsJsonString
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.support.ktx.android.content.isMainProcess
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.security.MessageDigest

private val logger = Logger("glean/GleanCrashReporterService")

/**
 * A [CrashReporterService] implementation for recording metrics with Glean.  The purpose of this
 * crash reporter is to collect crash count metrics by capturing [Crash.UncaughtExceptionCrash],
 * [Throwable] and [Crash.NativeCodeCrash] events and record to the respective
 * [mozilla.telemetry.glean.private.CounterMetricType].
 */
class GleanCrashReporterService(
    val context: Context,
    @get:VisibleForTesting(otherwise = VisibleForTesting.PRIVATE)
    internal val file: File = File(context.applicationInfo.dataDir, CRASH_FILE_NAME),
    private val appChannel: String? = null,
    private val appVersion: String? = null,
    private val appBuildId: String? = null,
    ) : CrashTelemetryService {
    companion object {
        // This file is stored in the application's data directory, so it should be located in the
        // same location as the application.
        // The format of this file is simple and uses the keys named below, one per line, to record
        // crashes.  That format allows for multiple crashes to be appended to the file if, for some
        // reason, the application cannot run and record them.
        const val CRASH_FILE_NAME = "glean_crash_counts"

        // These keys correspond to the labels found for crashCount metric in metrics.yaml as well
        // as the persisted crashes in the crash count file (see above comment)
        const val UNCAUGHT_EXCEPTION_KEY = "uncaught_exception"
        const val CAUGHT_EXCEPTION_KEY = "caught_exception"
        const val MAIN_PROCESS_NATIVE_CODE_CRASH_KEY = "main_proc_native_code_crash"
        const val FOREGROUND_CHILD_PROCESS_NATIVE_CODE_CRASH_KEY = "fg_proc_native_code_crash"
        const val BACKGROUND_CHILD_PROCESS_NATIVE_CODE_CRASH_KEY = "bg_proc_native_code_crash"

        private const val MINIDUMP_READ_BUFFER_SIZE: Int = 8192
    }

    /**
     * The subclasses of GleanCrashAction are used to persist Glean actions to handle them later
     * (in the application which has Glean initialized). They are serialized to JSON objects and
     * appended to a file, in case multiple crashes occur prior to being able to submit the metrics
     * to Glean.
     */
    @VisibleForTesting(otherwise = VisibleForTesting.PRIVATE)
    @Serializable
    internal sealed class GleanCrashAction {
        /**
         * Submit the glean metrics/pings.
         */
        abstract fun submit()

        @Serializable
        @SerialName("count")
        data class Count(val label: String) : GleanCrashAction() {
            override fun submit() {
                CrashMetrics.crashCount[label].add()
            }
        }
    }

    init {
        run {
            // We only want to record things on the main process because that is the only one in which
            // Glean is properly initialized.  Checking to see if we are on the main process here will
            // prevent the situation that arises because the integrating app's Application will be
            // re-created when prompting to report the crash, and Glean is not initialized there since
            // it's not technically the main process.
            if (!context.isMainProcess()) {
                logger.info("GleanCrashReporterService initialized off of main process")
                return@run
            }

            if (!checkFileConditions()) {
                // checkFileConditions() internally logs error conditions
                return@run
            }

            // Parse the persisted crashes
            parseCrashFile()

            // Clear persisted counts by deleting the file
            file.delete()
        }
    }

    /**
     * Checks the file conditions to ensure it can be opened and read.
     *
     * @return True if the file exists and is able to be read, otherwise false
     */
    @VisibleForTesting(otherwise = VisibleForTesting.PRIVATE)
    internal fun checkFileConditions(): Boolean {
        return if (!file.exists()) {
            // This is just an info line, as most of the time we hope there is no file which means
            // there were no crashes
            logger.info("No crashes to record, or file not found.")
            false
        } else if (!file.canRead()) {
            logger.error("Cannot read file")
            false
        } else if (!file.isFile) {
            logger.error("Expected file, but found directory")
            false
        } else {
            true
        }
    }

    /**
     * Parses the crashes collected in the persisted crash file. The format of this file is simple,
     * a stream of serialized JSON GleanCrashAction objects.
     *
     * Example:
     *
     * <--Beginning of file-->
     * {"type":"count","label":"uncaught_exception"}\n
     * {"type":"count","label":"uncaught_exception"}\n
     * {"type":"count","label":"main_process_native_code_crash"}\n
     * <--End of file-->
     *
     * It is unlikely that there will be more than one crash in a file, but not impossible.  This
     * could happen, for instance, if the application crashed again before the file could be
     * processed.
     */
    @VisibleForTesting(otherwise = VisibleForTesting.PRIVATE)
    internal fun parseCrashFile() {
        try {
            @OptIn(ExperimentalSerializationApi::class)
            val actionSequence = Json.decodeToSequence<GleanCrashAction>(
                file.inputStream(),
                DecodeSequenceMode.WHITESPACE_SEPARATED,
            )
            for (action in actionSequence) {
                // We do not expect an exception to occur, however if the worst should happen, it's
                // essential that we don't allow the exception to interfere with other actions that
                // need to be submitted.
                @Suppress("TooGenericExceptionCaught")
                try {
                    action.submit()
                } catch (e: Exception) {
                    logger.error("Error submitting crash action", e)
                }
            }
        } catch (e: IOException) {
            logger.error("Error reading crash file", e)
            return
        } catch (e: SerializationException) {
            logger.error("Error deserializing crash file", e)
            return
        }
    }

    /**
     * This function handles the actual recording of the crash to the persisted crash file. We are
     * only guaranteed runtime for the lifetime of the [CrashTelemetryService.record] function,
     * anything that we do in this function **MUST** be synchronous and blocking.  We cannot spawn
     * work to background processes or threads here if we want to guarantee that the work is
     * completed. Also, since the [CrashTelemetryService.record] functions are called synchronously,
     * and from lib-crash's own process, it is unlikely that this would be called from more than one
     * place at the same time.
     *
     * @param action Pass in the crash action to record.
     */
    @VisibleForTesting(otherwise = VisibleForTesting.PRIVATE)
    internal fun recordCrashAction(action: GleanCrashAction) {
        // Persist the crash in a file so that it can be recorded on the next application start. We
        // cannot directly record to Glean here because CrashHandler process is not the same process
        // as Glean is initialized in.
        // Create the file if it doesn't exist
        if (!file.exists()) {
            try {
                file.createNewFile()
            } catch (e: IOException) {
                logger.error("Failed to create crash file", e)
            }
        }

        // Add a line representing the crash that was received
        if (file.canWrite()) {
            try {
                @OptIn(ExperimentalSerializationApi::class)
                Json.encodeToStream(action, FileOutputStream(file, true))
                file.appendText("\n")
            } catch (e: IOException) {
                logger.error("Failed to write to crash file", e)
            }
        }
    }

    private operator fun <T> Map<String, T>.get(a: Annotation): T? = get(a.toString())

    private operator fun <T> MutableMap<String, T>.set(a: Annotation, value: T) = set(a.toString(), value)

    private fun <T> MutableMap<String, T>.setIfAbsent(a: Annotation, value: () -> T) {
        if (!containsKey(a.toString())) {
            set(a.toString(), value())
        }
    }

    private fun setCommonPingFields(extras: MutableMap<String, JsonElement>, crash: Crash) {
        extras.setIfAbsent(Annotation.CrashTime) { JsonPrimitive((crash.timestamp / 1000).toString()) }
    }

    override fun record(crash: Crash.UncaughtExceptionCrash) {
        recordCrashAction(GleanCrashAction.Count(UNCAUGHT_EXCEPTION_KEY))

        val appVersion = crash.versionName.takeIf { it != "N/A" } ?: appVersion
        val appBuildId = crash.buildId.takeIf { it != "N/A" } ?: appBuildId

        getNativeCrashTools()?.run {
            val extras = mutableMapOf<String, JsonElement>()
            setCommonPingFields(extras, crash)
            extras[Annotation.ProcessType] = JsonPrimitive("main")
            appChannel?.let { extras[Annotation.ReleaseChannel] = JsonPrimitive(it) }
            appVersion?.let { extras[Annotation.Version] = JsonPrimitive(it) }
            appBuildId?.let { extras[Annotation.BuildID] = JsonPrimitive(it) }
            extras[Annotation.JavaException] = JsonPrimitive(crash.throwable.getStacktraceAsJsonString())
            extras[Annotation.CrashType] = JsonPrimitive("uncaught exception")

            sendCrashPing(Json.encodeToString(extras))
        }
    }

    private fun getNativeCrashTools() = NativeCrashTools.load(context, appBuildId, appVersion)

    private fun getExtrasJson(path: String): JsonObject? {
        val extrasFile = File(path)
        if (extrasFile.exists()) {
            try {
                @OptIn(ExperimentalSerializationApi::class)
                return Json.decodeFromStream<JsonObject>(extrasFile.inputStream())
            } catch (e: IOException) {
                logger.error("Error reading crash extra file", e)
            } catch (e: SerializationException) {
                logger.error("Error deserializing crash extra file", e)
            }
        } else {
            logger.warn("Crash extra file missing: $path")
        }
        return null
    }

    @Throws()
    private fun calculateMinidumpHash(path: String): String? {
        val minidumpFile = File(path)
        if (!minidumpFile.exists()) return null
        try {
            val digest = MessageDigest.getInstance("SHA-256")
            val input = minidumpFile.inputStream()

            val buffer = ByteArray(MINIDUMP_READ_BUFFER_SIZE)
            var n = 0
            while (n != -1) {
                digest.update(buffer, 0, n)
                n = input.read(buffer)
            }

            val hexString = StringBuilder()
            for (b in digest.digest()) {
                hexString.append("%02x".format(b))
            }
            return hexString.toString()
        } catch (e: IOException) {
            logger.error("Failed to generate minidump hash", e)
            return null
        }
    }

    override fun record(crash: Crash.NativeCodeCrash) {
        when (crash.processVisibility) {
            Crash.NativeCodeCrash.PROCESS_VISIBILITY_MAIN ->
                recordCrashAction(GleanCrashAction.Count(MAIN_PROCESS_NATIVE_CODE_CRASH_KEY))
            Crash.NativeCodeCrash.PROCESS_VISIBILITY_FOREGROUND_CHILD ->
                recordCrashAction(
                    GleanCrashAction.Count(
                        FOREGROUND_CHILD_PROCESS_NATIVE_CODE_CRASH_KEY,
                    ),
                )
            Crash.NativeCodeCrash.PROCESS_VISIBILITY_BACKGROUND_CHILD ->
                recordCrashAction(
                    GleanCrashAction.Count(
                        BACKGROUND_CHILD_PROCESS_NATIVE_CODE_CRASH_KEY,
                    ),
                )
        }

        val processType = crash.processType ?: "main"

        getNativeCrashTools()?.run {
            if (crash.minidumpPath != null && crash.extrasPath != null) {
                analyzeMinidump(crash.minidumpPath, crash.extrasPath, false)
            }
            val extras = crash.extrasPath?.let { getExtrasJson(it) }?.toMutableMap() ?: mutableMapOf()
            setCommonPingFields(extras, crash)
            if (crash.minidumpPath != null) {
                calculateMinidumpHash(crash.minidumpPath)?.let {
                    extras[Annotation.MinidumpSha256Hash] = JsonPrimitive(it)
                }
            }
            extras.setIfAbsent(Annotation.ProcessType) { JsonPrimitive(processType) }
            crash.remoteType?.let { extras.setIfAbsent(Annotation.RemoteType) { JsonPrimitive(it) } }
            extras.setIfAbsent(Annotation.CrashType) {
                JsonPrimitive("${if (!crash.isFatal) "non-" else ""}fatal native crash")
            }

            sendCrashPing(Json.encodeToString(extras))
        }
    }

    override fun record(throwable: Throwable) {
        recordCrashAction(GleanCrashAction.Count(CAUGHT_EXCEPTION_KEY))
    }
}
