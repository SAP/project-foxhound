/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.privatemode.notification

import android.app.Notification
import android.app.NotificationManager
import android.app.Service
import android.content.ComponentName
import android.content.Intent
import android.content.SharedPreferences
import androidx.core.app.NotificationCompat
import androidx.core.content.getSystemService
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.LocaleAction
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.feature.privatemode.notification.AbstractPrivateNotificationService.Companion.ACTION_ERASE
import mozilla.components.feature.privatemode.notification.AbstractPrivateNotificationService.Companion.defaultIgnoreTaskActions
import mozilla.components.support.base.android.NotificationsDelegate
import mozilla.components.support.test.argumentCaptor
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import mozilla.components.support.test.whenever
import mozilla.components.support.utils.ext.stopForegroundCompat
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.anyInt
import org.mockito.ArgumentMatchers.anyLong
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito
import org.mockito.Mockito.never
import org.mockito.Mockito.spy
import org.mockito.Mockito.verify
import java.util.Locale

@RunWith(AndroidJUnit4::class)
class AbstractPrivateNotificationServiceTest {
    private lateinit var preferences: SharedPreferences
    private lateinit var notificationManager: NotificationManager

    private val captureActionsMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()
    internal val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        preferences = mock()
        notificationManager = mock()
        val editor = mock<SharedPreferences.Editor>()

        whenever(preferences.edit()).thenReturn(editor)
        whenever(editor.putLong(anyString(), anyLong())).thenReturn(editor)
    }

    @Test
    fun `WHEN the service is created THEN start foreground is called`() = runTest(testDispatcher) {
        val service = spy(
            object : MockServiceWithStore(
                testDispatcher,
                scope = this@runTest,
                captureActionsMiddleware,
            ) {
                override fun NotificationCompat.Builder.buildNotification() {
                    setCategory(Notification.CATEGORY_STATUS)
                }
                override fun notifyLocaleChanged() {
                    // NOOP
                }
            },
        )
        attachContext(service)

        val notification = argumentCaptor<Notification>()
        service.onCreate()
        testDispatcher.scheduler.advanceUntilIdle()

        verify(service).startForeground(anyInt(), notification.capture())
        assertEquals(Notification.CATEGORY_STATUS, notification.value.category)
    }

    @Test
    fun `GIVEN an erase intent is received THEN remove all private tabs`() = runTest(testDispatcher) {
        val service = MockServiceWithStore(
            testDispatcher,
            this,
            captureActionsMiddleware = captureActionsMiddleware,
        )
        val result = service.onStartCommand(Intent(ACTION_ERASE), 0, 0)

        captureActionsMiddleware.findFirstAction(TabListAction.RemoveAllPrivateTabsAction::class)
        assertEquals(Service.START_NOT_STICKY, result)
    }

    @Test
    fun `WHEN task is removed THEN all private tabs are removed`() = runTest(testDispatcher) {
        val service = spy(
            MockServiceWithStore(
                testDispatcher,
                this,
                captureActionsMiddleware = captureActionsMiddleware,
            ),
        )
        service.onTaskRemoved(mock())

        captureActionsMiddleware.findFirstAction(TabListAction.RemoveAllPrivateTabsAction::class)

        verify(service).stopForegroundCompat(true)
        verify(service).stopSelf()
    }

    @Test
    fun `WHEN task is removed with ignored intents THEN do nothing`() = runTest(testDispatcher) {
        val service = spy(
            MockServiceWithStore(
                testDispatcher,
                this,
                captureActionsMiddleware = captureActionsMiddleware,
            ),
        )

        val mockTaskActions = listOf("action1", "action2")
        whenever(service.ignoreTaskActions()).then { mockTaskActions }

        (mockTaskActions + defaultIgnoreTaskActions).forEach { it ->
            service.onTaskRemoved(Intent(it))

            captureActionsMiddleware.assertNotDispatched(TabListAction.RemoveAllPrivateTabsAction::class)
            verify(service, never()).stopForegroundCompat(true)
            verify(service, never()).stopSelf()
        }

        val mockTaskCompoentClasses = listOf(
            "org.mozilla.fenix.IntentReceiverActivity",
            "org.mozilla.fenix.customtabs.ExternalAppBrowserActivity",
            "comp1",
            "comp2",
        )
        whenever(service.ignoreTaskComponentClasses()).then { mockTaskCompoentClasses }

        mockTaskCompoentClasses.forEach { it ->
            service.onTaskRemoved(Intent().setComponent(ComponentName(testContext, it)))

            captureActionsMiddleware.assertNotDispatched(TabListAction.RemoveAllPrivateTabsAction::class)
            verify(service, never()).stopForegroundCompat(true)
            verify(service, never()).stopSelf()
        }
    }

    @Test
    fun `WHEN a locale change is made in the browser store THEN the service should notify`() = runTest(testDispatcher) {
        val service = spy(
            MockServiceWithStore(
                testDispatcher,
                this,
                captureActionsMiddleware = captureActionsMiddleware,
            ),
        )
        attachContext(service)
        service.onCreate()
        testDispatcher.scheduler.advanceUntilIdle()

        val mockLocale = Locale.forLanguageTag("French")
        service.store.dispatch(LocaleAction.UpdateLocaleAction(mockLocale))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(service).notifyLocaleChanged()
    }

    private open class MockServiceWithStore(
        testDispatcher: CoroutineDispatcher,
        scope: CoroutineScope,
        captureActionsMiddleware: CaptureActionsMiddleware<BrowserState, BrowserAction>,
    ) :
        AbstractPrivateNotificationService(testDispatcher, scope) {
        override val store = BrowserStore(
            initialState = BrowserState(),
            middleware = listOf(captureActionsMiddleware),
        )
        override val notificationsDelegate: NotificationsDelegate = mock()

        override fun NotificationCompat.Builder.buildNotification() = Unit
        override fun notifyLocaleChanged() {
            // NOOP
        }

        override fun ignoreTaskActions(): List<String> = mock()
        override fun ignoreTaskComponentClasses(): List<String> = mock()
    }

    private fun attachContext(service: Service) {
        Mockito.doReturn(preferences).`when`(service).getSharedPreferences(anyString(), anyInt())
        Mockito.doReturn(notificationManager).`when`(service).getSystemService<NotificationManager>()
        Mockito.doReturn("").`when`(service).getString(anyInt())
        Mockito.doReturn("").`when`(service).packageName
        Mockito.doReturn(testContext.resources).`when`(service).resources
        Mockito.doReturn(testContext.applicationInfo).`when`(service).applicationInfo
    }
}
