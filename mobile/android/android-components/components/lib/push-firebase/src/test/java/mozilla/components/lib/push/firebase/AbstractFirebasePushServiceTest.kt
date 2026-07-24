/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.push.firebase

import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.concept.push.PushProcessor
import mozilla.components.support.test.any
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.never
import org.mockito.Mockito.reset
import org.mockito.Mockito.spy
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoInteractions
import org.mockito.Mockito.`when`
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AbstractFirebasePushServiceTest {

    private val processor: PushProcessor = mock()
    private val service = TestService()

    private val mockMessaging: FirebaseMessaging = mock()

    @Before
    fun setup() {
        reset(processor)
        PushProcessor.install(processor)
        `when`(mockMessaging.deleteToken()).thenReturn(mock())
    }

    @Test
    fun `onNewToken passes token to processor`() {
        service.onNewToken("token")

        verify(processor).onNewToken("token")
    }

    @Test
    fun `new encrypted messages are passed to the processor`() {
        val remoteMessage: RemoteMessage = mock()
        val data = mapOf(
            "chid" to "1234",
            "body" to "contents",
            "con" to "encoding",
            "enc" to "salt",
            "cryptokey" to "dh256",
        )
        `when`(remoteMessage.data).thenReturn(data)
        service.onMessageReceived(remoteMessage)

        verify(processor).onMessageReceived(data)
    }

    @Test
    fun `malformed message exception should not be thrown`() {
        val remoteMessage: RemoteMessage = mock()
        val data = mapOf(
            "chid" to "1234",
        )
        `when`(remoteMessage.data).thenReturn(data)
        service.onMessageReceived(remoteMessage)

        verify(processor, never()).onError(any())
        verify(processor).onMessageReceived(data)
    }

    @Test
    fun `do nothing if the message is not for us`() {
        val remoteMessage: RemoteMessage = mock()
        val data = mapOf(
            "con" to "encoding",
            "enc" to "salt",
            "cryptokey" to "dh256",
        )
        `when`(remoteMessage.data).thenReturn(data)

        service.onMessageReceived(remoteMessage)

        verifyNoInteractions(processor)
    }

    @Test
    fun `service is initialized with correct default background dispatcher`() = runTest {
        val backgroundService = object : AbstractFirebasePushService() {
            override fun getFirebaseMessaging(): FirebaseMessaging {
                return mockMessaging
            }
        }
        assertNotNull("Dispatcher should be present", backgroundService.coroutineContext)

        assertFalse(
            "Default dispatcher should not be a Main dispatcher",
            backgroundService.coroutineContext is kotlinx.coroutines.MainCoroutineDispatcher,
        )
    }

    @Test
    fun `service is initialized with correct background dispatcher`() = runTest {
        val testDispatcher = StandardTestDispatcher()

        val backgroundService = object : AbstractFirebasePushService(testDispatcher) {
            override fun getFirebaseMessaging(): FirebaseMessaging {
                return mockMessaging
            }
        }

        assertTrue(
            "Service context should use the provided dispatcher",
            backgroundService.coroutineContext == testDispatcher,
        )

        backgroundService.deleteToken()

        verify(mockMessaging, never()).deleteToken()

        testDispatcher.scheduler.advanceUntilIdle()

        verify(mockMessaging).deleteToken()
    }

    @Test
    fun `service available reflects Google Play Services' availability`() {
        val service = spy(TestService())

        // By default, service is unavailable.
        assertFalse(service.isServiceAvailable(testContext))

        val googleApiAvailability = mock<GoogleApiAvailability>()
        `when`(service.googleApiAvailability).thenReturn(googleApiAvailability)
        `when`(googleApiAvailability.isGooglePlayServicesAvailable(testContext)).thenReturn(ConnectionResult.SUCCESS)

        assertTrue(service.isServiceAvailable(testContext))
    }

    class TestService : AbstractFirebasePushService()
}
