/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.toolbar

import io.mockk.mockk
import io.mockk.verify
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.GleanMetrics.Events
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction.SearchAction.SearchStarted
import org.mozilla.fenix.helpers.FenixGleanTestRule
import org.robolectric.RobolectricTestRunner
import kotlin.test.assertNotNull

@RunWith(RobolectricTestRunner::class) // For gleanTestRule
class DefaultToolbarControllerTest {

    @get:Rule
    val gleanTestRule = FenixGleanTestRule(testContext)

    private val appStore: AppStore = mockk(relaxed = true)

    @Test
    fun `WHEN the toolbar is tapped THEN dispatch SearchStarted and record telemetry`() {
        assertNull(Events.searchBarTapped.testGetValue())

        createController().handleNavigateSearch()

        assertNotNull(Events.searchBarTapped.testGetValue())

        val recordedEvents = Events.searchBarTapped.testGetValue()!!
        assertEquals(1, recordedEvents.size)
        assertEquals("HOME", recordedEvents.single().extra?.getValue("source"))

        verify { appStore.dispatch(SearchStarted()) }
    }

    private fun createController() = DefaultToolbarController(
        appStore = appStore,
    )
}
