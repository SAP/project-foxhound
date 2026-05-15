/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray

import io.mockk.mockk
import junit.framework.TestCase
import mozilla.components.browser.state.state.createTab
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.GleanMetrics.Metrics
import org.mozilla.fenix.GleanMetrics.TabSearch
import org.mozilla.fenix.GleanMetrics.TabsTray
import org.mozilla.fenix.helpers.FenixGleanTestRule
import org.mozilla.fenix.nimbus.FakeNimbusEventStore
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class) // for gleanTestRule
class TabsTrayTelemetryMiddlewareTest {

    private lateinit var store: TabsTrayStore
    private lateinit var tabsTrayTelemetryMiddleware: TabsTrayTelemetryMiddleware
    private val eventStore = FakeNimbusEventStore()

    @get:Rule
    val gleanTestRule = FenixGleanTestRule(testContext)

    @Before
    fun setup() {
        tabsTrayTelemetryMiddleware = TabsTrayTelemetryMiddleware(eventStore)
        store = TabsTrayStore(
            middlewares = listOf(tabsTrayTelemetryMiddleware),
            initialState = TabsTrayState(),
        )
    }

    @Test
    fun `WHEN inactive tabs are updated THEN report the count of inactive tabs`() {
        assertNull(TabsTray.hasInactiveTabs.testGetValue())
        assertNull(Metrics.inactiveTabsCount.testGetValue())

        store.dispatch(TabsTrayAction.UpdateInactiveTabs(emptyList()))
        assertNotNull(TabsTray.hasInactiveTabs.testGetValue())
        assertNotNull(Metrics.inactiveTabsCount.testGetValue())
        assertEquals(0L, Metrics.inactiveTabsCount.testGetValue())
    }

    @Test
    fun `WHEN multi select mode from menu is entered THEN relevant metrics are collected`() {
        assertNull(TabsTray.enterMultiselectMode.testGetValue())

        store.dispatch(TabsTrayAction.EnterSelectMode)

        assertNotNull(TabsTray.enterMultiselectMode.testGetValue())
        val snapshot = TabsTray.enterMultiselectMode.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("false", snapshot.single().extra?.getValue("tab_selected"))
    }

    @Test
    fun `WHEN multi select mode by long press is entered THEN relevant metrics are collected`() {
        store.dispatch(TabsTrayAction.AddSelectTab(mockk()))

        assertNotNull(TabsTray.enterMultiselectMode.testGetValue())
        val snapshot = TabsTray.enterMultiselectMode.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("true", snapshot.single().extra?.getValue("tab_selected"))
    }

    @Test
    fun `WHEN the inactive tabs auto close dialog is shown THEN the metric is reported`() {
        assertNull(TabsTray.autoCloseSeen.testGetValue())

        store.dispatch(TabsTrayAction.TabAutoCloseDialogShown)

        assertNotNull(TabsTray.autoCloseSeen.testGetValue())
    }

    @Test
    fun `WHEN the share all normal tabs button is clicked THEN the metric is reported`() {
        assertNull(TabsTray.shareAllTabs.testGetValue())

        store.dispatch(TabsTrayAction.ShareAllNormalTabs)

        assertNotNull(TabsTray.shareAllTabs.testGetValue())
    }

    @Test
    fun `WHEN the share all private tabs button is clicked THEN the metric is reported`() {
        assertNull(TabsTray.shareAllTabs.testGetValue())

        store.dispatch(TabsTrayAction.ShareAllPrivateTabs)

        assertNotNull(TabsTray.shareAllTabs.testGetValue())
    }

    @Test
    fun `WHEN the delete all normal tabs button is clicked THEN the metric is reported`() {
        assertNull(TabsTray.closeAllTabs.testGetValue())

        store.dispatch(TabsTrayAction.CloseAllNormalTabs)

        assertNotNull(TabsTray.closeAllTabs.testGetValue())
    }

    @Test
    fun `WHEN the delete all private tabs button is clicked THEN the metric is reported`() {
        assertNull(TabsTray.closeAllTabs.testGetValue())

        store.dispatch(TabsTrayAction.CloseAllPrivateTabs)

        assertNotNull(TabsTray.closeAllTabs.testGetValue())
    }

    @Test
    fun `GIVEN one tab selected WHEN the bookmark selected tabs button is clicked THEN the metric is reported`() {
        assertNull(TabsTray.bookmarkSelectedTabs.testGetValue())

        store.dispatch(TabsTrayAction.BookmarkSelectedTabs(1))

        assertNotNull(TabsTray.bookmarkSelectedTabs.testGetValue())
        val snapshot = TabsTray.bookmarkSelectedTabs.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("1", snapshot.single().extra?.getValue("tab_count"))
        assertEquals(1, Metrics.bookmarksAdd["tabs_tray"].testGetValue())

        eventStore.assertSingleEventEquals("bookmark_added")
    }

    @Test
    fun `GIVEN multiple tabs selected WHEN the bookmark selected tabs button is clicked THEN the metric is reported`() {
        assertNull(TabsTray.bookmarkSelectedTabs.testGetValue())

        store.dispatch(TabsTrayAction.BookmarkSelectedTabs(2))

        assertNotNull(TabsTray.bookmarkSelectedTabs.testGetValue())
        val snapshot = TabsTray.bookmarkSelectedTabs.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("2", snapshot.single().extra?.getValue("tab_count"))
        assertEquals(2, Metrics.bookmarksAdd["tabs_tray"].testGetValue())

        eventStore.assertEventsEqual(listOf("bookmark_added", "bookmark_added"))
    }

    @Test
    fun `WHEN the three dot button's menu is shown THEN the metric is reported`() {
        assertNull(TabsTray.menuOpened.testGetValue())

        store.dispatch(TabsTrayAction.ThreeDotMenuShown)

        assertNotNull(TabsTray.menuOpened.testGetValue())
    }

    /**
     *  [TabSearch.tabSearchIconClicked] coverage
     */

    @Test
    fun `WHEN tab search icon is clicked THEN record tab search icon clicked telemetry`() {
        TestCase.assertNull(TabSearch.tabSearchIconClicked.testGetValue())

        store.dispatch(TabsTrayAction.TabSearchClicked)

        TestCase.assertNotNull(TabSearch.tabSearchIconClicked.testGetValue())

        val snapshot = TabSearch.tabSearchIconClicked.testGetValue()!!
        assertEquals(1, snapshot.size)

        assertEquals("tab_search_icon_clicked", snapshot.single().name)
    }

    /**
     *  [TabSearch.resultClicked] coverage
     */

    @Test
    fun `WHEN a tab search result is clicked THEN record result clicked telemetry`() {
        TestCase.assertNull(TabSearch.resultClicked.testGetValue())

        val tabs = listOf(
            createTab(url = "mozilla.com"),
            createTab(url = "developer.mozilla.org"),
        )
        store.dispatch(TabSearchAction.SearchResultsUpdated(results = tabs))

        store.dispatch(TabSearchAction.SearchResultClicked(tabs[1]))

        TestCase.assertNotNull(TabSearch.resultClicked.testGetValue())

        val snapshot = TabSearch.resultClicked.testGetValue()!!
        assertEquals(1, snapshot.size)

        assertEquals("result_clicked", snapshot.single().name)
    }

    /**
     *  [TabSearch.navigateBackIconClicked] coverage
     */

    @Test
    fun `WHEN the navigation back icon is clicked THEN record navigate back icon clicked telemetry`() {
        TestCase.assertNull(TabSearch.navigateBackIconClicked.testGetValue())

        store.dispatch(TabsTrayAction.NavigateBackInvoked)

        TestCase.assertNotNull(TabSearch.navigateBackIconClicked.testGetValue())

        val snapshot = TabSearch.navigateBackIconClicked.testGetValue()!!
        assertEquals(1, snapshot.size)

        assertEquals("navigate_back_icon_clicked", snapshot.single().name)
    }
}
