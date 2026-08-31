/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.helpers

import mockwebserver3.MockWebServer
import org.junit.rules.ExternalResource

/**
 * A JUnit [ExternalResource] that manages the lifecycle of a [MockWebServer] instance backed
 * by a [SearchDispatcher].
 *
 * The server will be started before each test and closed after each test.
 */
class SearchMockServerRule : ExternalResource() {

    lateinit var server: MockWebServer
        private set

    override fun before() {
        server = MockWebServer().apply {
            dispatcher = SearchDispatcher()
            start()
        }
    }

    override fun after() {
        server.close()
    }
}
