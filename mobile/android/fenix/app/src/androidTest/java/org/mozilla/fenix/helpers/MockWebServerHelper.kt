/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.helpers

import mockwebserver3.Dispatcher
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import mockwebserver3.RecordedRequest

object MockWebServerHelper {

    /**
     * Create a mock webserver that accepts all requests and replies with "OK".
     * @return a [MockWebServer] instance
     */
    fun createAlwaysOkMockWebServer(): MockWebServer {
        return MockWebServer().apply {
            val dispatcher = object : Dispatcher() {
                @Throws(InterruptedException::class)
                override fun dispatch(request: RecordedRequest): MockResponse {
                    return MockResponse(body = "OK")
                }
            }
            this.dispatcher = dispatcher
            start()
        }
    }
}
