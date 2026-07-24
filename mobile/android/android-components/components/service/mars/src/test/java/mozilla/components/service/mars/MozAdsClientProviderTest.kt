/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.mars

import mozilla.appservices.adsclient.MozAdsClient
import mozilla.components.support.test.mock
import org.junit.After
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class MozAdsClientProviderTest {

    @After
    fun tearDown() {
        MozAdsClientProvider.reset()
    }

    @Test
    fun `GIVEN client is initialized WHEN requireInstance is called THEN an instance is returned`() {
        val client: MozAdsClient = mock()
        val clientField = MozAdsClientProvider::class.java.getDeclaredField("client")
        clientField.isAccessible = true
        clientField.set(MozAdsClientProvider, client)

        val adsClient = MozAdsClientProvider.requireInstance
        assertNotNull(adsClient)
    }

    @Test
    fun `GIVEN client is not initialized WHEN requireInstance is called THEN throw IllegalStateException`() {
        assertThrows(IllegalStateException::class.java) {
            MozAdsClientProvider.requireInstance
        }
    }

    @Test
    fun `GIVEN client is initialized WHEN reset is called THEN requireInstance throws IllegalStateException`() {
        val client: MozAdsClient = mock()
        val clientField = MozAdsClientProvider::class.java.getDeclaredField("client")
        clientField.isAccessible = true
        clientField.set(MozAdsClientProvider, client)

        MozAdsClientProvider.reset()

        assertThrows(IllegalStateException::class.java) {
            MozAdsClientProvider.requireInstance
        }
    }
}
