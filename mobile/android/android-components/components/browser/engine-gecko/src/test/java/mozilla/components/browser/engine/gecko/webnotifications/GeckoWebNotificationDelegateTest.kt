/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.engine.gecko.webnotifications

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.concept.engine.webnotifications.WebNotification
import mozilla.components.concept.engine.webnotifications.WebNotificationDelegate
import mozilla.components.support.test.any
import mozilla.components.support.test.argumentCaptor
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.mozilla.geckoview.WebNotification as GeckoViewWebNotification
import org.mozilla.geckoview.WebNotificationAction as GeckoViewWebNotificationAction

class GeckoWebNotificationDelegateTest {

    private val testDispatcher = StandardTestDispatcher()

    private val webNotificationDelegate: WebNotificationDelegate = mock()

    @Before
    fun setup() {
        `when`(webNotificationDelegate.onShowNotification(any())).thenReturn(CompletableDeferred(true))
    }

    @Test
    fun `onShowNotification is forwarded to delegate`() = runTest(testDispatcher) {
        val geckoViewWebNotification: GeckoViewWebNotification = mockWebNotification(
            title = "title",
            tag = "tag",
            text = "text",
            imageUrl = "imageUrl",
            textDirection = "textDirection",
            lang = "lang",
            requireInteraction = true,
            source = "source",
            privateBrowsing = true,
            actions = arrayOf(GeckoViewWebNotificationAction("foo", "bar")),
        )
        val geckoWebNotificationDelegate = GeckoWebNotificationDelegate(webNotificationDelegate, testDispatcher)

        val notificationCaptor = argumentCaptor<WebNotification>()
        geckoWebNotificationDelegate.onShowNotification(geckoViewWebNotification)

        // (verify will only return null even though the return type is Deferred)
        @Suppress("UNUSED_VARIABLE")
        val result = verify(webNotificationDelegate).onShowNotification(
            notificationCaptor.capture(),
        )

        val notification = notificationCaptor.value
        assertEquals(notification.title, geckoViewWebNotification.title)
        assertEquals(notification.tag, geckoViewWebNotification.tag)
        assertEquals(notification.body, geckoViewWebNotification.text)
        assertEquals(notification.sourceUrl, geckoViewWebNotification.source)
        assertEquals(notification.iconUrl, geckoViewWebNotification.imageUrl)
        assertEquals(notification.direction, geckoViewWebNotification.textDirection)
        assertEquals(notification.lang, geckoViewWebNotification.lang)
        assertEquals(notification.requireInteraction, geckoViewWebNotification.requireInteraction)
        assertFalse(notification.triggeredByWebExtension)
        assertTrue(notification.privateBrowsing)
        assertEquals(notification.actions[0].name, geckoViewWebNotification.actions[0].name)
        assertEquals(notification.actions[0].title, geckoViewWebNotification.actions[0].title)
    }

    @Test
    fun `onCloseNotification is forwarded to delegate`() = runTest(testDispatcher) {
        val geckoViewWebNotification: GeckoViewWebNotification = mockWebNotification(
            title = "title",
            tag = "tag",
            text = "text",
            imageUrl = "imageUrl",
            textDirection = "textDirection",
            lang = "lang",
            requireInteraction = true,
            source = "source",
            privateBrowsing = false,
            actions = arrayOf(GeckoViewWebNotificationAction("foo", "bar")),
        )
        val geckoWebNotificationDelegate = GeckoWebNotificationDelegate(webNotificationDelegate, testDispatcher)

        val notificationCaptor = argumentCaptor<WebNotification>()
        geckoWebNotificationDelegate.onCloseNotification(geckoViewWebNotification)
        verify(webNotificationDelegate).onCloseNotification(notificationCaptor.capture())

        val notification = notificationCaptor.value
        assertEquals(notification.title, geckoViewWebNotification.title)
        assertEquals(notification.tag, geckoViewWebNotification.tag)
        assertEquals(notification.body, geckoViewWebNotification.text)
        assertEquals(notification.sourceUrl, geckoViewWebNotification.source)
        assertEquals(notification.iconUrl, geckoViewWebNotification.imageUrl)
        assertEquals(notification.direction, geckoViewWebNotification.textDirection)
        assertEquals(notification.lang, geckoViewWebNotification.lang)
        assertEquals(notification.requireInteraction, geckoViewWebNotification.requireInteraction)
        assertEquals(notification.privateBrowsing, geckoViewWebNotification.privateBrowsing)
        assertEquals(notification.actions[0].name, geckoViewWebNotification.actions[0].name)
        assertEquals(notification.actions[0].title, geckoViewWebNotification.actions[0].title)
    }

    @Test
    fun `notification without a source are from web extensions`() = runTest(testDispatcher) {
        val geckoViewWebNotification: GeckoViewWebNotification = mockWebNotification(
            title = "title",
            tag = "tag",
            text = "text",
            imageUrl = "imageUrl",
            textDirection = "textDirection",
            lang = "lang",
            requireInteraction = true,
            source = null,
            privateBrowsing = true,
            actions = arrayOf(GeckoViewWebNotificationAction("foo", "bar")),
        )
        val geckoWebNotificationDelegate = GeckoWebNotificationDelegate(webNotificationDelegate, testDispatcher)

        val notificationCaptor = argumentCaptor<WebNotification>()
        geckoWebNotificationDelegate.onShowNotification(geckoViewWebNotification)

        // (verify will only return null even though the return type is Deferred)
        @Suppress("UNUSED_VARIABLE")
        val result = verify(webNotificationDelegate).onShowNotification(
            notificationCaptor.capture(),
        )

        val notification = notificationCaptor.value
        assertEquals(notification.title, geckoViewWebNotification.title)
        assertEquals(notification.tag, geckoViewWebNotification.tag)
        assertEquals(notification.body, geckoViewWebNotification.text)
        assertEquals(notification.sourceUrl, geckoViewWebNotification.source)
        assertEquals(notification.iconUrl, geckoViewWebNotification.imageUrl)
        assertEquals(notification.direction, geckoViewWebNotification.textDirection)
        assertEquals(notification.lang, geckoViewWebNotification.lang)
        assertEquals(notification.requireInteraction, geckoViewWebNotification.requireInteraction)
        assertTrue(notification.triggeredByWebExtension)
        assertTrue(notification.privateBrowsing)
        assertEquals(notification.actions[0].name, geckoViewWebNotification.actions[0].name)
        assertEquals(notification.actions[0].title, geckoViewWebNotification.actions[0].title)
    }
}
