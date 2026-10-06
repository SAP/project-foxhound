/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.android.test.rules

import mockwebserver3.MockWebServer
import org.junit.rules.ExternalResource
import java.io.IOException

/**
 * A JUnit [ExternalResource] that manages the lifecycle of a [MockWebServer] instance backed
 * by an [AndroidAssetDispatcher].
 *
 * The server will be started before each test and closed after each test.
 */
class MockWebServerRule : ExternalResource() {

    lateinit var server: MockWebServer
        private set

    override fun before() {
        server = MockWebServer().apply {
            dispatcher = AndroidAssetDispatcher()
        }
        try {
            server.start()
        } catch (e: IOException) {
            server.close()
            server.start()
        }
    }

    override fun after() {
        if (::server.isInitialized) {
            server.close()
        }
    }
}
