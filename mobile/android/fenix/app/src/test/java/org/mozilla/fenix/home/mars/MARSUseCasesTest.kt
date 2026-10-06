/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.mars

import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.concept.fetch.Client
import mozilla.components.concept.fetch.MutableHeaders
import mozilla.components.concept.fetch.Request
import mozilla.components.concept.fetch.Response
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.io.IOException

class MARSUseCasesTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var client: Client
    private lateinit var useCases: MARSUseCases

    @Before
    fun setUp() {
        client = mockk()
        useCases = MARSUseCases(client, testDispatcher)
    }

    @Test
    fun `WHEN sending a click or impression callback THEN ensure the correct request parameters are used`() = runTest(testDispatcher) {
        val url = "https://firefox.com/click"

        assertRequestParams(
            client = client,
            makeRequest = {
                useCases.recordInteraction(url)
            },
            assertParams = { request ->
                assertEquals(url, request.url)
                assertEquals(Request.Method.GET, request.method)
                assertTrue(request.conservative)
            },
        )
    }

    @Test
    fun `WHEN sending a click or impression callback and the client throws an IOException THEN false is returned`() = runTest(testDispatcher) {
        val url = "https://firefox.com/click"
        coEvery { client.fetch(any()) } throws IOException()
        assertFalse(useCases.recordInteraction(url))
    }

    @Test
    fun `WHEN sending a click or impression callback and the response is null THEN false is returned`() = runTest(testDispatcher) {
        val url = "https://firefox.com/click"
        val emptyResponse = mockk<Response>(relaxed = true)
        coEvery { client.fetch(any()) } returns emptyResponse

        assertFalse(useCases.recordInteraction(url))
    }

    @Test
    fun `WHEN sending a click or impression callback and the response is a failure THEN false is returned`() = runTest(testDispatcher) {
        val url = "https://firefox.com/click"
        val errorResponse = mockk<Response>(relaxUnitFun = true).also {
            every { it.status } returns 404
        }

        coEvery { client.fetch(any()) } returns errorResponse

        assertFalse(useCases.recordInteraction(url))
        verify(exactly = 1) { errorResponse.close() }
    }

    @Test
    fun `WHEN sending a click or impression callback and the response is success THEN true is returned`() = runTest(testDispatcher) {
        val url = "https://firefox.com/click"
        val successResponse = mockk<Response>(relaxUnitFun = true).also {
            every { it.status } returns 200
            every { it.body } returns Response.Body.empty()
        }

        coEvery { client.fetch(any()) } returns successResponse

        assertTrue(useCases.recordInteraction(url))
        verify(exactly = 1) { successResponse.close() }
    }
}

private suspend fun assertRequestParams(
    client: Client,
    makeRequest: suspend () -> Unit,
    assertParams: (Request) -> Unit,
) {
    coEvery { client.fetch(any()) } answers {
        val request = it.invocation.args[0] as Request
        assertParams(request)
        Response("https://mozilla.org", 200, MutableHeaders(), Response.Body("".byteInputStream()))
    }

    makeRequest()

    // Ensure fetch is called so that the assertions in assertParams are called.
    coVerify(exactly = 1) { client.fetch(any()) }
}
