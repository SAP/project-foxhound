/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.middleware

import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.state.createTab
import mozilla.components.concept.engine.utils.ABOUT_HOME_URL
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.tabstray.data.TabGroupTheme
import org.mozilla.fenix.tabstray.data.TabsTrayItem
import org.mozilla.fenix.tabstray.redux.action.TabSearchAction
import org.mozilla.fenix.tabstray.redux.state.Page
import org.mozilla.fenix.tabstray.redux.state.TabsTrayState
import org.mozilla.fenix.tabstray.redux.store.TabsTrayStore

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
class TabSearchMiddlewareTest {

    @Test
    fun `WHEN SearchQueryChanged on NormalTabs THEN search results include matching tabs inside tab groups`() = runTest {
        val matchingTabInGroup = TabsTrayItem.Tab(tab = createTab(url = "mozilla.org", title = "Inside Group"))
        val nonMatchingTabInGroup = TabsTrayItem.Tab(tab = createTab(url = "example.com", title = "Other"))

        val tabGroup = TabsTrayItem.TabGroup(
            id = "group-id",
            title = "Group Title",
            theme = TabGroupTheme.Yellow,
            tabs = mutableListOf(matchingTabInGroup, nonMatchingTabInGroup),
            closed = false,
        )

        val otherNormalTab = TabsTrayItem.Tab(tab = createTab(url = "mozilla.com", title = "Standalone"))

        val store = TabsTrayStore(
            middlewares = listOf(
                TabSearchMiddleware(
                    scope = this,
                    mainScope = this,
                ),
            ),
            initialState = TabsTrayState(
                selectedPage = Page.NormalTabs,
                normalTabsState = TabsTrayState.NormalTabsState(
                    items = listOf(tabGroup, otherNormalTab),
                ),
            ),
        )

        store.dispatch(TabSearchAction.SearchQueryChanged("mozilla"))
        advanceUntilIdle()

        val expectedSearchResults = listOf(matchingTabInGroup, otherNormalTab)
        assertEquals(expectedSearchResults.size, store.state.tabSearchState.searchResults.size)
        assertTrue(store.state.tabSearchState.searchResults.contains(matchingTabInGroup))
        assertTrue(store.state.tabSearchState.searchResults.contains(otherNormalTab))
    }

    @Test
    fun `WHEN SearchQueryChanged on NormalTabs THEN search results include matching normal and inactive tabs`() = runTest {
        val expectedNormalTabs = listOf(
            TabsTrayItem.Tab(tab = createTab(url = "mozilla.org")),
            TabsTrayItem.Tab(tab = createTab(url = "mozilla.com")),
        )
        val otherNormalTabs = listOf(TabsTrayItem.Tab(tab = createTab(url = "example.com")))
        val expectedInactiveTabs = listOf(TabsTrayItem.Tab(tab = createTab(url = "support.mozilla.org")))
        val otherInactiveTabs = listOf(TabsTrayItem.Tab(tab = createTab(url = "example2.com")))

            val store = TabsTrayStore(
                middlewares = listOf(
                    TabSearchMiddleware(
                        scope = this,
                        mainScope = this,
                    ),
                ),
                initialState = TabsTrayState(
                    selectedPage = Page.NormalTabs,
                    normalTabsState = TabsTrayState.NormalTabsState(
                        items = expectedNormalTabs + otherNormalTabs,
                    ),
                    inactiveTabs = TabsTrayState.InactiveTabsState(
                        tabs = expectedInactiveTabs + otherInactiveTabs,
                    ),
                ),
            )

        store.dispatch(TabSearchAction.SearchQueryChanged("mozilla"))
        advanceUntilIdle()

        val expectedSearchResults = expectedNormalTabs + expectedInactiveTabs
        assertEquals(expectedSearchResults, store.state.tabSearchState.searchResults)
    }

    @Test
    fun `WHEN SearchQueryChanged on PrivateTabs THEN search results include matching private tabs only`() = runTest {
        val expectedPrivateTabs = listOf(
            TabsTrayItem.Tab(tab = createTab(url = "mozilla.com", private = true)),
            TabsTrayItem.Tab(tab = createTab(url = "developer.mozilla.org", private = true)),
        )
        val otherPrivateTabs = listOf(TabsTrayItem.Tab(tab = createTab(url = "example.com", private = true)))

            val store = TabsTrayStore(
                middlewares = listOf(
                    TabSearchMiddleware(
                        scope = this,
                        mainScope = this,
                    ),
                ),
                initialState = TabsTrayState(
                    selectedPage = Page.PrivateTabs,
                    privateBrowsing = TabsTrayState.PrivateBrowsingState(
                        tabs = expectedPrivateTabs + otherPrivateTabs,
                    ),
                ),
            )

        store.dispatch(TabSearchAction.SearchQueryChanged("mozilla"))
        advanceUntilIdle()

        assertEquals(expectedPrivateTabs, store.state.tabSearchState.searchResults)
    }

    @Test
    fun `WHEN SearchQueryChanged with multiple words in query on NormalTabs THEN search results include matching normal and inactive tabs`() = runTest {
        val expectedNormalTabs = listOf(TabsTrayItem.Tab(tab = createTab(url = "mozilla.org", title = "Mozilla Homepage")))
        val otherNormalTabs = listOf(
            TabsTrayItem.Tab(tab = createTab(url = "mozilla.com", title = "Mozilla Example")),
            TabsTrayItem.Tab(tab = createTab(url = "example.com", title = "example title")),
            TabsTrayItem.Tab(tab = createTab(url = "example2.com", title = "example 2 title")),
        )
        val expectedInactiveTabs = listOf(
            TabsTrayItem.Tab(tab = createTab(url = "support.mozilla.org", title = "Mozilla Homepage - Support")),
        )
        val otherInactiveTabs = listOf(
            TabsTrayItem.Tab(tab = createTab(url = "inactive.com", title = "example 3 title")),
        )

            val store = TabsTrayStore(
                middlewares = listOf(
                    TabSearchMiddleware(
                        scope = this,
                        mainScope = this,
                    ),
                ),
                initialState = TabsTrayState(
                    selectedPage = Page.NormalTabs,
                    normalTabsState = TabsTrayState.NormalTabsState(
                        items = expectedNormalTabs + otherNormalTabs,
                    ),
                    inactiveTabs = TabsTrayState.InactiveTabsState(
                        tabs = expectedInactiveTabs + otherInactiveTabs,
                    ),
                ),
            )

        store.dispatch(TabSearchAction.SearchQueryChanged("mozilla homepage"))
        advanceUntilIdle()

        val expectedSearchResults = expectedNormalTabs + expectedInactiveTabs
        assertEquals(expectedSearchResults, store.state.tabSearchState.searchResults)
    }

    @Test
    fun `WHEN SearchQueryChanged with multiple words in query on PrivateTabs THEN search results include matching private tabs only`() = runTest {
        val expectedPrivateTabs = listOf(
            TabsTrayItem.Tab(tab = createTab(url = "mozilla.org", title = "Mozilla Homepage", private = true)),
            TabsTrayItem.Tab(tab = createTab(url = "support.mozilla.org", title = "Mozilla Homepage - Support", private = true)),
        )
        val otherPrivateTabs = listOf(
            TabsTrayItem.Tab(tab = createTab(url = "mozilla.com", title = "Mozilla example", private = true)),
            TabsTrayItem.Tab(tab = createTab(url = "example.com", title = "example title", private = true)),
        )

            val store = TabsTrayStore(
                middlewares = listOf(
                    TabSearchMiddleware(
                        scope = this,
                        mainScope = this,
                    ),
                ),
                initialState = TabsTrayState(
                    selectedPage = Page.PrivateTabs,
                    privateBrowsing = TabsTrayState.PrivateBrowsingState(
                        tabs = expectedPrivateTabs + otherPrivateTabs,
                    ),
                ),
            )

        store.dispatch(TabSearchAction.SearchQueryChanged("mozilla homepage"))
        advanceUntilIdle()

        assertEquals(expectedPrivateTabs, store.state.tabSearchState.searchResults)
    }

    @Test
    fun `WHEN SearchQueryChanged on NormalTabs THEN search results match query in title for both normal and inactive tabs`() = runTest {
        val expectedNormalTabs = listOf(TabsTrayItem.Tab(tab = createTab(url = "example.com", title = "Mozilla Homepage")))
        val otherNormalTabs = listOf(TabsTrayItem.Tab(tab = createTab(url = "example2.com", title = "Unrelated title")))
        val expectedInactiveTabs = listOf(TabsTrayItem.Tab(tab = createTab(url = "inactive-example.com", title = "Mozilla Inactive Tab")))
        val otherInactiveTabs = listOf(TabsTrayItem.Tab(tab = createTab(url = "inactive-example2.com", title = "Another title")))

            val store = TabsTrayStore(
                middlewares = listOf(
                    TabSearchMiddleware(
                        scope = this,
                        mainScope = this,
                    ),
                ),
                initialState = TabsTrayState(
                    selectedPage = Page.NormalTabs,
                    normalTabsState = TabsTrayState.NormalTabsState(
                        items = expectedNormalTabs + otherNormalTabs,
                    ),
                    inactiveTabs = TabsTrayState.InactiveTabsState(tabs = expectedInactiveTabs + otherInactiveTabs),
                ),
            )

        store.dispatch(TabSearchAction.SearchQueryChanged("mozilla"))
        advanceUntilIdle()

        val expectedSearchResults = expectedNormalTabs + expectedInactiveTabs
        assertEquals(expectedSearchResults, store.state.tabSearchState.searchResults)
    }

    @Test
    fun `WHEN SearchQueryChanged on PrivateTabs THEN search results match query in title even if url does not contain it`() = runTest {
        val expectedPrivateTabs = listOf(
            TabsTrayItem.Tab(tab = createTab(url = "mozilla.org", title = "Mozilla Homepage", private = true)),
        )
        val otherPrivateTabs = listOf(
            TabsTrayItem.Tab(tab = createTab(url = "example.com", title = "example title", private = true)),
        )

            val store = TabsTrayStore(
                middlewares = listOf(
                    TabSearchMiddleware(
                        scope = this,
                        mainScope = this,
                    ),
                ),
                initialState = TabsTrayState(
                    selectedPage = Page.PrivateTabs,
                    privateBrowsing = TabsTrayState.PrivateBrowsingState(
                        tabs = expectedPrivateTabs + otherPrivateTabs,
                    ),
                ),
            )

        store.dispatch(TabSearchAction.SearchQueryChanged("mozilla"))
        advanceUntilIdle()

        assertEquals(expectedPrivateTabs, store.state.tabSearchState.searchResults)
    }

    @Test
    fun `WHEN SearchQueryChanged with empty query on NormalTabs THEN search results are empty`() = runTest {
        val normalTabs = listOf(
            TabsTrayItem.Tab(tab = createTab(url = "mozilla.org")),
            TabsTrayItem.Tab(tab = createTab(url = "example.com")),
        )
        val inactiveTabs = listOf(TabsTrayItem.Tab(tab = createTab(url = "mozilla.com")))

            val store = TabsTrayStore(
                middlewares = listOf(
                    TabSearchMiddleware(
                        scope = this,
                        mainScope = this,
                    ),
                ),
                initialState = TabsTrayState(
                    selectedPage = Page.NormalTabs,
                    normalTabsState = TabsTrayState.NormalTabsState(
                        items = normalTabs,
                    ),
                    inactiveTabs = TabsTrayState.InactiveTabsState(
                        tabs = inactiveTabs,
                    ),
                ),
            )

        store.dispatch(TabSearchAction.SearchQueryChanged(""))
        advanceUntilIdle()

        val expectedSearchResults = emptyList<TabsTrayItem>()
        assertEquals(expectedSearchResults, store.state.tabSearchState.searchResults)
    }

    @Test
    fun `WHEN SearchQueryChanged with empty query on PrivateTabs THEN search results are empty`() = runTest {
        val privateTabs = listOf(
            TabsTrayItem.Tab(tab = createTab(url = "mozilla.com", private = true)),
            TabsTrayItem.Tab(tab = createTab(url = "example.com", private = true)),
        )

            val store = TabsTrayStore(
                middlewares = listOf(
                    TabSearchMiddleware(
                        scope = this,
                        mainScope = this,
                    ),
                ),
                initialState = TabsTrayState(
                    selectedPage = Page.PrivateTabs,
                    privateBrowsing = TabsTrayState.PrivateBrowsingState(
                        tabs = privateTabs,
                    ),
                ),
            )

        store.dispatch(TabSearchAction.SearchQueryChanged(""))
        advanceUntilIdle()

        val expectedSearchResults = emptyList<TabsTrayItem>()
        assertEquals(expectedSearchResults, store.state.tabSearchState.searchResults)
    }

    @Test
    fun `WHEN SearchQueryChanged with whitespace only query on PrivateTabs THEN search results are empty`() = runTest {
        val privateTabs = listOf(
            TabsTrayItem.Tab(tab = createTab(url = "mozilla.com", private = true)),
            TabsTrayItem.Tab(tab = createTab(url = "example.com", private = true)),
        )

            val store = TabsTrayStore(
                middlewares = listOf(
                    TabSearchMiddleware(
                        scope = this,
                        mainScope = this,
                    ),
                ),
                initialState = TabsTrayState(
                    selectedPage = Page.PrivateTabs,
                    privateBrowsing = TabsTrayState.PrivateBrowsingState(
                        tabs = privateTabs,
                    ),
                ),
            )

        store.dispatch(TabSearchAction.SearchQueryChanged(" "))
        advanceUntilIdle()

        assertTrue(store.state.tabSearchState.searchResults.isEmpty())
    }

    @Test
    fun `WHEN SearchQueryChanged AND multiple about home tabs match THEN only the most recently accessed about home tab is included`() = runTest {
        val aboutHomeOld = TabsTrayItem.Tab(tab = createTab(url = ABOUT_HOME_URL, title = "Homepage", lastAccess = 10L))
        val aboutHomeNew = TabsTrayItem.Tab(tab = createTab(url = ABOUT_HOME_URL, title = "Homepage", lastAccess = 20L))
        val aboutHomeNewest = TabsTrayItem.Tab(tab = createTab(url = ABOUT_HOME_URL, title = "Homepage", lastAccess = 30L))

        val matchingNonHomepage = listOf(
            TabsTrayItem.Tab(tab = createTab(url = "mozilla.org/home")),
            TabsTrayItem.Tab(tab = createTab(url = "mozilla.org", title = "Homepage")),
        )
        val nonMatching = listOf(
            TabsTrayItem.Tab(tab = createTab(url = "example.com")),
        )

            val store = TabsTrayStore(
                middlewares = listOf(
                    TabSearchMiddleware(
                        scope = this,
                        mainScope = this,
                    ),
                ),
                initialState = TabsTrayState(
                    selectedPage = Page.NormalTabs,
                    normalTabsState = TabsTrayState.NormalTabsState(
                        items = listOf(
                            aboutHomeOld,
                            aboutHomeNew,
                            aboutHomeNewest,
                        ) + matchingNonHomepage + nonMatching,
                    ),
                    inactiveTabs = TabsTrayState.InactiveTabsState(
                        tabs = emptyList(),
                    ),
                ),
            )

        store.dispatch(TabSearchAction.SearchQueryChanged("home"))
        advanceUntilIdle()

        val expectedSearchResults = listOf(aboutHomeNewest) + matchingNonHomepage
        assertEquals(expectedSearchResults, store.state.tabSearchState.searchResults)
    }

    @Test
    fun `WHEN SearchQueryChanged AND about home tabs do not match query THEN no about home tabs are included`() = runTest {
        val aboutHomeOld = TabsTrayItem.Tab(tab = createTab(url = ABOUT_HOME_URL, title = "Homepage", lastAccess = 10L))
        val aboutHomeNew = TabsTrayItem.Tab(tab = createTab(url = ABOUT_HOME_URL, title = "Homepage", lastAccess = 20L))

        val matchingNonHomepage = listOf(TabsTrayItem.Tab(tab = createTab(url = "mozilla.org")))

            val store = TabsTrayStore(
                middlewares = listOf(
                    TabSearchMiddleware(
                        scope = this,
                        mainScope = this,
                    ),
                ),
                initialState = TabsTrayState(
                    selectedPage = Page.NormalTabs,
                    normalTabsState = TabsTrayState.NormalTabsState(
                        items = listOf(aboutHomeOld, aboutHomeNew) + matchingNonHomepage,
                    ),
                    inactiveTabs = TabsTrayState.InactiveTabsState(
                        tabs = emptyList(),
                    ),
                ),
            )

        store.dispatch(TabSearchAction.SearchQueryChanged("mozilla"))
        advanceUntilIdle()

        assertEquals(matchingNonHomepage, store.state.tabSearchState.searchResults)
    }

    @Test
    fun `WHEN SearchQueryChanged AND single about home tab matches THEN it is included`() = runTest {
        val aboutHome = TabsTrayItem.Tab(tab = createTab(url = ABOUT_HOME_URL, title = "Homepage", lastAccess = 42L))
        val matchingNonHomepage = listOf(
            TabsTrayItem.Tab(tab = createTab(url = "mozilla.org/home")),
        )

            val store = TabsTrayStore(
                middlewares = listOf(
                    TabSearchMiddleware(
                        scope = this,
                        mainScope = this,
                    ),
                ),
                initialState = TabsTrayState(
                    selectedPage = Page.NormalTabs,
                    normalTabsState = TabsTrayState.NormalTabsState(
                        items = listOf(aboutHome) + matchingNonHomepage,
                    ),
                    inactiveTabs = TabsTrayState.InactiveTabsState(
                        tabs = emptyList(),
                    ),
                ),
            )

        store.dispatch(TabSearchAction.SearchQueryChanged("home"))
        advanceUntilIdle()

        val expectedSearchResults = listOf(aboutHome) + matchingNonHomepage
        assertEquals(expectedSearchResults, store.state.tabSearchState.searchResults)
    }
}
