/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.android.test.rules

import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.test.platform.app.InstrumentationRegistry
import mockwebserver3.Dispatcher
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import mockwebserver3.RecordedRequest
import okio.Buffer
import okio.source
import org.junit.rules.TestWatcher
import org.junit.runner.Description
import java.io.IOException

/**
 * A [TestWatcher] junit rule that will serve content from assets in the test package.
 */
class WebserverRule : TestWatcher() {
    private val webserver: MockWebServer = MockWebServer().apply {
        dispatcher = AndroidAssetDispatcher()
    }

    fun url(path: String = ""): String {
        return webserver.url(path).toString()
    }

    override fun starting(description: Description?) {
        webserver.start()
    }

    override fun finished(description: Description?) {
        webserver.close()
    }
}

private const val HTTP_OK = 200
private const val HTTP_NOT_FOUND = 404

class AndroidAssetDispatcher : Dispatcher() {
    private val mainThreadHandler = Handler(Looper.getMainLooper())

    override fun dispatch(request: RecordedRequest): MockResponse {
        var path = Uri.parse(request.target.drop(1)).path ?: ""
        if (path.isEmpty() || path.endsWith("/")) {
            path += "index.html"
        }

        return try {
            val assetManager = InstrumentationRegistry.getInstrumentation().context.assets
            assetManager.open(path).use { inputStream ->
                MockResponse.Builder()
                    .code(HTTP_OK)
                    .body(Buffer().apply { writeAll(inputStream.source()) })
                    .addHeader("content-type: ${contentType(path)}")
                    .build()
            }
        } catch (e: IOException) {
            // e.g. file not found.
            // We're on a background thread so we need to forward the exception to the main thread.
            mainThreadHandler.postAtFrontOfQueue {
                throw IllegalStateException("Could not load resource from path: $path", e)
            }
            MockResponse(code = HTTP_NOT_FOUND)
        }
    }
}

private fun contentType(path: String) = when {
    path.endsWith(".png") -> "image/png"
    path.endsWith(".jpg") || path.endsWith(".jpeg") -> "image/jpeg"
    path.endsWith(".gif") -> "image/gif"
    path.endsWith(".svg") -> "image/svg+xml"
    path.endsWith(".html") || path.endsWith(".htm") -> "text/html; charset=utf-8"
    path.endsWith(".txt") -> "text/plain; charset=utf-8"
    else -> "application/octet-stream"
}
