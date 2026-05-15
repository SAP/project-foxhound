/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.middleware

import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createTab
import mozilla.components.concept.engine.utils.ABOUT_HOME_URL
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.tabstray.Page
import org.mozilla.fenix.tabstray.TabSearchAction
import org.mozilla.fenix.tabstray.TabsTrayState
import org.mozilla.fenix.tabstray.TabsTrayStore

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
class TabSearchMiddlewareTest {

    @Test
    fun `WHEN SearchQueryChanged on NormalTabs THEN search results include matching normal and inactive tabs`() = runTest {
        val expectedNormalTabs = listOf(
            createTab(url = "mozilla.org"),
            createTab(url = "mozilla.com"),
        )
        val otherNormalTabs = listOf(
            createTab(url = "example.com"),
        )

        val expectedInactiveTabs = listOf(
            createTab(url = "support.mozilla.org"),
        )
        val otherInactiveTabs = listOf(
            createTab(url = "example2.com"),
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
                normalTabs = expectedNormalTabs + otherNormalTabs,
                inactiveTabs = expectedInactiveTabs + otherInactiveTabs,
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
            createTab(
                url = "mozilla.com",
                private = true,
            ),
            createTab(
                url = "developer.mozilla.org",
                private = true,
            ),
        )
        val otherPrivateTabs = listOf(
            createTab(
                url = "example.com",
                private = true,
            ),
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
                privateTabs = expectedPrivateTabs + otherPrivateTabs,
            ),
        )

        store.dispatch(TabSearchAction.SearchQueryChanged("mozilla"))
        advanceUntilIdle()

        assertEquals(expectedPrivateTabs, store.state.tabSearchState.searchResults)
    }

    @Test
    fun `WHEN SearchQueryChanged with multiple words in query on NormalTabs THEN search results include matching normal and inactive tabs`() = runTest {
        val expectedNormalTabs = listOf(
            createTab(
                url = "mozilla.org",
                title = "Mozilla Homepage",
            ),
        )

        val otherNormalTabs = listOf(
            createTab(
                url = "mozilla.com",
                title = "Mozilla Example",
            ),
            createTab(
                url = "example.com",
                title = "example title",
            ),
            createTab(
                url = "example2.com",
                title = "example 2 title",
            ),
        )

        val expectedInactiveTabs = listOf(
            createTab(
                url = "support.mozilla.org",
                title = "Mozilla Homepage - Support",
            ),
        )
        val otherInactiveTabs = listOf(
            createTab(
                url = "inactive.com",
                title = "example 3 title",
            ),
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
                normalTabs = expectedNormalTabs + otherNormalTabs,
                inactiveTabs = expectedInactiveTabs + otherInactiveTabs,
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
            createTab(
                url = "mozilla.org",
                title = "Mozilla Homepage",
                private = true,
            ),
            createTab(
                url = "support.mozilla.org",
                title = "Mozilla Homepage - Support",
                private = true,
            ),
        )
        val otherPrivateTabs = listOf(
            createTab(
                url = "mozilla.com",
                title = "Mozilla Example",
                private = true,
            ),
            createTab(
                url = "example.com",
                title = "example title",
                private = true,
            ),
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
                privateTabs = expectedPrivateTabs + otherPrivateTabs,
            ),
        )

        store.dispatch(TabSearchAction.SearchQueryChanged("mozilla homepage"))
        advanceUntilIdle()

        assertEquals(expectedPrivateTabs, store.state.tabSearchState.searchResults)
    }

    @Test
    fun `WHEN SearchQueryChanged on NormalTabs THEN search results match query in title for both normal and inactive tabs`() = runTest {
        val expectedNormalTabs = listOf(
            createTab(
                url = "example.com",
                title = "Mozilla Homepage",
            ),
        )
        val otherNormalTabs = listOf(
            createTab(
                url = "example2.com",
                title = "Unrelated title",
            ),
        )

        val expectedInactiveTabs = listOf(
            createTab(
                url = "inactive-example.com",
                title = "Mozilla Inactive Tab",
            ),
        )
        val otherInactiveTabs = listOf(
            createTab(
                url = "inactive-example2.com",
                title = "Another title",
            ),
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
                normalTabs = expectedNormalTabs + otherNormalTabs,
                inactiveTabs = expectedInactiveTabs + otherInactiveTabs,
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
            createTab(
                url = "https://example.com",
                title = "Mozilla Private Tab",
                private = true,
            ),
        )
        val otherPrivateTabs = listOf(
            createTab(
                url = "https://example2.com",
                title = "Unrelated title",
                private = true,
            ),
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
                privateTabs = expectedPrivateTabs + otherPrivateTabs,
            ),
        )

        store.dispatch(TabSearchAction.SearchQueryChanged("mozilla"))
        advanceUntilIdle()

        assertEquals(expectedPrivateTabs, store.state.tabSearchState.searchResults)
    }

    @Test
    fun `WHEN SearchQueryChanged with empty query on NormalTabs THEN search results are empty`() = runTest {
        val normalTabs = listOf(
            createTab(url = "mozilla.org"),
            createTab(url = "example.com"),
        )
        val inactiveTabs = listOf(
            createTab(url = "mozilla.com"),
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
                normalTabs = normalTabs,
                inactiveTabs = inactiveTabs,
            ),
        )

        store.dispatch(TabSearchAction.SearchQueryChanged(""))
        advanceUntilIdle()

        val expectedSearchResults = emptyList<TabSessionState>()
        assertEquals(expectedSearchResults, store.state.tabSearchState.searchResults)
    }

    @Test
    fun `WHEN SearchQueryChanged with empty query on PrivateTabs THEN search results are empty`() = runTest {
        val privateTabs = listOf(
            createTab(url = "mozilla.com", private = true),
            createTab(url = "example.com", private = true),
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
                privateTabs = privateTabs,
            ),
        )

        store.dispatch(TabSearchAction.SearchQueryChanged(""))
        advanceUntilIdle()

        val expectedSearchResults = emptyList<TabSessionState>()
        assertEquals(expectedSearchResults, store.state.tabSearchState.searchResults)
    }

    @Test
    fun `WHEN SearchQueryChanged with whitespace only query on PrivateTabs THEN search results are empty`() = runTest {
        val privateTabs = listOf(
            createTab(url = "mozilla.com", private = true),
            createTab(url = "example.com", private = true),
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
                privateTabs = privateTabs,
            ),
        )

        store.dispatch(TabSearchAction.SearchQueryChanged(" "))
        advanceUntilIdle()

        assertTrue(store.state.tabSearchState.searchResults.isEmpty())
    }

    @Test
    fun `WHEN SearchQueryChanged AND multiple about home tabs match THEN only the most recently accessed about home tab is included`() = runTest {
        val aboutHomeOld = createTab(url = ABOUT_HOME_URL, title = "Homepage", lastAccess = 10L)
        val aboutHomeNew = createTab(url = ABOUT_HOME_URL, title = "Homepage", lastAccess = 20L)
        val aboutHomeNewest = createTab(url = ABOUT_HOME_URL, title = "Homepage", lastAccess = 30L)

        val matchingNonHomepage = listOf(
            createTab(url = "mozilla.org/home"),
            createTab(url = "mozilla.org", title = "Homepage"),
        )
        val nonMatching = listOf(
            createTab(url = "example.com"),
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
                normalTabs = listOf(aboutHomeOld, aboutHomeNew, aboutHomeNewest) + matchingNonHomepage + nonMatching,
                inactiveTabs = emptyList(),
            ),
        )

        store.dispatch(TabSearchAction.SearchQueryChanged("home"))
        advanceUntilIdle()

        val expectedSearchResults = listOf(aboutHomeNewest) + matchingNonHomepage
        assertEquals(expectedSearchResults, store.state.tabSearchState.searchResults)
    }

    @Test
    fun `WHEN SearchQueryChanged AND about home tabs do not match query THEN no about home tabs are included`() = runTest {
        val aboutHomeOld = createTab(url = ABOUT_HOME_URL, title = "Home", lastAccess = 10L)
        val aboutHomeNew = createTab(url = ABOUT_HOME_URL, title = "Home", lastAccess = 20L)

        val matchingNonHomepage = listOf(
            createTab(url = "mozilla.org"),
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
                normalTabs = listOf(aboutHomeOld, aboutHomeNew) + matchingNonHomepage,
                inactiveTabs = emptyList(),
            ),
        )

        store.dispatch(TabSearchAction.SearchQueryChanged("mozilla"))
        advanceUntilIdle()

        assertEquals(matchingNonHomepage, store.state.tabSearchState.searchResults)
    }

    @Test
    fun `WHEN SearchQueryChanged AND single about home tab matches THEN it is included`() = runTest {
        val aboutHome = createTab(url = ABOUT_HOME_URL, title = "Homepage", lastAccess = 42L)
        val matchingNonHomepage = listOf(
            createTab(url = "mozilla.org/home"),
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
                normalTabs = listOf(aboutHome) + matchingNonHomepage,
                inactiveTabs = emptyList(),
            ),
        )

        store.dispatch(TabSearchAction.SearchQueryChanged("home"))
        advanceUntilIdle()

        val expectedSearchResults = listOf(aboutHome) + matchingNonHomepage
        assertEquals(expectedSearchResults, store.state.tabSearchState.searchResults)
    }
}
