/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.bindings

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.state.createTab
import mozilla.components.support.test.ext.joinBlocking
import org.junit.Test
import org.mockito.Mockito.spy
import org.mockito.Mockito.verify
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.tabstray.InactiveTabsBinding
import org.mozilla.fenix.tabstray.TabsTrayAction
import org.mozilla.fenix.tabstray.TabsTrayState
import org.mozilla.fenix.tabstray.TabsTrayStore

@OptIn(ExperimentalCoroutinesApi::class)
class InactiveTabsBindingTest {

    private val testDispatcher = StandardTestDispatcher()
    lateinit var tabsTrayStore: TabsTrayStore
    lateinit var appStore: AppStore

    private val tabId1 = "1"
    private val tab1 = createTab(url = tabId1, id = tabId1)

    @Test
    fun `WHEN inactiveTabsExpanded changes THEN tabs tray action dispatched with update`() = runTest(testDispatcher) {
        appStore = AppStore(
            AppState(
                inactiveTabsExpanded = false,
            ),
        )
        tabsTrayStore = spy(
            TabsTrayStore(
                TabsTrayState(
                    inactiveTabs = listOf(tab1),
                    inactiveTabsExpanded = false,
                ),
            ),
        )

        val binding = InactiveTabsBinding(
            appStore = appStore,
            tabsTrayStore = tabsTrayStore,
            mainDispatcher = testDispatcher,
        )
        binding.start()
        appStore.dispatch(AppAction.UpdateInactiveExpanded(true))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(tabsTrayStore).dispatch(TabsTrayAction.UpdateInactiveExpanded(true))
    }
}
