/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxa.manager

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.SerializationException
import mozilla.components.service.fxa.AccountStorage
import mozilla.components.service.fxa.FirefoxAccount
import mozilla.components.service.fxa.manager.ScopeStatus.Unavailable.Reason
import mozilla.components.support.test.mock
import mozilla.components.support.test.whenever
import org.junit.Assert.assertEquals
import org.junit.Test
import kotlin.test.assertIs

@OptIn(ExperimentalCoroutinesApi::class)
class AccountScopeAccessorTest {

    private val profileScope = "profile"
    private val syncScope = "https://identity.mozilla.com/apps/oldsync"

    private val dispatcher = StandardTestDispatcher()

    private fun accessor(storage: AccountStorage) =
        AccountScopeAccessor(storage, dispatcher)

    private fun storageReturning(json: String): AccountStorage {
        val account = mock<FirefoxAccount>()
        whenever(account.toJSONString()).thenReturn(json)
        val storage = mock<AccountStorage>()
        whenever(storage.read()).thenReturn(account)
        return storage
    }

    @Test
    fun `WHEN the scope is present THEN Granted is returned`() = runTest(dispatcher) {
        val json = """{"refresh_token":{"token":"t","scopes":["$profileScope","$syncScope"]}}"""

        assertEquals(ScopeStatus.Granted, accessor(storageReturning(json)).containsScope(syncScope))
    }

    @Test
    fun `WHEN an account exists but the scope is absent THEN NotGranted is returned`() = runTest(dispatcher) {
        val json = """{"refresh_token":{"token":"t","scopes":["$profileScope"]}}"""

        assertEquals(ScopeStatus.NotGranted, accessor(storageReturning(json)).containsScope(syncScope))
    }

    @Test
    fun `WHEN no account is stored THEN Unavailable NO_ACCOUNT is returned`() = runTest(dispatcher) {
        val storage = mock<AccountStorage>()
        whenever(storage.read()).thenReturn(null)

        assertEquals(
            ScopeStatus.Unavailable(Reason.NO_ACCOUNT),
            accessor(storage).containsScope(syncScope),
        )
    }

    @Test
    fun `WHEN reading the account throws THEN Unavailable READ_FAILURE carrying the cause is returned`() = runTest(dispatcher) {
        val boom = RuntimeException("boom")
        val storage = mock<AccountStorage>()
        whenever(storage.read()).thenThrow(boom)

        val status = accessor(storage).containsScope(syncScope)

        assertEquals(ScopeStatus.Unavailable(Reason.READ_FAILURE, boom), status)
    }

    @Test
    fun `WHEN the JSON has no refresh_token THEN Unavailable NO_REFRESH_TOKEN is returned`() = runTest(dispatcher) {
        val json = """{"session_token":"s"}"""

        assertEquals(
            ScopeStatus.Unavailable(Reason.NO_REFRESH_TOKEN),
            accessor(storageReturning(json)).containsScope(syncScope),
        )
    }

    @Test
    fun `WHEN the JSON is malformed THEN Unavailable PARSE_FAILURE carrying the cause is returned`() = runTest(dispatcher) {
        val json = """not valid json"""

        val status = accessor(storageReturning(json)).containsScope(syncScope)

        status as ScopeStatus.Unavailable
        assertEquals(Reason.PARSE_FAILURE, status.reason)
        assertIs<SerializationException>(status.cause)
    }
}
