/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.rusterrors

import mozilla.appservices.errorsupport.ApplicationErrorReporter
import mozilla.appservices.errorsupport.RustComponentsErrorTelemetry
import mozilla.appservices.errorsupport.setApplicationErrorReporter
import mozilla.components.concept.base.crash.Breadcrumb
import mozilla.components.concept.base.crash.CrashReporting
import mozilla.components.concept.base.crash.RustCrashReport

/**
 * Initialize application services error reporting
 *
 * Errors reports and breadcrumbs from Application Services will be forwarded
 * to the CrashReporting instance. Error counting, which is used for expected
 * errors like network errors, will be counted with Glean.
 */
public fun initializeRustErrors(crashReporter: CrashReporting) {
    ErrorReporter.crashReporter = crashReporter
    setApplicationErrorReporter(ErrorReporter)
}

internal class AppServicesErrorReport(
    override val typeName: String,
    cause: Throwable,
) : Exception(cause.message, cause), RustCrashReport {
    override val message: String get() = cause?.message ?: "(unknown Rust error)"
}

/**
 * Report an error from a Rust component to Sentry and submit a telemetry ping.
 *
 * This wraps the exception in a [RustCrashReport] to customize how the crash
 * report is displayed in Sentry, while preserving the original stacktrace.
 */
fun reportRustError(typeName: String, exception: Throwable) {
    ErrorReporter.crashReporter?.submitCaughtException(AppServicesErrorReport(typeName, exception))
    RustComponentsErrorTelemetry.submitErrorPing(typeName, exception.toString())
}

internal object ErrorReporter : ApplicationErrorReporter {
    internal var crashReporter: CrashReporting? = null

    override fun reportError(typeName: String, message: String) {
        crashReporter?.submitCaughtException(AppServicesErrorReport(typeName, Exception(message)))
    }

    override fun reportBreadcrumb(message: String, module: String, line: UInt, column: UInt) {
        crashReporter?.recordCrashBreadcrumb(Breadcrumb("$module[$line]: $message"))
    }
}
