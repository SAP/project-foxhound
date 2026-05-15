/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.locale

import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.LocaleAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
class LocaleMiddlewareTest {
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setUp() {
        LocaleManager.clear(testContext)
    }

    @Test
    @Config(qualifiers = "en-rUS")
    fun `GIVEN a locale has been chosen in the app WHEN we restore state THEN locale is retrieved from storage`() = runTest(testDispatcher) {
        val localeManager = LocaleManager
        val currentLocale = localeManager.getCurrentLocale(testContext)
        assertNull(currentLocale)

        val localeMiddleware = LocaleMiddleware(
            testContext,
            coroutineContext = testDispatcher,
            localeManager = localeManager,
        )

        val store = BrowserStore(
            initialState = BrowserState(),
            middleware = listOf(localeMiddleware),
        )

        assertEquals(store.state.locale, null)

        store.dispatch(LocaleAction.RestoreLocaleStateAction)
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(store.state.locale, currentLocale)
    }

    @Test
    @Config(qualifiers = "en-rUS")
    fun `WHEN we update the locale THEN the locale manager is updated`() = runTest(testDispatcher) {
        val localeManager = LocaleManager
        val currentLocale = localeManager.getCurrentLocale(testContext)
        assertNull(currentLocale)

        val localeMiddleware = LocaleMiddleware(
            testContext,
            coroutineContext = testDispatcher,
            localeManager = localeManager,
        )

        val store = BrowserStore(
            initialState = BrowserState(),
            middleware = listOf(localeMiddleware),
        )

        assertEquals(store.state.locale, null)

        val newLocale = "es".toLocale()
        store.dispatch(LocaleAction.UpdateLocaleAction(newLocale))
        testDispatcher.scheduler.advanceUntilIdle()

        val locale = localeManager.getCurrentLocale(testContext)
        assertEquals(locale, newLocale)

        assertEquals(store.state.locale, newLocale)
    }
}
