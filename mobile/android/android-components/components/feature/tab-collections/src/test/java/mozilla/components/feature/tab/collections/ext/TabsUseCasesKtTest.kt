/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.tab.collections.ext

import mozilla.components.browser.state.engine.EngineMiddleware
import mozilla.components.browser.state.selector.findTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.state.recover.toRecoverableTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.Engine
import mozilla.components.concept.engine.EngineSession
import mozilla.components.feature.tab.collections.Tab
import mozilla.components.feature.tab.collections.TabCollection
import mozilla.components.feature.tabs.TabsUseCases
import mozilla.components.support.test.mock
import mozilla.components.support.test.whenever
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Before
import org.junit.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.anyBoolean
import java.io.File

class TabsUseCasesKtTest {

    private lateinit var store: BrowserStore
    private lateinit var tabsUseCases: TabsUseCases
    private lateinit var engine: Engine
    private lateinit var engineSession: EngineSession

    private lateinit var collection: TabCollection
    private lateinit var tab: Tab
    private lateinit var filesDir: File

    @Before
    fun setup() {
        engineSession = mock()
        engine = mock()
        filesDir = mock()
        whenever(filesDir.path).thenReturn("/test")

        whenever(engine.createSession(anyBoolean(), any())).thenReturn(engineSession)
        store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "mozilla"),
                    createTab("https://www.example.org", id = "example"),
                ),
                selectedTabId = "mozilla",
            ),
            middleware = EngineMiddleware.create(
                engine = engine,
            ),
        )
        tabsUseCases = TabsUseCases(store)

        val recoveredTab = createTab(
            id = "123",
            url = "https://mozilla.org",
            lastAccess = 3735928559L,
        ).toRecoverableTab()

        tab = mock<Tab>().apply {
            whenever(id).thenReturn(123)
            whenever(title).thenReturn("Firefox")
            whenever(url).thenReturn("https://firefox.com")
            whenever(restore(filesDir, engine, false)).thenReturn(recoveredTab)
        }
        collection = mock<TabCollection>().apply {
            whenever(tabs).thenReturn(listOf(tab))
        }
    }

    @Test
    fun `RestoreUseCase updates last access when restoring collection`() {
        tabsUseCases.restore.invoke(filesDir, engine, collection) {}

        assertNotEquals(3735928559L, store.state.findTab("123")!!.lastAccess)
    }

    @Test
    fun `RestoreUseCase updates last access when restoring single tab in collection`() {
        tabsUseCases.restore.invoke(filesDir, engine, tab, onTabRestored = {}, onFailure = {})

        assertNotEquals(3735928559L, store.state.findTab("123")!!.lastAccess)
    }

    @Test
    fun `Restored single tab should be the last in the tabs list`() {
        tabsUseCases.restore.invoke(filesDir, engine, tab, onTabRestored = {}, onFailure = {})

        assertEquals("123", store.state.tabs.last().id)
    }

    @Test
    fun `GIVEN source and target keys are the same WHEN MoveTabs is invoked THEN order is not updated`() {
        val initialState = store.state.copy()
        tabsUseCases.moveTabs.invoke("mozilla", "mozilla", true)
        assertEquals(initialState, store.state)
    }

    @Test
    fun `GIVEN source and target keys are not the same WHEN MoveTabs is invoked THEN order is updated`() {
        val initialState = store.state.copy()
        val expectedState = store.state.copy(
            tabs = listOf(
                initialState.tabs[1],
                initialState.tabs[0],
            ),
        )
        tabsUseCases.moveTabs.invoke("mozilla", "example", true)
        assertEquals(expectedState, store.state)
    }

    @Test
    fun `GIVEN target key is null WHEN MoveTabs is invoked THEN order is not updated`() {
        val initialState = store.state.copy()
        tabsUseCases.moveTabs.invoke("mozilla", null, true)
        assertEquals(initialState, store.state)
    }
}
