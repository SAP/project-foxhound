/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.crash.handler

import android.annotation.SuppressLint
import android.content.Context
import android.os.Process
import android.util.Log
import mozilla.components.lib.crash.Crash
import mozilla.components.lib.crash.CrashReporter

private const val TAG = "ExceptionHandler"

/**
 * [Thread.UncaughtExceptionHandler] implementation that forwards crashes to the [CrashReporter] instance.
 */
class ExceptionHandler(
    private val context: Context,
    private val crashReporter: CrashReporter,
    private val defaultExceptionHandler: Thread.UncaughtExceptionHandler? = null,
    private val handleCaughtException: (() -> Unit)? = null,
) : Thread.UncaughtExceptionHandler {
    private var crashing = false

    @SuppressLint("LogUsage") // We do not want to use our custom logger while handling the crash
    override fun uncaughtException(thread: Thread, throwable: Throwable) {
        var throwable = throwable
        Log.e(TAG, "Uncaught exception handled: ", throwable)

        if (crashing) {
            return
        }

        handleCaughtException?.invoke()

        // We want to catch and log all exceptions that can take down the crash reporter.
        // This is the best we can do without being able to report it.
        @Suppress("TooGenericExceptionCaught")
        try {
            crashing = true

            crashReporter.onCrash(
                context,
                Crash.UncaughtExceptionCrash(
                    timestamp = System.currentTimeMillis(),
                    throwable = throwable,
                    breadcrumbs = crashReporter.crashBreadcrumbsCopy(),
                ),
            )
        } catch (e: Exception) {
            Log.e(TAG, "Crash reporter has crashed.", e)
            // Send to the default exception handler so system-level crash
            // reporters can hopefully collect these errors and report them to
            // us by other means. We don't call the default exception handler
            // here because that would probably result in more than one crash
            // UI being shown by the Android Runtime, which would be confusing
            // to users (and may not actually work as intended, anyway).
            e.addSuppressed(throwable)
            throwable = e
        } finally {
            defaultExceptionHandler?.uncaughtException(thread, throwable)
            terminateProcess()
        }
    }

    private fun terminateProcess() {
        Process.killProcess(Process.myPid())
    }
}
