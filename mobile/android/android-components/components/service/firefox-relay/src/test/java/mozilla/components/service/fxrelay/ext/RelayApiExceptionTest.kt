/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxrelay.ext

import mozilla.appservices.relay.RelayApiException
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RelayApiExceptionTest {

    @Test
    fun `GIVEN Api exception with free_tier_limit code WHEN freeLimitReached is called THEN returns true`() {
        val exception = RelayApiException.Api(
            status = 403u,
            code = API_CODE_FREE_TIER_LIMIT,
            detail = "Free tier limit reached",
        )

        val result = exception.freeLimitReached()

        assertTrue(result)
    }

    @Test
    fun `GIVEN Api exception with different code WHEN freeLimitReached is called THEN returns false`() {
        val exception = RelayApiException.Api(
            status = 403u,
            code = "account_is_inactive",
            detail = "Account is inactive",
        )

        val result = exception.freeLimitReached()

        assertFalse(result)
    }

    @Test
    fun `GIVEN Network exception WHEN freeLimitReached is called THEN returns false`() {
        val exception = RelayApiException.Network(reason = "Network error")

        val result = exception.freeLimitReached()

        assertFalse(result)
    }

    @Test
    fun `GIVEN Other exception WHEN freeLimitReached is called THEN returns false`() {
        val exception = RelayApiException.Other(reason = "Other error")

        val result = exception.freeLimitReached()

        assertFalse(result)
    }
}
