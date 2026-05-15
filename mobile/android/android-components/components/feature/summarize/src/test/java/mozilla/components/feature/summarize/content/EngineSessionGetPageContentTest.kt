/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.summarize.content

import kotlinx.coroutines.test.runTest
import mozilla.components.support.test.fakes.engine.TestEngineSession
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class EngineSessionGetPageContentTest {

    private lateinit var engineSession: FakeEngineSession

    @Before
    fun setUp() {
        engineSession = FakeEngineSession()
    }

    @Test
    fun `given engine session is unable to retrieve page content, then an error is returned`() =
        runTest {
            // given that an error happened
            engineSession.expectedError = Throwable("Engine session error")

            // when we try to fetch the engine session for the session
            val result = engineSession.getPageContent()

            // then verify that the result is an error, with the error message from the engine session
            assertTrue(
                "Expected that the result is an error. Got success instead",
                result.isFailure,
            )
            assertEquals(
                "Expected the error to be the same returned from engine session",
                "Engine session error",
                result.exceptionOrNull()!!.message,
            )
        }

    @Test
    fun `given engine session is able to retrieve page content, then the page content is provided`() =
        runTest {
            // given that we can retrieve the page content successfully
            engineSession.expectedContent = "Mozilla mozilla mozilla mozilla"

            // when we try to fetch the page content the test tab
            val result = engineSession.getPageContent()

            // then verify that the result is the page content
            assertEquals(
                "Expected that the result is the same page content provided by the engine session",
                "Mozilla mozilla mozilla mozilla",
                result.getOrThrow(),
            )
        }

    /**
     * Helper implementation of EngineSession for testing page content retrieval scenarios.
     */
    private class FakeEngineSession : TestEngineSession() {

        var expectedError: Throwable? = null
        var expectedContent: String? = ""

        override fun getPageContent(onResult: (String) -> Unit, onException: (Throwable) -> Unit) {
            val error = expectedError
            val content = expectedContent
            if (error != null) {
                onException(error)
            } else if (content != null) {
                onResult(content)
            }
        }
    }
}
