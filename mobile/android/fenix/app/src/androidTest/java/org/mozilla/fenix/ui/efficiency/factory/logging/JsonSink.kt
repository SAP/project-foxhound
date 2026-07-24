/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.logging

import org.json.JSONObject
import java.io.File
import java.util.Date

/**
 * Appends structured **newline-delimited JSON** (JSONL) events to a file.
 *
 * Each call to [event] writes exactly one JSON object per line,
 * injecting a millisecond-resolution `"ts"` timestamp.
 * This format is easy to stream, parse, or index with log tools.
 *
 * Example line:
 * ```
 * {"type":"stepEnd","stepId":"presence-0","result":"PASS","ts":1731000000000}
 * ```
 *
 * This sink is **best-effort**: any I/O or serialization failure is caught and
 * logged to Logcat, never propagated to the caller, ensuring tests continue.
 */
class JsonSink(private val file: File) {

    /**
     * Serializes [map] to JSON, injects `"ts"` (epoch millis), and appends a line.
     *
     * Thread-safe: synchronized to avoid interleaved writes from parallel tests
     * within the same process (AndroidX can run multiple tests in one instrumentation).
     *
     * Exceptions are caught and logged at WARN level to prevent test interruption.
     */
    @Synchronized
    fun event(map: Map<String, Any?>) {
        try {
            val obj = JSONObject(map + mapOf("ts" to Date().time))
            file.appendText(obj.toString() + "\n")
        } catch (t: Throwable) {
            // Never let logging crash the test
            android.util.Log.w("JsonSink", "Failed to write JSON event: ${t.message}")
        }
    }
}
