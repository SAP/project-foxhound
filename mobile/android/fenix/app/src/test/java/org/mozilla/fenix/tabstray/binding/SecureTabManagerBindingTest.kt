/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.binding

import android.view.Window
import android.view.WindowManager
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import org.mozilla.fenix.tabstray.Page
import org.mozilla.fenix.tabstray.TabsTrayAction
import org.mozilla.fenix.tabstray.TabsTrayState
import org.mozilla.fenix.tabstray.TabsTrayStore
import org.mozilla.fenix.utils.Settings

class SecureTabManagerBindingTest {

    private val testDispatcher = StandardTestDispatcher()

    private val window: Window = mockk(relaxed = true)
    private val settings: Settings = mockk(relaxed = true)

    private lateinit var secureTabManagerBinding: SecureTabManagerBinding
    private lateinit var tabsTrayStore: TabsTrayStore

    @Before
    fun setup() {
        tabsTrayStore = TabsTrayStore(TabsTrayState())

        secureTabManagerBinding = SecureTabManagerBinding(
            store = tabsTrayStore,
            settings = settings,
            window = window,
            mainDispatcher = testDispatcher,
        )
    }

    @Test
    fun `WHEN tab selected page switches to private THEN set window to secure`() = runTest(testDispatcher) {
        every { settings.shouldSecureModeBeOverridden } returns false
        every { settings.lastKnownMode.isPrivate } returns false

        secureTabManagerBinding.start()
        testDispatcher.scheduler.advanceUntilIdle()

        tabsTrayStore.dispatch(TabsTrayAction.PageSelected(Page.PrivateTabs))
        testDispatcher.scheduler.advanceUntilIdle()

        verify { window.addFlags(WindowManager.LayoutParams.FLAG_SECURE) }
    }

    @Test
    fun `WHEN tab selected page switches to private and allowScreenshotsInPrivateMode true THEN set window to un-secure`() = runTest(testDispatcher) {
        every { settings.shouldSecureModeBeOverridden } returns true
        every { settings.lastKnownMode.isPrivate } returns false

        secureTabManagerBinding.start()
        testDispatcher.scheduler.advanceUntilIdle()

        tabsTrayStore.dispatch(TabsTrayAction.PageSelected(Page.PrivateTabs))
        testDispatcher.scheduler.advanceUntilIdle()

        verify { window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE) }
    }

    @Test
    fun `WHEN tab selected page switches to private and allowScreenshotsInPrivateMode false and shouldSecureModeBeOverridden true THEN set window to un-secure`() = runTest(testDispatcher) {
        every { settings.shouldSecureModeBeOverridden } returns true
        every { settings.lastKnownMode.isPrivate } returns false

        secureTabManagerBinding.start()
        testDispatcher.scheduler.advanceUntilIdle()

        tabsTrayStore.dispatch(TabsTrayAction.PageSelected(Page.PrivateTabs))
        testDispatcher.scheduler.advanceUntilIdle()

        verify { window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE) }
    }

    @Test
    fun `GIVEN not in private mode WHEN tab selected page switches to normal tabs from private THEN set window to un-secure`() = runTest(testDispatcher) {
        every { settings.lastKnownMode.isPrivate } returns false

        secureTabManagerBinding.start()
        testDispatcher.scheduler.advanceUntilIdle()

        tabsTrayStore.dispatch(TabsTrayAction.PageSelected(Page.NormalTabs))
        testDispatcher.scheduler.advanceUntilIdle()

        verify { window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE) }
    }

    @Test
    fun `GIVEN private mode WHEN tab selected page switches to normal tabs from private THEN do nothing`() = runTest(testDispatcher) {
        every { settings.lastKnownMode.isPrivate } returns true

        secureTabManagerBinding.start()
        testDispatcher.scheduler.advanceUntilIdle()

        tabsTrayStore.dispatch(TabsTrayAction.PageSelected(Page.NormalTabs))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(exactly = 0) { window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE) }
    }

    @Test
    fun `GIVEN in Normal browsing mode WHEN fragment is stopped THEN set window to un-secure`() = runTest(testDispatcher) {
        every { settings.lastKnownMode.isPrivate } returns false

        secureTabManagerBinding.start()
        testDispatcher.scheduler.advanceUntilIdle()

        tabsTrayStore.dispatch(TabsTrayAction.PageSelected(Page.NormalTabs))
        testDispatcher.scheduler.advanceUntilIdle()

        secureTabManagerBinding.stop()
        testDispatcher.scheduler.advanceUntilIdle()

        verify { window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE) }
    }
}
