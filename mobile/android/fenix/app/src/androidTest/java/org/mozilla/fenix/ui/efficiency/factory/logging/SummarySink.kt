/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.logging

import android.util.Log
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Writes a **human-readable summary log** (`summary.log`) for a test run.
 *
 * Each call to [line] appends a single timestamped line both to logcat and
 * to the on-device file. The format is intentionally simple and concise:
 * ```
 * 12:34:56.789 [TEST] PRIVATE_BROWSING.Presence — START
 * 12:34:56.905 [STEP] Navigate.To.Home — PASS
 * 12:34:57.210 [TEST] PRIVATE_BROWSING.Presence — PASS
 * ```
 *
 * Used by [CombinedLogger] alongside [JsonSink] for richer structured output.
 *
 * Thread-safe: synchronized on writes to avoid interleaving lines from
 * concurrent steps in multi-test processes.
 */
class SummarySink(private val file: File) {
    private val tag = "TestFactorySummary"
    private val ts = SimpleDateFormat("HH:mm:ss.SSS", Locale.US)

    /**
     * Appends a line to both Logcat (`INFO` level) and the summary log file.
     *
     * @param s The message text to write (already formatted by caller).
     */
    @Synchronized
    fun line(s: String) {
        try {
            Log.i(tag, s)
        } catch (_: Throwable) {
            // Ignore rare Logcat exceptions (e.g., buffer full)
        }
        try {
            file.appendText("${ts.format(Date())} $s\n")
        } catch (t: Throwable) {
            Log.w(tag, "Failed to append summary line: ${t.message}", t)
        }
    }
}
