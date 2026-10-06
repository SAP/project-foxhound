/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.logging

import org.mozilla.fenix.ui.efficiency.factory.steps.StepResult

/**
 * Enumeration of final outcomes for a test or step.
 */
enum class TestStatus { PASS, FAIL, SKIP }

/**
 * Lightweight metadata describing a logical step within a factory test.
 *
 * Used for structured logging and correlation between summary and JSON outputs.
 *
 * @property id   Unique short identifier (e.g., `"presence-0"`).
 * @property name Human-readable step name (e.g., `"Navigate.To.Home"`).
 * @property args Optional arguments relevant to the step (for traceability).
 */
data class StepDescriptor(
    val id: String,
    val name: String,
    val args: Map<String, Any?> = emptyMap(),
)

/**
 * Core logging interface for test factories.
 *
 * The factories never write directly to files — they only emit events through
 * a [StepLogger]. Implementations (e.g., [CombinedLogger]) then route these
 * events to one or more sinks ([SummarySink], [JsonSink]).
 *
 * Typical event sequence per suite:
 * ```
 * testStart()
 *   stepStart()
 *   stepEnd()
 *   ...
 * testEnd()
 * ```
 */

interface StepLogger {

    /** Marks the beginning of a suite (Presence, Interaction, or Behavior). */
    fun testStart(testId: String, meta: Map<String, Any?> = emptyMap())

    /** Marks the end of a suite with a terminal [TestStatus]. */
    fun testEnd(testId: String, status: TestStatus)

    /** Logs the beginning of a discrete step. */
    fun stepStart(step: StepDescriptor)

    /** Logs the end of a step with its resulting [StepResult]. */
    fun stepEnd(step: StepDescriptor, result: StepResult)

    /** Emits an informational message (non-step-level). */
    fun info(msg: String, kv: Map<String, Any?> = emptyMap())

    /** Emits a warning message. */
    fun warn(msg: String, kv: Map<String, Any?> = emptyMap())

    /** Emits an error message; optionally attaches a [Throwable] stack trace. */
    fun error(msg: String, kv: Map<String, Any?> = emptyMap(), throwable: Throwable? = null)

    /**
     * Links a screenshot to the current step, ensuring traceability between
     * step log entries and stored image artifacts.
     *
     * @param step Descriptor for which the screenshot was captured.
     * @param path Absolute path to the PNG file on disk.
     */
    fun attachScreenshot(step: StepDescriptor, path: String)
}
