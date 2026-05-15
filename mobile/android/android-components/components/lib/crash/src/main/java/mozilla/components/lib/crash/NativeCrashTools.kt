/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.crash

import android.content.Context
import androidx.annotation.Keep
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import mozilla.components.support.base.log.logger.Logger
import java.io.IOException
import java.net.URL

/**
 * Invoke native crash tools.
 */
internal class NativeCrashTools {
    companion object {
        private val logger = Logger("crash/NativeCrashTools")
        private var loaded: Boolean = false

        @Volatile
        private var instance: NativeCrashTools? = null

        /**
         * Load the native crate tools. If the native library is not found, returns null.
         */
        fun load(context: Context, buildId: String?, displayVersion: String?): NativeCrashTools? {
            if (loaded) {
                return instance
            }
            synchronized(this) {
                if (!loaded) {
                    loaded = true
                    try {
                        System.loadLibrary("crashtools")
                        logger.debug("loaded crashtools native library")
                        nativeInit(
                            java.io.File(context.filesDir, "crashtools_glean").path,
                            context.packageName,
                            buildId,
                            displayVersion,
                        )
                        instance = NativeCrashTools()
                    } catch (e: UnsatisfiedLinkError) {
                        logger.error("failed to load crashtools native library: $e")
                    } catch (e: IOException) {
                        logger.error("failed to initialize crashtools native library: $e")
                    }
                }
                return instance
            }
        }

        // detekt doesn't know that we call this from the native code.
        @Suppress("UnusedPrivateMember")
        @JvmStatic
        // Make sure this method isn't removed by proguard since it needs to be called via JNI
        @Keep
        private fun postRequest(url: String, body: ByteArray, headers: Map<String, String>): Int {
            val url = URL(url)
            val urlConnection = url.openConnection() as java.net.HttpURLConnection
            return urlConnection.run {
                var response: Int
                try {
                    setDoOutput(true)
                    setRequestMethod("POST")
                    setFixedLengthStreamingMode(body.size)
                    for ((k, v) in headers) {
                        setRequestProperty(k, v)
                    }
                    getOutputStream().write(body)
                    response = getResponseCode()
                } finally {
                    disconnect()
                }
                response
            }
        }

        @JvmStatic
        @Throws(IOException::class)
        private external fun nativeInit(dataPath: String, appId: String, buildId: String?, displayVersion: String?)
    }

    /**
     * Run the minidump analyzer. If an error occurs, it is logged but nothing else is done (because
     * the minidump analyzer is best-effort to augment crash information).
     */
    fun analyzeMinidump(minidumpPath: String, extrasPath: String, allThreads: Boolean) {
        nativeAnalyzeMinidump(minidumpPath, extrasPath, allThreads)?.let {
            logger.error("error running minidump analyzer: $it")
        }
    }

    /**
     * Send a crash ping. If an error occurs, it is logged by the native code
     * but nothing else is done.
     */
    fun sendCrashPing(extrasJson: String) {
        nativeSendPing(extrasJson)
    }

    /**
     * Test-only: get the metric values as a JSON string before the next crash
     * ping is sent.
     */
    fun testMetricValuesBeforeNextSend(callback: JsonObject.() -> Unit) {
        nativeTestMetricValuesBeforeNextSend { metricsJson ->
            callback(Json.parseToJsonElement(metricsJson).jsonObject)
        }
    }

    private external fun nativeAnalyzeMinidump(minidumpPath: String, extrasPath: String, allThreads: Boolean): String?
    private external fun nativeSendPing(extrasJson: String)
    private external fun nativeTestMetricValuesBeforeNextSend(callback: (metricsJson: String) -> Unit)
}
