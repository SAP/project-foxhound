/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.bindings

import io.mockk.spyk
import io.mockk.verify
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.state.createTab
import org.junit.Test
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.tabstray.InactiveTabsBinding
import org.mozilla.fenix.tabstray.redux.action.TabsTrayAction
import org.mozilla.fenix.tabstray.redux.state.TabsTrayState
import org.mozilla.fenix.tabstray.redux.store.TabsTrayStore

class InactiveTabsBindingTest {

    private val testDispatcher = StandardTestDispatcher()
    lateinit var tabsTrayStore: TabsTrayStore
    lateinit var appStore: AppStore

    @Test
    fun `WHEN inactiveTabsExpanded changes THEN tabs tray action dispatched with update`() = runTest(testDispatcher) {
        appStore = AppStore(
            AppState(
                inactiveTabsExpanded = false,
            ),
        )
        tabsTrayStore = spyk(
            TabsTrayStore(
                TabsTrayState(
                    inactiveTabs = TabsTrayState.InactiveTabsState(
                        isExpanded = false,
                    ),
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

        verify { tabsTrayStore.dispatch(TabsTrayAction.UpdateInactiveExpanded(true)) }
    }
}
