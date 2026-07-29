/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.summarization

import mozilla.components.concept.llm.Llm
import mozilla.components.lib.llm.mlpa.service.IntegrityHandshakeFailure
import mozilla.components.lib.llm.mlpa.service.RateLimited
import mozilla.components.lib.llm.mlpa.service.RequestTooLarge
import org.junit.Assert.assertEquals
import org.junit.Test
import kotlin.test.assertIs

class ErrorCodeLookupTest {

    @Test
    fun `lookup of a known MLPA subtype returns the assigned code`() {
        val result = ErrorCodeLookup.lookup(RateLimited(retryAfter = 60L))

        assertIs<ErrorLookupResult.Known>(result)
        assertEquals(1008, result.code)
    }

    @Test
    fun `RequestTooLarge resolves to the content-too-long code`() {
        val result = ErrorCodeLookup.lookup(RequestTooLarge())

        assertIs<ErrorLookupResult.Known>(result)
        assertEquals(1006, result.code)
    }

    @Test
    fun `IntegrityHandshakeFailure resolves to its assigned code`() {
        val result = ErrorCodeLookup.lookup(IntegrityHandshakeFailure("boom"))

        assertIs<ErrorLookupResult.Known>(result)
        assertEquals(1002, result.code)
    }

    @Test
    fun `unrecognized Llm Exception falls back to global fallback but is still Known`() {
        val result = ErrorCodeLookup.lookup(Llm.Exception("not in the table"))

        assertIs<ErrorLookupResult.Known>(result)
        assertEquals(ErrorLookupResult.FALLBACK_CODE, result.code)
    }

    @Test
    fun `non-Llm throwable resolves to Unknown with fallback code`() {
        val throwable = IllegalStateException("boom")
        val result = ErrorCodeLookup.lookup(throwable)

        assertIs<ErrorLookupResult.Unknown>(result)
        assertEquals(ErrorLookupResult.FALLBACK_CODE, result.code)
        assertEquals(throwable, result.throwable)
    }
}
