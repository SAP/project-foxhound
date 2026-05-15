/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxrelay.eligibility.ext

import kotlinx.coroutines.test.runTest
import mozilla.components.concept.sync.AttachedClient
import mozilla.components.concept.sync.DeviceType
import mozilla.components.concept.sync.OAuthAccount
import mozilla.components.service.fxrelay.eligibility.ServiceClientId
import mozilla.components.support.test.mock
import mozilla.components.support.test.whenever
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class OAuthAccountRelayClientTest {

    @Test
    fun `GIVEN account with relay client using any client ID WHEN relayClient is called THEN returns the client`() = runTest {
        val relayClient = createAttachedClient(clientId = ServiceClientId.Production.id)
        val otherClient = createAttachedClient(clientId = "other-client-id")
        val account: OAuthAccount = mock()
        whenever(account.getAttachedClient()).thenReturn(listOf(otherClient, relayClient))

        val result = account.relayClient()

        assertEquals(relayClient, result)
    }

    @Test
    fun `GIVEN account with no relay client WHEN relayClient is called THEN returns null`() = runTest {
        val client1 = createAttachedClient(clientId = "some-client-id")
        val client2 = createAttachedClient(clientId = "another-client-id")
        val account: OAuthAccount = mock()
        whenever(account.getAttachedClient()).thenReturn(listOf(client1, client2))

        val result = account.relayClient()

        assertNull(result)
    }

    @Test
    fun `GIVEN account with no attached clients WHEN relayClient is called THEN returns null`() = runTest {
        val account: OAuthAccount = mock()
        whenever(account.getAttachedClient()).thenReturn(emptyList())

        val result = account.relayClient()

        assertNull(result)
    }

    @Test
    fun `GIVEN account with multiple relay clients WHEN relayClient is called THEN returns the first one`() = runTest {
        val relayClient1 = createAttachedClient(clientId = ServiceClientId.Stage.id)
        val relayClient2 = createAttachedClient(clientId = ServiceClientId.Dev.id)
        val otherClient = createAttachedClient(clientId = "other-client-id")
        val account: OAuthAccount = mock()
        whenever(account.getAttachedClient()).thenReturn(listOf(otherClient, relayClient1, relayClient2))

        val result = account.relayClient()

        assertEquals(relayClient1, result)
    }

    private fun createAttachedClient(
        clientId: String?,
        deviceId: String? = "device-id",
        deviceType: DeviceType = DeviceType.DESKTOP,
        isCurrentSession: Boolean = false,
        name: String? = "Test Client",
        createdTime: Long? = 1234567890L,
        lastAccessTime: Long? = 1234567890L,
        scope: List<String>? = null,
    ) = AttachedClient(
        clientId = clientId,
        deviceId = deviceId,
        deviceType = deviceType,
        isCurrentSession = isCurrentSession,
        name = name,
        createdTime = createdTime,
        lastAccessTime = lastAccessTime,
        scope = scope,
    )
}
