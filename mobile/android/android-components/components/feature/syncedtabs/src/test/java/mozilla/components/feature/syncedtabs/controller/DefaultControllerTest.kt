/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.syncedtabs.controller

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.storage.sync.SyncedDeviceTabs
import mozilla.components.concept.sync.ConstellationState
import mozilla.components.concept.sync.DeviceConstellation
import mozilla.components.concept.sync.OAuthAccount
import mozilla.components.feature.syncedtabs.storage.SyncedTabsStorage
import mozilla.components.feature.syncedtabs.view.SyncedTabsView
import mozilla.components.feature.syncedtabs.view.SyncedTabsView.ErrorType
import mozilla.components.service.fxa.SyncEngine
import mozilla.components.service.fxa.manager.FxaAccountManager
import mozilla.components.service.fxa.sync.SyncReason
import mozilla.components.support.test.mock
import org.junit.Test
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoMoreInteractions
import org.mockito.Mockito.`when`

class DefaultControllerTest {
    private val storage: SyncedTabsStorage = mock()
    private val accountManager: FxaAccountManager = mock()
    private val view: SyncedTabsView = mock()
    private val testDispatcher = StandardTestDispatcher()

    @Test
    fun `update view only when no account available`() = runTest(testDispatcher) {
        val controller = DefaultController(
            storage,
            accountManager,
            view,
            coroutineContext,
            testDispatcher,
        )

        controller.refreshSyncedTabs()
        testDispatcher.scheduler.advanceUntilIdle()

        verify(view).stopLoading()

        verifyNoMoreInteractions(view)
    }

    @Test
    fun `notify if there are no other devices synced`() = runTest(testDispatcher) {
        val controller = DefaultController(
            storage,
            accountManager,
            view,
            coroutineContext,
            testDispatcher,
        )

        val account: OAuthAccount = mock()
        val constellation: DeviceConstellation = mock()
        val state: ConstellationState = mock()

        `when`(accountManager.authenticatedAccount()).thenReturn(account)
        `when`(account.deviceConstellation()).thenReturn(constellation)
        `when`(constellation.state()).thenReturn(state)
        `when`(state.otherDevices).thenReturn(emptyList())

        `when`(storage.getSyncedDeviceTabs()).thenReturn(emptyList())

        controller.refreshSyncedTabs()
        testDispatcher.scheduler.advanceUntilIdle()

        verify(view).onError(ErrorType.MULTIPLE_DEVICES_UNAVAILABLE)
    }

    @Test
    fun `notify if there are no tabs from other devices to sync`() = runTest(testDispatcher) {
        val controller = DefaultController(
            storage,
            accountManager,
            view,
            coroutineContext,
            testDispatcher,
        )
        val account: OAuthAccount = mock()
        val constellation: DeviceConstellation = mock()
        val state: ConstellationState = mock()

        `when`(accountManager.authenticatedAccount()).thenReturn(account)
        `when`(account.deviceConstellation()).thenReturn(constellation)
        `when`(constellation.state()).thenReturn(state)
        `when`(state.otherDevices).thenReturn(listOf(mock()))

        `when`(storage.getSyncedDeviceTabs()).thenReturn(emptyList())

        controller.refreshSyncedTabs()
        testDispatcher.scheduler.advanceUntilIdle()

        verify(view, never()).onError(ErrorType.MULTIPLE_DEVICES_UNAVAILABLE)
        verify(view).onError(ErrorType.NO_TABS_AVAILABLE)
    }

    @Test
    fun `display synced tabs`() = runTest(testDispatcher) {
        val controller = DefaultController(
            storage,
            accountManager,
            view,
            coroutineContext,
            testDispatcher,
        )

        val account: OAuthAccount = mock()
        val constellation: DeviceConstellation = mock()
        val state: ConstellationState = mock()
        val syncedDeviceTabs = SyncedDeviceTabs(mock(), listOf(mock()))
        val listOfSyncedDeviceTabs = listOf(syncedDeviceTabs)

        `when`(accountManager.authenticatedAccount()).thenReturn(account)
        `when`(account.deviceConstellation()).thenReturn(constellation)
        `when`(constellation.state()).thenReturn(state)
        `when`(state.otherDevices).thenReturn(listOf(mock()))

        `when`(storage.getSyncedDeviceTabs()).thenReturn(listOfSyncedDeviceTabs)

        controller.refreshSyncedTabs()
        testDispatcher.scheduler.advanceUntilIdle()

        verify(view, never()).onError(ErrorType.MULTIPLE_DEVICES_UNAVAILABLE)
        verify(view, never()).onError(ErrorType.NO_TABS_AVAILABLE)
        verify(view).displaySyncedTabs(listOfSyncedDeviceTabs)
    }

    @Test
    fun `WHEN syncAccount is called THEN view is loading, devices are refreshed, and sync started`() = runTest(testDispatcher) {
        val controller = DefaultController(
            storage,
            accountManager,
            view,
            coroutineContext,
            testDispatcher,
        )

        val account: OAuthAccount = mock()
        val constellation: DeviceConstellation = mock()

        `when`(accountManager.authenticatedAccount()).thenReturn(account)
        `when`(account.deviceConstellation()).thenReturn(constellation)
        `when`(constellation.refreshDevices()).thenReturn(true)

        controller.syncAccount()
        testDispatcher.scheduler.advanceUntilIdle()

        verify(view).startLoading()
        verify(constellation).refreshDevices()
        verify(accountManager).syncNow(SyncReason.User, true, listOf(SyncEngine.Tabs))
    }
}
