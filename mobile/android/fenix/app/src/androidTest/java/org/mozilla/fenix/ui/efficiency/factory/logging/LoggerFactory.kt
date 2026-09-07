/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.logging

import android.content.Context
import androidx.test.platform.app.InstrumentationRegistry
import org.mozilla.fenix.ui.efficiency.factory.steps.StepResult
import java.io.File

/**
 * Multiplexing logger that fans out high-level messages to:
 *
 * - [SummarySink]: human-readable, line-oriented log (`summary.log`)
 * - [JsonSink]: machine-readable, newline-delimited JSON (`details.jsonl`)
 *
 *  This logger is **best-effort**: any sink failure is swallowed and logged to Logcat
 *  so logging can never crash a test or mask the root failure.
 *
 * This class implements the [StepLogger] interface used by factories so
 * calling code does not care about concrete sinks or file layout.
 */
class CombinedLogger(
    private val summary: SummarySink,
    private val json: JsonSink,
) : StepLogger {

    /**
     * Executes [fn] and swallows any Throwable raised by sinks, logging a WARN.
     * This ensures logging never interferes with test execution.
     */
    private fun swallow(phase: String, fn: () -> Unit) {
        try {
            fn()
        } catch (t: Throwable) {
            android.util.Log.w("CombinedLogger", "Sink failure during $phase: ${t.message}", t)
        }
    }

    /** Marks the beginning of a factory suite (e.g., `FEATURE.Presence`). */
    override fun testStart(testId: String, meta: Map<String, Any?>) {
        swallow("testStart:summary") { summary.line("[TEST] $testId — START") }
        swallow("testStart:json") { json.event(mapOf("type" to "testStart", "testId" to testId, "meta" to meta)) }
    }

    /** Marks the end of a suite with a terminal [TestStatus]. */
    override fun testEnd(testId: String, status: TestStatus) {
        swallow("testEnd:summary") { summary.line("[TEST] $testId — $status") }
        swallow("testEnd:json") { json.event(mapOf("type" to "testEnd", "testId" to testId, "status" to status.name)) }
    }

    /** Emits a step-begin record (navigation, action, verify, etc.). */
    override fun stepStart(step: StepDescriptor) {
        swallow("stepStart:summary") { summary.line("[STEP] ${step.name} ${step.args} — START") }
        swallow("stepStart:json") {
            json.event(mapOf("type" to "stepStart", "stepId" to step.id, "name" to step.name, "args" to step.args))
        }
    }

    /** Emits a step-end record with PASS/FAIL (and reason if failed). */
    override fun stepEnd(step: StepDescriptor, result: StepResult) {
        val status = if (result is StepResult.Ok) "PASS" else "FAIL"
        swallow("stepEnd:summary") { summary.line("[STEP] ${step.name} — $status") }
        swallow("stepEnd:json") {
            json.event(
                mapOf(
                    "type" to "stepEnd",
                    "stepId" to step.id,
                    "name" to step.name,
                    "result" to status,
                    "reason" to (result as? StepResult.Fail)?.reason,
                ),
            )
        }
    }

    /** Free-form informational note. */
    override fun info(msg: String, kv: Map<String, Any?>) {
        swallow("info:summary") { summary.line("[INFO] $msg $kv") }
        swallow("info:json") { json.event(mapOf("type" to "info", "msg" to msg, "kv" to kv)) }
    }

    /** Warning (non-fatal). */
    override fun warn(msg: String, kv: Map<String, Any?>) {
        swallow("warn:summary") { summary.line("[WARN] $msg $kv") }
        swallow("warn:json") { json.event(mapOf("type" to "warn", "msg" to msg, "kv" to kv)) }
    }

    /** Error (non-fatal); include throwable stack trace if provided. */
    override fun error(msg: String, kv: Map<String, Any?>, throwable: Throwable?) {
        swallow("error:summary") { summary.line("[ERROR] $msg $kv ${throwable?.message ?: ""}") }
        swallow("error:json") {
            json.event(mapOf("type" to "error", "msg" to msg, "kv" to kv, "error" to (throwable?.stackTraceToString())))
        }
    }

    /**
     * Attaches a screenshot path to both sinks so consumers
     * (humans + machines) can correlate imagery with a step.
     */
    override fun attachScreenshot(step: StepDescriptor, path: String) {
        swallow("screenshot:summary") { summary.line("[SHOT] ${step.name} → $path") }
        swallow("screenshot:json") { json.event(mapOf("type" to "screenshot", "stepId" to step.id, "path" to path)) }
    }
}

/**
 * Factory for a ready-to-use [StepLogger] and run-scoped artifact directory.
 *
 * Responsibilities:
 * - Creates `artifacts/<run-id>/` under app storage (external if available, else internal)
 * - Initializes [ArtifactManager] with that directory
 * - Wires a [CombinedLogger] with [SummarySink] and [JsonSink] file targets
 *
 * Fault tolerance:
 * - If external storage is unavailable or directory creation fails, falls back to internal storage.
 * - If sink setup or ArtifactManager init fails, returns a **no-op** logger so tests keep running.
 */
object LoggerFactory {

    /**
     * Create a [StepLogger] and initialize the artifacts root for this run.
     *
     * The method prefers external app storage, then falls back to internal storage,
     * and finally to an internal fallback directory if needed. If sink setup fails,
     * a **no-op** logger is returned so tests continue to run.
     *
     * @param runId Optional run identifier used as the artifacts directory name (sanitized).
     *              Defaults to current epoch millis for uniqueness.
     * @param ctx Optional Android context; defaults to instrumentation target context
     *            via [InstrumentationRegistry].
     */
    fun create(
        runId: String = System.currentTimeMillis().toString(),
        ctx: Context? = null,
    ): StepLogger {
        val appCtx = ctx ?: InstrumentationRegistry.getInstrumentation().targetContext
        val safeRunId = runId.replace("""[^\w.\-]+""".toRegex(), "_")

        // Choose a base storage root (prefer external, fall back to internal)
        val externalBase: File? = try {
            appCtx.getExternalFilesDir(null)
        } catch (_: Throwable) {
            null
        }
        val internalBase: File = appCtx.filesDir

        // Try external/artifacts/<runId>, else internal/artifacts/<runId>, else internal fallback.
        val candidateRoots = sequenceOf(
            (externalBase ?: internalBase) to "preferred",
            internalBase to "internal",
        ).map { (base, label) ->
            val dir = File(base, "artifacts/$safeRunId")
            label to dir
        }.toList()

        val root: File = run {
            var chosen: File? = null
            for ((label, dir) in candidateRoots) {
                try {
                    if (dir.exists() || dir.mkdirs()) {
                        android.util.Log.i("LoggerFactory", "Artifacts root: [$label] ${dir.absolutePath}")
                        chosen = dir
                        break
                    } else {
                        android.util.Log.w("LoggerFactory", "mkdirs failed: ${dir.absolutePath}")
                    }
                } catch (t: Throwable) {
                    android.util.Log.w("LoggerFactory", "Failed creating ${dir.absolutePath}: ${t.message}", t)
                }
            }
            chosen ?: File(internalBase, "artifacts/_fallback_${System.currentTimeMillis()}").apply {
                mkdirs()
                android.util.Log.w("LoggerFactory", "Using fallback artifacts root: $absolutePath")
            }
        }

        // Initialize artifact manager safely
        try {
            ArtifactManager.init(root)
        } catch (t: Throwable) {
            android.util.Log.w("LoggerFactory", "ArtifactManager init failed, using no-op logger: ${t.message}", t)
            return noOpLogger()
        }

        // Create sinks (best-effort; if file I/O fails, return a no-op logger)
        return try {
            val summary = SummarySink(File(root, "summary.log"))
            val json = JsonSink(File(root, "details.jsonl"))
            CombinedLogger(summary, json)
        } catch (t: Throwable) {
            android.util.Log.w("LoggerFactory", "Sink setup failed, using no-op logger: ${t.message}", t)
            noOpLogger()
        }
    }

    /** Minimal logger that never writes; used when sinks cannot be initialized. */
    private fun noOpLogger(): StepLogger = object : StepLogger {
        override fun testStart(testId: String, meta: Map<String, Any?>) {}
        override fun testEnd(testId: String, status: TestStatus) {}
        override fun stepStart(step: StepDescriptor) {}
        override fun stepEnd(step: StepDescriptor, result: StepResult) {}
        override fun info(msg: String, kv: Map<String, Any?>) {}
        override fun warn(msg: String, kv: Map<String, Any?>) {}
        override fun error(msg: String, kv: Map<String, Any?>, throwable: Throwable?) {}
        override fun attachScreenshot(step: StepDescriptor, path: String) {}
    }
}
