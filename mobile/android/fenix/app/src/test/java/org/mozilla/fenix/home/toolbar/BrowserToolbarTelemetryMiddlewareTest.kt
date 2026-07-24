/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.toolbar

import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarInteraction.BrowserToolbarEvent.Source
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarStore
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.GleanMetrics.Toolbar
import org.mozilla.fenix.helpers.FenixGleanTestRule
import org.mozilla.fenix.home.toolbar.BrowserToolbarTelemetryMiddleware.ToolbarActionRecord
import org.mozilla.fenix.home.toolbar.DisplayActions.MenuClicked
import org.mozilla.fenix.home.toolbar.TabCounterInteractions.AddNewPrivateTab
import org.mozilla.fenix.home.toolbar.TabCounterInteractions.AddNewTab
import org.mozilla.fenix.home.toolbar.TabCounterInteractions.TabCounterClicked
import org.mozilla.fenix.home.toolbar.TabCounterInteractions.TabCounterLongClicked
import org.mozilla.fenix.telemetry.SOURCE_ADDRESS_BAR
import org.mozilla.fenix.telemetry.SOURCE_NAVIGATION_BAR

@RunWith(AndroidJUnit4::class)
class BrowserToolbarTelemetryMiddlewareTest {
    @get:Rule
    val gleanRule = FenixGleanTestRule(testContext)

    @Test
    fun `WHEN menu button is clicked THEN record telemetry based on browser end or navbar source`() {
        buildStore.dispatch(MenuClicked(Source.AddressBar.BrowserEnd))
        assertTelemetryRecorded(Source.AddressBar.BrowserEnd, item = ToolbarActionRecord.MenuClicked.action)

        buildStore.dispatch(MenuClicked(Source.NavigationBar))
        assertTelemetryRecorded(Source.NavigationBar, item = ToolbarActionRecord.MenuClicked.action)
    }

    @Test
    fun `WHEN tab counter is clicked THEN record telemetry based on browser end or navbar source`() {
        buildStore.dispatch(TabCounterClicked(Source.AddressBar.BrowserEnd))
        assertTelemetryRecorded(Source.AddressBar.BrowserEnd, item = ToolbarActionRecord.TabCounterClicked.action)

        buildStore.dispatch(TabCounterClicked(Source.NavigationBar))
        assertTelemetryRecorded(Source.NavigationBar, item = ToolbarActionRecord.TabCounterClicked.action)
    }

    @Test
    fun `WHEN tab counter is long clicked THEN record telemetry based on browser end or navbar source`() {
        buildStore.dispatch(TabCounterLongClicked(Source.AddressBar.BrowserEnd))
        assertTelemetryRecorded(Source.AddressBar.BrowserEnd, item = ToolbarActionRecord.TabCounterLongClicked.action)

        buildStore.dispatch(TabCounterLongClicked(Source.NavigationBar))
        assertTelemetryRecorded(Source.NavigationBar, item = ToolbarActionRecord.TabCounterLongClicked.action)
    }

    @Test
    fun `WHEN adding a new tab THEN record telemetry based on browser end or navbar source`() {
        buildStore.dispatch(AddNewTab(Source.AddressBar.BrowserEnd))
        assertTelemetryRecorded(Source.AddressBar.BrowserEnd, item = ToolbarActionRecord.AddNewTab.action)

        buildStore.dispatch(AddNewTab(Source.NavigationBar))
        assertTelemetryRecorded(Source.NavigationBar, item = ToolbarActionRecord.AddNewTab.action)
    }

    @Test
    fun `WHEN adding a new private tab THEN record telemetry based on browser end or navbar source`() {
        buildStore.dispatch(AddNewPrivateTab(Source.AddressBar.BrowserEnd))
        assertTelemetryRecorded(Source.AddressBar.BrowserEnd, item = ToolbarActionRecord.AddNewPrivateTab.action)

        buildStore.dispatch(AddNewPrivateTab(Source.NavigationBar))
        assertTelemetryRecorded(Source.NavigationBar, item = ToolbarActionRecord.AddNewPrivateTab.action)
    }

    private fun assertTelemetryRecorded(
        source: Source,
        item: String,
    ) {
        val values = Toolbar.buttonTapped.testGetValue()
        assertNotNull(values)
        val last = values!!.last()
        val expectedSource = when (source) {
            is Source.AddressBar, Source.Unknown -> SOURCE_ADDRESS_BAR
            Source.NavigationBar -> SOURCE_NAVIGATION_BAR
        }
        assertEquals(item, last.extra?.get("item"))
        assertEquals(expectedSource, last.extra?.get("source"))
        if (source is Source.AddressBar) {
            assertEquals(source.telemetryName(), last.extra?.get("extra"))
        }
    }

    private val buildStore = BrowserToolbarStore(
        middleware = listOf(BrowserToolbarTelemetryMiddleware()),
    )
}
