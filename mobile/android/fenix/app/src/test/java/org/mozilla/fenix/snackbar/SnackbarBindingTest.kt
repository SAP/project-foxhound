/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.snackbar

import android.content.Context
import android.view.View
import androidx.navigation.NavController
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.sync.TabData
import mozilla.components.feature.accounts.push.SendTabUseCases
import mozilla.components.feature.accounts.push.SendTabUseCases.SendToAllUseCase
import mozilla.components.feature.accounts.push.SendTabUseCases.SendToDeviceUseCase
import mozilla.components.support.test.any
import mozilla.components.support.test.argumentCaptor
import mozilla.components.support.test.eq
import mozilla.components.support.test.libstate.ext.waitUntilIdle
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import mozilla.components.support.test.rule.MainCoroutineRule
import mozilla.components.support.test.rule.runTestOnMain
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.never
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mozilla.fenix.R
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.FenixSnackbar
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.AppAction.BookmarkAction
import org.mozilla.fenix.components.appstate.AppAction.ShareAction
import org.mozilla.fenix.components.appstate.AppAction.SnackbarAction
import org.mozilla.fenix.components.appstate.AppAction.TranslationsAction
import org.mozilla.fenix.components.appstate.snackbar.SnackbarState

@RunWith(AndroidJUnit4::class)
class SnackbarBindingTest {
    @get:Rule
    val coroutineRule = MainCoroutineRule()

    private val appStore = AppStore()
    private val snackbarDelegate: FenixSnackbarDelegate = mock()
    private val navController: NavController = mock()

    @Test
    fun `GIVEN translation is in progress for the current selected session WHEN snackbar state is updated to translation in progress THEN display the snackbar`() = runTestOnMain {
        val sessionId = "sessionId"
        val tab = createTab(url = "https://www.mozilla.org", id = sessionId)
        val browserStore = BrowserStore(
            BrowserState(
                tabs = listOf(tab),
                selectedTabId = sessionId,
            ),
        )
        val binding = buildSnackbarBinding(
            browserStore = browserStore,
        )
        binding.start()

        appStore.dispatch(
            TranslationsAction.TranslationStarted(sessionId = sessionId),
        )
        waitForStoreToSettle()

        verify(snackbarDelegate).show(
            text = R.string.translation_in_progress_snackbar,
            duration = FenixSnackbar.LENGTH_INDEFINITE,
            isError = false,
        )

        assertEquals(SnackbarState.None, appStore.state.snackbarState)
    }

    @Test
    fun `GIVEN translation is in progress for a different session WHEN snackbar state is updated to translation in progress THEN do not display the snackbar`() = runTestOnMain {
        val tab1 = createTab(url = "https://www.mozilla.org", id = "1")
        val tab2 = createTab(url = "https://www.mozilla.org", id = "2")
        val browserStore = BrowserStore(
            BrowserState(
                tabs = listOf(tab1, tab2),
                selectedTabId = tab1.id,
            ),
        )
        val binding = buildSnackbarBinding(
            browserStore = browserStore,
        )
        binding.start()

        appStore.dispatch(
            TranslationsAction.TranslationStarted(sessionId = tab2.id),
        )
        waitForStoreToSettle()

        verify(snackbarDelegate, never()).show(
            text = R.string.translation_in_progress_snackbar,
            duration = FenixSnackbar.LENGTH_LONG,
            isError = false,
        )
    }

    @Test
    fun `WHEN the snackbar state is updated to dismiss THEN dismiss the snackbar`() = runTestOnMain {
        val binding = buildSnackbarBinding()
        binding.start()

        appStore.dispatch(SnackbarAction.SnackbarDismissed)
        waitForStoreToSettle()

        assertEquals(SnackbarState.None, appStore.state.snackbarState)
        verify(snackbarDelegate).dismiss()
    }

    @Test
    fun `GIVEN bookmark is added WHEN the bookmark added state action is dispatched THEN display the appropriate snackbar`() = runTestOnMain {
        val binding = buildSnackbarBinding()
        binding.start()

        appStore.dispatch(
            BookmarkAction.BookmarkAdded(guidToEdit = "1"),
        )
        waitForStoreToSettle()

        assertEquals(SnackbarState.None, appStore.state.snackbarState)

        verify(snackbarDelegate).show(
            text = eq(R.string.bookmark_saved_snackbar),
            duration = eq(FenixSnackbar.LENGTH_LONG),
            isError = eq(false),
            action = eq(R.string.edit_bookmark_snackbar_action),
            listener = any(),
        )
    }

    @Test
    fun `GIVEN no bookmark is added WHEN the bookmark added state action is dispatched THEN display the appropriate snackbar`() = runTestOnMain {
        val binding = buildSnackbarBinding()
        binding.start()

        appStore.dispatch(
            BookmarkAction.BookmarkAdded(guidToEdit = null),
        )
        waitForStoreToSettle()

        assertEquals(SnackbarState.None, appStore.state.snackbarState)
        verify(snackbarDelegate).show(
            text = R.string.bookmark_invalid_url_error,
            duration = FenixSnackbar.LENGTH_LONG,
            isError = false,
        )
    }

    @Test
    fun `WHEN the shortcut added state action is dispatched THEN display the appropriate snackbar`() = runTestOnMain {
        val binding = buildSnackbarBinding()
        binding.start()

        appStore.dispatch(
            AppAction.ShortcutAction.ShortcutAdded,
        )
        waitForStoreToSettle()

        assertEquals(SnackbarState.None, appStore.state.snackbarState)
        verify(snackbarDelegate).show(
            text = R.string.snackbar_added_to_shortcuts,
            duration = FenixSnackbar.LENGTH_LONG,
            isError = false,
        )
    }

    @Test
    fun `WHEN the shortcut removed state action is dispatched THEN display the appropriate snackbar`() = runTestOnMain {
        val binding = buildSnackbarBinding()
        binding.start()

        appStore.dispatch(
            AppAction.ShortcutAction.ShortcutRemoved,
        )
        waitForStoreToSettle()

        assertEquals(SnackbarState.None, appStore.state.snackbarState)
        verify(snackbarDelegate).show(
            text = R.string.snackbar_top_site_removed,
            duration = FenixSnackbar.LENGTH_LONG,
            isError = false,
        )
    }

    @Test
    fun `WHEN the delete and quit selected state action is dispatched THEN display the appropriate snackbar`() = runTestOnMain {
        val binding = buildSnackbarBinding()
        binding.start()

        appStore.dispatch(
            AppAction.DeleteAndQuitStarted,
        )
        waitForStoreToSettle()

        assertEquals(SnackbarState.None, appStore.state.snackbarState)
        verify(snackbarDelegate).show(
            text = R.string.deleting_browsing_data_in_progress,
            duration = FenixSnackbar.LENGTH_INDEFINITE,
            isError = false,
        )
    }

    @Test
    fun `WHEN the user has successfully signed in THEN display the appropriate snackbar`() = runTestOnMain {
        val binding = buildSnackbarBinding()
        binding.start()

        appStore.dispatch(
            AppAction.UserAccountAuthenticated,
        )
        waitForStoreToSettle()

        assertEquals(SnackbarState.None, appStore.state.snackbarState)
        verify(snackbarDelegate).show(
            text = R.string.sync_syncing_in_progress,
            duration = FenixSnackbar.LENGTH_SHORT,
        )
        assertEquals(SnackbarState.None, appStore.state.snackbarState)
    }

    @Test
    fun `WHEN share to app failed THEN display a snackbar`() {
        val binding = buildSnackbarBinding()
        binding.start()

        appStore.dispatch(ShareAction.ShareToAppFailed)
        waitForStoreToSettle()

        verify(snackbarDelegate).show(
            text = R.string.share_error_snackbar,
            duration = FenixSnackbar.LENGTH_LONG,
            isError = false,
        )
        assertEquals(SnackbarState.None, appStore.state.snackbarState)
    }

    @Test
    fun `WHEN sharing a tab was successful THEN display an appropriate snackbar`() {
        val destinations = listOf("a")
        val sharedTabs = listOf(mock<TabData>())
        val binding = buildSnackbarBinding()
        binding.start()

        appStore.dispatch(ShareAction.SharedTabsSuccessfully(destinations, sharedTabs))
        waitForStoreToSettle()

        verify(snackbarDelegate).show(
            text = R.string.sync_sent_tab_snackbar,
            duration = FenixSnackbar.LENGTH_SHORT,
            isError = false,
        )
        assertEquals(SnackbarState.None, appStore.state.snackbarState)
    }

    @Test
    fun `WHEN sharing multiple tabs was successful THEN display an appropriate snackbar`() {
        val destinations = listOf("a")
        val sharedTabs = listOf(mock<TabData>(), mock<TabData>())
        val binding = buildSnackbarBinding()
        binding.start()

        appStore.dispatch(ShareAction.SharedTabsSuccessfully(destinations, sharedTabs))
        waitForStoreToSettle()

        verify(snackbarDelegate).show(
            text = R.string.sync_sent_tabs_snackbar,
            duration = FenixSnackbar.LENGTH_SHORT,
            isError = false,
        )
        assertEquals(SnackbarState.None, appStore.state.snackbarState)
    }

    @Test
    fun `WHEN sharing tabs failed THEN show a snackbar`() {
        val destinations = listOf("a")
        val sharedTabs = listOf(mock<TabData>())
        val binding = buildSnackbarBinding()
        binding.start()

        appStore.dispatch(ShareAction.ShareTabsFailed(destinations, sharedTabs))
        waitForStoreToSettle()

        verify(snackbarDelegate).show(
            text = eq(R.string.sync_sent_tab_error_snackbar),
            duration = eq(FenixSnackbar.LENGTH_LONG),
            isError = eq(true),
            action = eq(R.string.sync_sent_tab_error_snackbar_action),
            listener = any(),
        )
        assertEquals(SnackbarState.None, appStore.state.snackbarState)
    }

    @Test
    fun `GIVEN sharing tabs to another device failed and user chose to retry WHEN this succeeds THEN show a snackbar`() = runTestOnMain {
        val destinations = listOf("a")
        val sharedTabs = listOf(mock<TabData>())
        val retryActionCaptor = argumentCaptor<((v: View) -> Unit)>()
        val sendTabUseCases: SendTabUseCases = mock()
        val sendToDeviceUseCase: SendToDeviceUseCase = mock()
        doReturn(sendToDeviceUseCase).`when`(sendTabUseCases).sendToDeviceAsync
        val retryResult = CompletableDeferred(true)
        doReturn(retryResult).`when`(sendToDeviceUseCase).invoke(any(), any<List<TabData>>())
        val binding = buildSnackbarBinding(
            sendTabUseCases = sendTabUseCases,
            ioDispatcher = coroutineRule.testDispatcher,
        )
        binding.start()

        appStore.dispatch(ShareAction.ShareTabsFailed(destinations, sharedTabs))
        waitForStoreToSettle()

        verify(snackbarDelegate).show(
            text = eq(R.string.sync_sent_tab_error_snackbar),
            duration = eq(FenixSnackbar.LENGTH_LONG),
            isError = eq(true),
            action = eq(R.string.sync_sent_tab_error_snackbar_action),
            listener = retryActionCaptor.capture(),
        )

        retryActionCaptor.value.invoke(mock())
        waitForStoreToSettle()

        verify(snackbarDelegate).show(
            text = R.string.sync_sent_tab_snackbar,
            duration = FenixSnackbar.LENGTH_SHORT,
            isError = false,
        )
        assertEquals(SnackbarState.None, appStore.state.snackbarState)
    }

    @Test
    fun `GIVEN sharing tabs to other devices failed and user chose to retry WHEN this fails again THEN show a snackbar`() = runTestOnMain {
        val destinations = listOf("a", "b")
        val sharedTabs = listOf(mock<TabData>())
        val retryActionCaptor = argumentCaptor<((v: View) -> Unit)>()
        val sendTabUseCases: SendTabUseCases = mock()
        val sendToAllDevicesUseCase: SendToAllUseCase = mock()
        doReturn(sendToAllDevicesUseCase).`when`(sendTabUseCases).sendToAllAsync
        val retryResult = CompletableDeferred(false)
        doReturn(retryResult).`when`(sendToAllDevicesUseCase).invoke(any<List<TabData>>())
        val binding = buildSnackbarBinding(
            sendTabUseCases = sendTabUseCases,
            ioDispatcher = coroutineRule.testDispatcher,
        )
        binding.start()

        appStore.dispatch(ShareAction.ShareTabsFailed(destinations, sharedTabs))
        waitForStoreToSettle()

        verify(snackbarDelegate).show(
            text = eq(R.string.sync_sent_tab_error_snackbar),
            duration = eq(FenixSnackbar.LENGTH_LONG),
            isError = eq(true),
            action = eq(R.string.sync_sent_tab_error_snackbar_action),
            listener = retryActionCaptor.capture(),
        )

        retryActionCaptor.value.invoke(mock())
        waitForStoreToSettle()

        verify(snackbarDelegate, times(2)).show(
            text = eq(R.string.sync_sent_tab_error_snackbar),
            duration = eq(FenixSnackbar.LENGTH_LONG),
            isError = eq(true),
            action = eq(R.string.sync_sent_tab_error_snackbar_action),
            listener = any(),
        )
        assertEquals(SnackbarState.None, appStore.state.snackbarState)
    }

    fun `WHEN a link is copied to clipboard THEN display a snackbar`() {
        val binding = buildSnackbarBinding()
        binding.start()

        appStore.dispatch(ShareAction.CopyLinkToClipboard)
        waitForStoreToSettle()

        verify(snackbarDelegate).show(
            text = eq(R.string.toast_copy_link_to_clipboard),
        )
        assertEquals(SnackbarState.None, appStore.state.snackbarState)
    }

    private fun buildSnackbarBinding(
        context: Context = testContext,
        browserStore: BrowserStore = mock(),
        appStore: AppStore = this.appStore,
        snackbarDelegate: FenixSnackbarDelegate = this.snackbarDelegate,
        navController: NavController = this.navController,
        sendTabUseCases: SendTabUseCases? = null,
        customTabSessionId: String? = null,
        ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
    ) = SnackbarBinding(
        context = context,
        browserStore = browserStore,
        appStore = appStore,
        snackbarDelegate = snackbarDelegate,
        navController = navController,
        sendTabUseCases = sendTabUseCases,
        customTabSessionId = customTabSessionId,
        ioDispatcher = ioDispatcher,
    )

    private fun waitForStoreToSettle() {
        // Wait for the trigger action to be handled,
        appStore.waitUntilIdle()
        // Wait for SnackbarAction.SnackbarShown to be dispatched
        appStore.waitUntilIdle()
    }
}
