/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser.settings

import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.DefaultDesktopModeAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.GleanMetrics.DesktopMode
import org.mozilla.fenix.browser.desktopmode.DesktopModeMiddleware
import org.mozilla.fenix.browser.desktopmode.DesktopModeRepository
import org.mozilla.fenix.helpers.FenixGleanTestRule

@RunWith(AndroidJUnit4::class)
class DesktopModeMiddlewareTest {

    @get:Rule
    val gleanTestRule = FenixGleanTestRule(testContext)

    @Test
    fun `GIVEN desktop mode is enabled WHEN the Store is initialized THEN the middleware should set the correct value in the Store`() = runTest {
        val expected = true
        val middleware = createMiddleware(
            scope = this,
            getDesktopBrowsingEnabled = { true },
        )
        val store = BrowserStore(
            initialState = BrowserState(),
            middleware = listOf(middleware),
        )

        testScheduler.advanceUntilIdle()

        launch {
            assertEquals(expected, store.state.desktopMode)
        }
    }

    @Test
    fun `GIVEN desktop mode is disabled WHEN the Store is initialized THEN the middleware should set the correct value in the Store`() = runTest {
        val expected = false
        val middleware = createMiddleware(
            scope = this,
            getDesktopBrowsingEnabled = { expected },
        )
        val store = BrowserStore(
            initialState = BrowserState(),
            middleware = listOf(middleware),
        )

        testScheduler.advanceUntilIdle()

        launch {
            assertEquals(expected, store.state.desktopMode)
        }
    }

    @Test
    fun `GIVEN desktop mode is enabled WHEN the user toggles desktop mode off THEN the preference is updated`() = runTest {
        val expected = false
        val middleware = createMiddleware(
            scope = this,
            getDesktopBrowsingEnabled = { true },
            updateDesktopBrowsingEnabled = {
                assertEquals(expected, it)
                true
            },
        )
        val store = BrowserStore(
            initialState = BrowserState(),
            middleware = listOf(middleware),
        )

        testScheduler.advanceUntilIdle()
        store.dispatch(DefaultDesktopModeAction.ToggleDesktopMode)
        testScheduler.advanceUntilIdle()
    }

    @Test
    fun `GIVEN desktop mode is disabled WHEN the user toggles desktop mode on THEN the preference is updated`() = runTest {
        val expected = true
        val middleware = createMiddleware(
            scope = this,
            getDesktopBrowsingEnabled = { false },
            updateDesktopBrowsingEnabled = {
                assertEquals(expected, it)
                true
            },
        )
        val store = BrowserStore(
            initialState = BrowserState(),
            middleware = listOf(middleware),
        )

        testScheduler.advanceUntilIdle()

        store.dispatch(DefaultDesktopModeAction.ToggleDesktopMode)
    }

    @Test
    fun `GIVEN the user has toggled on desktop mode WHEN the preference update fails THEN the preference is reverted`() = runTest {
        val expected = false
        val middleware = createMiddleware(
            scope = this,
            getDesktopBrowsingEnabled = { expected },
            updateDesktopBrowsingEnabled = {
                false // trigger a failure
            },
        )
        val store = BrowserStore(
            initialState = BrowserState(
                desktopMode = expected,
            ),
            middleware = listOf(middleware),
        )

        testScheduler.advanceUntilIdle()
        store.dispatch(DefaultDesktopModeAction.ToggleDesktopMode)
        testScheduler.advanceUntilIdle()

        launch {
            assertEquals(expected, store.state.desktopMode)
        }
    }

    @Test
    fun `GIVEN the user has toggled off desktop mode WHEN the preference update fails THEN the preference is reverted`() = runTest {
        val expected = true
        val middleware = createMiddleware(
            scope = this,
            getDesktopBrowsingEnabled = { expected },
            updateDesktopBrowsingEnabled = {
                false // trigger a failure
            },
        )
        val store = BrowserStore(
            initialState = BrowserState(
                desktopMode = expected,
            ),
            middleware = listOf(middleware),
        )

        testScheduler.advanceUntilIdle()
        store.dispatch(DefaultDesktopModeAction.ToggleDesktopMode)
        testScheduler.advanceUntilIdle()

        launch {
            assertEquals(expected, store.state.desktopMode)
        }
    }

    @Test
    fun `GIVEN desktop mode is disabled WHEN the user toggles desktop mode on THEN record settings always request desktop site telemetry`() = runTest {
        val middleware = createMiddleware(
            scope = this,
            getDesktopBrowsingEnabled = { false },
        )
        val store = BrowserStore(
            initialState = BrowserState(),
            middleware = listOf(middleware),
        )

        assertNull(DesktopMode.settingsAlwaysRequestDesktopSite.testGetValue())

        testScheduler.advanceUntilIdle()
        store.dispatch(DefaultDesktopModeAction.ToggleDesktopMode)
        testScheduler.advanceUntilIdle()

        assertNotNull(DesktopMode.settingsAlwaysRequestDesktopSite.testGetValue())
        val snapshot = DesktopMode.settingsAlwaysRequestDesktopSite.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("settings_always_request_desktop_site", snapshot.single().name)
    }

    private fun createMiddleware(
        scope: CoroutineScope,
        getDesktopBrowsingEnabled: () -> Boolean = { false },
        updateDesktopBrowsingEnabled: (Boolean) -> Boolean = { true },
    ) = DesktopModeMiddleware(
        scope = scope,
        repository = createRepository(
            getDesktopBrowsingEnabled = getDesktopBrowsingEnabled,
            updateDesktopBrowsingEnabled = updateDesktopBrowsingEnabled,
        ),
    )

    private fun createRepository(
        getDesktopBrowsingEnabled: () -> Boolean = { false },
        updateDesktopBrowsingEnabled: (Boolean) -> Boolean = { true },
    ) = object : DesktopModeRepository {
        override suspend fun getDesktopBrowsingEnabled(): Boolean {
            return getDesktopBrowsingEnabled()
        }

        override suspend fun setDesktopBrowsingEnabled(enabled: Boolean): Boolean {
            return updateDesktopBrowsingEnabled(enabled)
        }
    }
}
