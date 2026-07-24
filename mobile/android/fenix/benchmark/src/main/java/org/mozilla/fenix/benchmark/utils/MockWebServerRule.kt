/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.benchmark.utils

import androidx.core.net.toUri
import androidx.test.platform.app.InstrumentationRegistry
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import okio.Buffer
import okio.source
import org.junit.rules.ExternalResource
import java.io.IOException
import java.io.InputStream

/**
 * A JUnit [ExternalResource] that manages the lifecycle of a [MockWebServer] instance.
 *
 * The server will be started before each test and shutdown after each test.
 *
 * The server is configured with a [Dispatcher] that will return Android assets in the body of
 * requests. If the dispatcher is unable to read a requested asset, it will return a 404 response.
 *
 * @param port The port to start the server on. If 0 (default) a random available port will be used.
 */
class MockWebServerRule(
    private val port: Int = 0,
) : ExternalResource() {

    lateinit var server: MockWebServer
        private set

    override fun before() {
        server = MockWebServer().apply {
            start(this@MockWebServerRule.port)
            dispatcher = AndroidAssetDispatcher()
        }
    }

    override fun after() {
        server.shutdown()
    }

    /**
     * A [MockWebServer] [Dispatcher] that will return Android assets in the body of requests.
     *
     * If the dispatcher is unable to read a requested asset, it will return a 404 response.
     *
     */
    private class AndroidAssetDispatcher : Dispatcher() {
        override fun dispatch(request: RecordedRequest): MockResponse {
            val assetManager = InstrumentationRegistry.getInstrumentation().context.assets
            try {
                request.path?.drop(1)?.toUri()?.path?.let { path ->
                    assetManager.open(path).use { inputStream ->
                        return inputStream.toResponse(contentType(path))
                    }
                }
            } catch (_: IOException) {
                /* Ignored */
            }
            return MockResponse().setResponseCode(HTTP_NOT_FOUND)
        }

        @Throws(IOException::class)
        private fun InputStream.toResponse(contentType: String) = MockResponse()
            .setResponseCode(HTTP_OK)
            .setBody(
                Buffer().apply {
                    writeAll(source())
                },
            )
            .addHeader("content-type: $contentType")


        private fun contentType(path: String): String {
            return when {
                path.endsWith(".png") -> "image/png"
                path.endsWith(".jpg") -> "image/jpeg"
                path.endsWith(".jpeg") -> "image/jpeg"
                path.endsWith(".gif") -> "image/gif"
                path.endsWith(".svg") -> "image/svg+xml"
                path.endsWith(".html") -> "text/html; charset=utf-8"
                path.endsWith(".txt") -> "text/plain; charset=utf-8"
                else -> "application/octet-stream"
            }
        }

        companion object {
            const val HTTP_OK = 200
            const val HTTP_NOT_FOUND = 404
        }
    }

}
