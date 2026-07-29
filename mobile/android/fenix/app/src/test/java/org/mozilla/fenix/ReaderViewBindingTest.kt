/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix

import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.mozilla.fenix.browser.readermode.ReaderModeController
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction.ReaderViewAction
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.components.appstate.readerview.ReaderViewState

class ReaderViewBindingTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var readerModeController: ReaderModeController

    @Before
    fun setUp() {
        readerModeController = mockk(relaxUnitFun = true)
    }

    @Test
    fun `WHEN the reader view state is active THEN show reader view`() = runTest(testDispatcher) {
        val appStore = AppStore()
        val binding = ReaderViewBinding(
            appStore = appStore,
            readerMenuController = readerModeController,
            mainDispatcher = testDispatcher,
        )

        binding.start()

        appStore.dispatch(ReaderViewAction.ReaderViewStarted)

        testDispatcher.scheduler.advanceUntilIdle()

        verify { readerModeController.showReaderView() }

        assertEquals(ReaderViewState.None, appStore.state.readerViewState)
    }

    @Test
    fun `WHEN the reader view state is dismiss THEN hide reader view`() = runTest(testDispatcher) {
        val appStore = AppStore(
            initialState = AppState(),
        )
        val binding = ReaderViewBinding(
            appStore = appStore,
            readerMenuController = readerModeController,
            mainDispatcher = testDispatcher,
        )

        binding.start()

        appStore.dispatch(ReaderViewAction.ReaderViewDismissed)

        testDispatcher.scheduler.advanceUntilIdle()

        verify { readerModeController.hideReaderView() }

        assertEquals(ReaderViewState.None, appStore.state.readerViewState)
    }

    @Test
    fun `WHEN the reader view state is show controls THEN show reader view customization controls`() = runTest(testDispatcher) {
        val appStore = AppStore(
            initialState = AppState(),
        )
        val binding = ReaderViewBinding(
            appStore = appStore,
            readerMenuController = readerModeController,
            mainDispatcher = testDispatcher,
        )

        binding.start()

        appStore.dispatch(ReaderViewAction.ReaderViewControlsShown)

        testDispatcher.scheduler.advanceUntilIdle()

        verify { readerModeController.showControls() }

        assertEquals(ReaderViewState.None, appStore.state.readerViewState)
    }
}
