/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.action

import mozilla.components.browser.state.reducer.BrowserStateReducer
import mozilla.components.browser.state.selector.normalTabs
import mozilla.components.browser.state.selector.privateTabs
import mozilla.components.browser.state.selector.selectedTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.SessionState
import mozilla.components.browser.state.state.TabGroup
import mozilla.components.browser.state.state.TabPartition
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createCustomTab
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.state.getGroupById
import mozilla.components.browser.state.state.recover.RecoverableTab
import mozilla.components.browser.state.state.recover.TabState
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TabListActionTest {

    @Test
    fun `AddTabAction - Adds provided SessionState`() {
        var state = BrowserState()

        assertEquals(0, state.tabs.size)
        assertNull(state.selectedTabId)

        val tab = createTab(url = "https://www.mozilla.org")

        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab))

        assertEquals(1, state.tabs.size)
        assertEquals(tab.id, state.selectedTabId)
    }

    @Test
    fun `AddTabAction - Add tab and update selection`() {
        val existingTab = createTab("https://www.mozilla.org")

        var state = BrowserState(
            tabs = listOf(existingTab),
            selectedTabId = existingTab.id,
        )

        assertEquals(1, state.tabs.size)
        assertEquals(existingTab.id, state.selectedTabId)

        val newTab = createTab("https://firefox.com")

        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(newTab, select = true))

        assertEquals(2, state.tabs.size)
        assertEquals(newTab.id, state.selectedTabId)
    }

    @Test
    fun `AddTabAction - Select first tab automatically`() {
        val existingTab = createTab("https://www.mozilla.org")

        var state = BrowserState()

        assertEquals(0, state.tabs.size)
        assertNull(existingTab.id, state.selectedTabId)

        val newTab = createTab("https://firefox.com")
        state =
            BrowserStateReducer.reduce(state, TabListAction.AddTabAction(newTab, select = false))

        assertEquals(1, state.tabs.size)
        assertEquals(newTab.id, state.selectedTabId)
    }

    @Test
    fun `AddTabAction - Specify parent tab`() {
        var state = BrowserState()

        val tab1 = createTab("https://www.mozilla.org")
        val tab2 = createTab("https://www.firefox.com")
        val tab3 = createTab("https://wiki.mozilla.org", parent = tab1)
        val tab4 = createTab("https://github.com/mozilla-mobile/android-components", parent = tab2)

        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab1))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab2))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab3))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab4))

        assertEquals(4, state.tabs.size)
        assertNull(state.tabs[0].parentId)
        assertNull(state.tabs[2].parentId)
        assertEquals(tab1.id, state.tabs[1].parentId)
        assertEquals(tab2.id, state.tabs[3].parentId)
    }

    @Test
    fun `AddTabAction - Specify source`() {
        var state = BrowserState()

        val tab1 = createTab("https://www.mozilla.org")
        val tab2 = createTab("https://www.firefox.com", source = SessionState.Source.Internal.Menu)

        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab1))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab2))

        assertEquals(2, state.tabs.size)
        assertEquals(SessionState.Source.Internal.None, state.tabs[0].source)
        assertEquals(SessionState.Source.Internal.Menu, state.tabs[1].source)
    }

    @Test
    fun `AddTabAction - Tabs with parent are added after (next to) parent`() {
        var state = BrowserState()

        val parent01 = createTab("https://www.mozilla.org")
        val parent02 = createTab("https://getpocket.com")
        val tab1 = createTab("https://www.firefox.com")
        val tab2 = createTab("https://developer.mozilla.org/en-US/")
        val child001 =
            createTab("https://www.mozilla.org/en-US/internet-health/", parent = parent01)
        val child002 = createTab("https://www.mozilla.org/en-US/technology/", parent = parent01)
        val child003 = createTab("https://getpocket.com/add/", parent = parent02)

        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(parent01))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab1))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(child001))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab2))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(parent02))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(child002))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(child003))

        assertEquals(parent01.id, state.tabs[0].id) // ├── parent 1
        assertEquals(child002.id, state.tabs[1].id) // │   ├── child 2
        assertEquals(child001.id, state.tabs[2].id) // │   └── child 1
        assertEquals(tab1.id, state.tabs[3].id) //     ├──tab 1
        assertEquals(tab2.id, state.tabs[4].id) //     ├──tab 2
        assertEquals(parent02.id, state.tabs[5].id) // └── parent 2
        assertEquals(child003.id, state.tabs[6].id) //     └── child 3
    }

    @Test
    fun `SelectTabAction - Selects SessionState by id`() {
        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
                createTab(id = "b", url = "https://www.firefox.com"),
            ),
        )

        assertNull(state.selectedTabId)

        state = BrowserStateReducer.reduce(state, TabListAction.SelectTabAction("a"))

        assertEquals("a", state.selectedTabId)
    }

    @Test
    fun `RemoveTabAction - Removes SessionState`() {
        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
                createTab(id = "b", url = "https://www.firefox.com"),
            ),
        )

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveTabAction("a"))

        assertEquals(1, state.tabs.size)
        assertEquals("https://www.firefox.com", state.tabs[0].content.url)
    }

    @Test
    fun `RemoveTabAction - Removes tab from partition`() {
        val tabGroup = TabGroup("test1", tabIds = setOf("a", "b"))
        val tabPartition = TabPartition("testPartition", tabGroups = listOf(tabGroup))

        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
                createTab(id = "b", url = "https://www.firefox.com"),
            ),
            tabPartitions = mapOf(tabPartition.id to tabPartition),
        )

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveTabAction("a"))
        assertEquals(1, state.tabs.size)
        assertEquals("https://www.firefox.com", state.tabs[0].content.url)
        assertEquals(
            setOf("b"),
            state.tabPartitions[tabPartition.id]?.getGroupById(tabGroup.id)?.tabIds,
        )
    }

    @Test
    fun `RemoveTabsAction - Removes SessionState`() {
        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
                createTab(id = "b", url = "https://www.firefox.com"),
                createTab(id = "c", url = "https://www.getpocket.com"),
            ),
        )

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveTabsAction(listOf("a", "b")))

        assertEquals(1, state.tabs.size)
        assertEquals("https://www.getpocket.com", state.tabs[0].content.url)
    }

    @Test
    fun `RemoveTabsAction - Removes tabs from partition`() {
        val tabGroup = TabGroup("test1", tabIds = setOf("a", "b"))
        val tabPartition = TabPartition("testPartition", tabGroups = listOf(tabGroup))

        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
                createTab(id = "b", url = "https://www.firefox.com"),
            ),
            tabPartitions = mapOf(tabPartition.id to tabPartition),
        )

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveTabsAction(listOf("a", "b")))
        assertEquals(0, state.tabs.size)
        assertEquals(
            0,
            state.tabPartitions[tabPartition.id]?.getGroupById(tabGroup.id)?.tabIds?.size,
        )
    }

    @Test
    fun `RemoveTabAction - Noop for unknown id`() {
        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
                createTab(id = "b", url = "https://www.firefox.com"),
            ),
        )

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveTabAction("c"))

        assertEquals(2, state.tabs.size)
        assertEquals("https://www.mozilla.org", state.tabs[0].content.url)
        assertEquals("https://www.firefox.com", state.tabs[1].content.url)
    }

    @Test
    fun `RemoveTabAction - Selected tab id is set to null if selected and last tab is removed`() {
        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
            ),
            selectedTabId = "a",
        )

        assertEquals("a", state.selectedTabId)

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveTabAction("a"))

        assertNull(state.selectedTabId)
    }

    @Test
    fun `RemoveTabAction - Does not select custom tab`() {
        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
            ),
            customTabs = listOf(
                createCustomTab(id = "b", url = "https://www.firefox.com"),
                createCustomTab(
                    id = "c",
                    url = "https://www.firefox.com/hello",
                    source = SessionState.Source.External.CustomTab(mock()),
                ),
            ),
            selectedTabId = "a",
        )

        assertEquals("a", state.selectedTabId)

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveTabAction("a"))

        assertNull(state.selectedTabId)
    }

    @Test
    fun `RemoveTabAction - Will select next nearby tab after removing selected tab`() {
        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
                createTab(id = "b", url = "https://www.firefox.com"),
                createTab(id = "c", url = "https://www.example.org"),
                createTab(id = "d", url = "https://getpocket.com"),
            ),
            customTabs = listOf(
                createCustomTab(id = "a1", url = "https://www.firefox.com"),
            ),
            selectedTabId = "c",
        )

        assertEquals("c", state.selectedTabId)

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveTabAction("c"))
        assertEquals("d", state.selectedTabId)

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveTabAction("a"))
        assertEquals("d", state.selectedTabId)

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveTabAction("d"))
        assertEquals("b", state.selectedTabId)

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveTabAction("b"))
        assertNull(state.selectedTabId)
    }

    @Test
    fun `RemoveTabAction - Selects private tab after private tab was removed`() {
        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org", private = true),
                createTab(id = "b", url = "https://www.firefox.com", private = false),
                createTab(id = "c", url = "https://www.example.org", private = false),
                createTab(id = "d", url = "https://getpocket.com", private = true),
                createTab(id = "e", url = "https://developer.mozilla.org/", private = true),
            ),
            customTabs = listOf(
                createCustomTab(id = "a1", url = "https://www.firefox.com"),
                createCustomTab(
                    id = "b1",
                    url = "https://hubs.mozilla.com",
                    source = SessionState.Source.External.CustomTab(mock()),
                ),
            ),
            selectedTabId = "d",
        )

        // [a*, b, c, (d*), e*] -> [a*, b, c, (e*)]
        state = BrowserStateReducer.reduce(state, TabListAction.RemoveTabAction("d"))
        assertEquals("e", state.selectedTabId)

        // [a*, b, c, (e*)] -> [(a*), b, c]
        state = BrowserStateReducer.reduce(state, TabListAction.RemoveTabAction("e"))
        assertEquals("a", state.selectedTabId)
    }

    @Test
    fun `RemoveTabAction - Selects normal tab after normal tab was removed`() {
        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org", private = false),
                createTab(id = "b", url = "https://www.firefox.com", private = true),
                createTab(id = "c", url = "https://www.example.org", private = true),
                createTab(id = "d", url = "https://getpocket.com", private = false),
                createTab(id = "e", url = "https://developer.mozilla.org/", private = false),
            ),
            customTabs = listOf(
                createCustomTab(id = "a1", url = "https://www.firefox.com"),
                createCustomTab(
                    id = "b1",
                    url = "https://hubs.mozilla.com",
                    source = SessionState.Source.External.CustomTab(mock()),
                ),
            ),
            selectedTabId = "d",
        )

        // [a, b*, c*, (d), e] -> [a, b*, c* (e)]
        state = BrowserStateReducer.reduce(state, TabListAction.RemoveTabAction("d"))
        assertEquals("e", state.selectedTabId)

        // [a, b*, c*, (e)] -> [(a), b*, c*]
        state = BrowserStateReducer.reduce(state, TabListAction.RemoveTabAction("e"))
        assertEquals("a", state.selectedTabId)

        // After removing the last normal tab NO private tab should get selected
        // [(a), b*, c*] -> [b*, c*]
        state = BrowserStateReducer.reduce(state, TabListAction.RemoveTabAction("a"))
        assertNull(state.selectedTabId)
    }

    @Test
    fun `GIVEN last normal tab WHEN removed THEN no new tab is selected`() {
        val normalTab = createTab("normal", private = false)
        val privateTab = createTab("private", private = true)
        val initialState =
            BrowserState(tabs = listOf(normalTab, privateTab), selectedTabId = normalTab.id)

        val state =
            BrowserStateReducer.reduce(initialState, TabListAction.RemoveTabAction(normalTab.id))

        assertNull(state.selectedTabId)
        assertEquals(1, state.tabs.size)
    }

    @Test
    fun `GIVEN last private tab WHEN removed THEN no new tab is selected`() {
        val normalTab = createTab("normal", private = false)
        val privateTab = createTab("private", private = true)
        val initialState =
            BrowserState(tabs = listOf(normalTab, privateTab), selectedTabId = privateTab.id)

        val state =
            BrowserStateReducer.reduce(initialState, TabListAction.RemoveTabAction(privateTab.id))

        assertNull(state.selectedTabId)
        assertEquals(1, state.tabs.size)
    }

    @Test
    fun `GIVEN normal tabs and one private tab WHEN all normal tabs are removed THEN no new tab is selected`() {
        val tabs =
            List(5) { createTab("$it", private = false) } + createTab("private", private = true)
        val initialState = BrowserState(tabs = tabs, selectedTabId = tabs.first().id)

        val state =
            BrowserStateReducer.reduce(initialState, TabListAction.RemoveAllNormalTabsAction)

        assertNull(state.selectedTabId)
        assertEquals(1, state.tabs.size)
    }

    @Test
    fun `GIVEN one normal tab and private tabs WHEN all private tabs are removed THEN no new tab is selected`() {
        val tabs =
            List(5) { createTab("$it", private = true) } + createTab("normal", private = false)
        val initialState = BrowserState(tabs = tabs, selectedTabId = tabs.first().id)

        val state =
            BrowserStateReducer.reduce(initialState, TabListAction.RemoveAllPrivateTabsAction)

        assertNull(state.selectedTabId)
        assertEquals(1, state.tabs.size)
    }

    @Test
    fun `RemoveTabAction - Parent will be selected if child is removed and flag is set to true (default)`() {
        var state = BrowserState()

        val parent = createTab("https://www.mozilla.org")
        val tab1 = createTab("https://www.firefox.com")
        val tab2 = createTab("https://getpocket.com")
        val child = createTab("https://www.mozilla.org/en-US/internet-health/", parent = parent)

        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(parent))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab1))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab2))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(child))

        state = BrowserStateReducer.reduce(state, TabListAction.SelectTabAction(child.id))
        state = BrowserStateReducer.reduce(
            state,
            TabListAction.RemoveTabAction(child.id, selectParentIfExists = true),
        )

        assertEquals(parent.id, state.selectedTabId)
        assertEquals("https://www.mozilla.org", state.selectedTab?.content?.url)
    }

    @Test
    fun `RemoveTabAction - Parent will not be selected if child is removed and flag is set to false`() {
        var state = BrowserState()

        val parent = createTab("https://www.mozilla.org")

        val tab1 = createTab("https://www.firefox.com")
        val tab2 = createTab("https://getpocket.com")
        val child1 = createTab("https://www.mozilla.org/en-US/internet-health/", parent = parent)
        val child2 = createTab("https://www.mozilla.org/en-US/technology/", parent = parent)

        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(parent))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab1))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab2))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(child1))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(child2))

        state = BrowserStateReducer.reduce(state, TabListAction.SelectTabAction(child1.id))
        state = BrowserStateReducer.reduce(
            state,
            TabListAction.RemoveTabAction(child1.id, selectParentIfExists = false),
        )

        assertEquals(tab1.id, state.selectedTabId)
        assertEquals("https://www.firefox.com", state.selectedTab?.content?.url)
    }

    @Test
    fun `RemoveTabAction - Providing selectParentIfExists when removing tab without parent has no effect`() {
        var state = BrowserState()

        val tab1 = createTab("https://www.firefox.com")
        val tab2 = createTab("https://getpocket.com")
        val tab3 = createTab("https://www.mozilla.org/en-US/internet-health/")

        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab1))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab2))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab3))

        state = BrowserStateReducer.reduce(state, TabListAction.SelectTabAction(tab3.id))
        state = BrowserStateReducer.reduce(
            state,
            TabListAction.RemoveTabAction(tab3.id, selectParentIfExists = true),
        )

        assertEquals(tab2.id, state.selectedTabId)
        assertEquals("https://getpocket.com", state.selectedTab?.content?.url)
    }

    @Test
    fun `RemoveTabAction - Children are updated when parent is removed`() {
        var state = BrowserState()

        val tab0 = createTab("https://www.firefox.com")
        val tab1 = createTab("https://developer.mozilla.org/en-US/", parent = tab0)
        val tab2 = createTab("https://www.mozilla.org/en-US/internet-health/", parent = tab1)
        val tab3 = createTab("https://www.mozilla.org/en-US/technology/", parent = tab2)

        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab0))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab1))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab2))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(tab3))

        // tab0 <- tab1 <- tab2 <- tab3
        assertEquals(tab0.id, state.tabs[0].id)
        assertEquals(tab1.id, state.tabs[1].id)
        assertEquals(tab2.id, state.tabs[2].id)
        assertEquals(tab3.id, state.tabs[3].id)

        assertNull(state.tabs[0].parentId)
        assertEquals(tab0.id, state.tabs[1].parentId)
        assertEquals(tab1.id, state.tabs[2].parentId)
        assertEquals(tab2.id, state.tabs[3].parentId)

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveTabAction(tab2.id))

        // tab0 <- tab1 <- tab3
        assertEquals(tab0.id, state.tabs[0].id)
        assertEquals(tab1.id, state.tabs[1].id)
        assertEquals(tab3.id, state.tabs[2].id)

        assertNull(state.tabs[0].parentId)
        assertEquals(tab0.id, state.tabs[1].parentId)
        assertEquals(tab1.id, state.tabs[2].parentId)

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveTabAction(tab0.id))

        // tab1 <- tab3
        assertEquals(tab1.id, state.tabs[0].id)
        assertEquals(tab3.id, state.tabs[1].id)

        assertNull(state.tabs[0].parentId)
        assertEquals(tab1.id, state.tabs[1].parentId)
    }

    @Test
    fun `RestoreAction - Adds restored tabs and updates selected tab`() {
        var state = BrowserState()

        assertEquals(0, state.tabs.size)

        state = BrowserStateReducer.reduce(
            state,
            TabListAction.RestoreAction(
                tabs = listOf(
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(
                            id = "a",
                            url = "https://www.mozilla.org",
                            private = false,
                        ),
                    ),
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "b", url = "https://www.firefox.com", private = true),
                    ),
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "c", url = "https://www.example.org", private = true),
                    ),
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "d", url = "https://getpocket.com", private = false),
                    ),
                ),
                selectedTabId = "d",
                restoreLocation = TabListAction.RestoreAction.RestoreLocation.BEGINNING,
            ),
        )

        assertEquals(4, state.tabs.size)
        assertEquals("a", state.tabs[0].id)
        assertEquals("b", state.tabs[1].id)
        assertEquals("c", state.tabs[2].id)
        assertEquals("d", state.tabs[3].id)
        assertEquals("d", state.selectedTabId)
    }

    @Test
    fun `RestoreAction - Adds restored tabs and tab partitions and updates selected tab`() {
        var state = BrowserState()

        assertEquals(0, state.tabs.size)
        assertEquals(0, state.tabPartitions.size)

        val restoredTabs = listOf(
            RecoverableTab(
                engineSessionState = null,
                state = TabState(
                    id = "a",
                    url = "https://www.mozilla.org",
                    private = false,
                ),
            ),
            RecoverableTab(
                engineSessionState = null,
                state = TabState(id = "b", url = "https://www.firefox.com", private = true),
            ),
            RecoverableTab(
                engineSessionState = null,
                state = TabState(id = "c", url = "https://www.example.org", private = true),
            ),
        )
        val tabGroup = TabGroup(id = "group1", name = "Group 1", tabIds = setOf("a"))
        val tabPartition = TabPartition(id = "testFeaturePartition", tabGroups = listOf(tabGroup))
        val restoredTabPartitions = mapOf("testFeaturePartition" to tabPartition)

        state = BrowserStateReducer.reduce(
            state,
            TabListAction.RestoreAction(
                tabs = restoredTabs,
                selectedTabId = "c",
                restoreLocation = TabListAction.RestoreAction.RestoreLocation.BEGINNING,
                tabPartitions = restoredTabPartitions,
            ),
        )

        assertEquals(3, state.tabs.size)
        assertEquals("a", state.tabs[0].id)
        assertEquals("b", state.tabs[1].id)
        assertEquals("c", state.tabs[2].id)
        assertEquals("c", state.selectedTabId)
        assertEquals(restoredTabPartitions, state.tabPartitions)
    }

    @Test
    fun `RestoreAction - Merges the existing tab partitions with the restored tab partitions`() {
        val tabGroup = TabGroup(id = "group1", name = "Group 1", tabIds = setOf("a"))
        val tabPartition = TabPartition(id = "testFeaturePartition1", tabGroups = listOf(tabGroup))
        val tabPartitions = mapOf("testFeaturePartition1" to tabPartition)
        var state = BrowserState(
            tabPartitions = tabPartitions,
        )

        assertEquals(0, state.tabs.size)
        assertEquals(tabPartitions, state.tabPartitions)

        val restoredTabs = listOf(
            RecoverableTab(
                engineSessionState = null,
                state = TabState(
                    id = "a",
                    url = "https://www.mozilla.org",
                    private = false,
                ),
            ),
            RecoverableTab(
                engineSessionState = null,
                state = TabState(id = "b", url = "https://www.firefox.com", private = true),
            ),
            RecoverableTab(
                engineSessionState = null,
                state = TabState(id = "c", url = "https://www.example.org", private = true),
            ),
        )
        val restoredTabGroups = listOf(
            TabGroup(id = "group1", name = "Group 1", tabIds = setOf("b")),
            TabGroup(id = "group2", name = "Group 2", tabIds = setOf("c")),
        )
        val restoredTabPartitions = mapOf(
            "testFeaturePartition1" to TabPartition(
                id = "testFeaturePartition1",
                tabGroups = restoredTabGroups,
            ),
            "testFeaturePartition2" to TabPartition(
                id = "testFeaturePartition2",
                tabGroups = emptyList(),
            ),
        )

        state = BrowserStateReducer.reduce(
            state,
            TabListAction.RestoreAction(
                tabs = restoredTabs,
                selectedTabId = "c",
                restoreLocation = TabListAction.RestoreAction.RestoreLocation.BEGINNING,
                tabPartitions = restoredTabPartitions,
            ),
        )

        assertEquals(3, state.tabs.size)
        assertEquals("a", state.tabs[0].id)
        assertEquals("b", state.tabs[1].id)
        assertEquals("c", state.tabs[2].id)
        assertEquals("c", state.selectedTabId)

        val expectedTabPartitions = mapOf(
            "testFeaturePartition1" to TabPartition(
                id = "testFeaturePartition1",
                tabGroups = listOf(
                    TabGroup("group1", name = "Group 1", tabIds = setOf("a", "b")),
                    TabGroup("group2", name = "Group 2", tabIds = setOf("c")),
                ),
            ),
            "testFeaturePartition2" to TabPartition(
                id = "testFeaturePartition2",
                tabGroups = emptyList(),
            ),
        )
        assertEquals(expectedTabPartitions, state.tabPartitions)
    }

    @Test
    fun `RestoreAction - Adds restored tabs to the beginning of existing tabs without updating selection`() {
        val initialState = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org", private = false),
                createTab(id = "b", url = "https://www.firefox.com", private = true),
            ),
            selectedTabId = "a",
        )

        assertEquals(2, initialState.tabs.size)

        val state = BrowserStateReducer.reduce(
            initialState,
            TabListAction.RestoreAction(
                tabs = listOf(
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "c", url = "https://www.example.org", private = true),
                    ),
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "d", url = "https://getpocket.com", private = false),
                    ),
                ),
                selectedTabId = "d",
                restoreLocation = TabListAction.RestoreAction.RestoreLocation.BEGINNING,
            ),
        )

        assertEquals(4, state.tabs.size)
        assertEquals("c", state.tabs[0].id)
        assertEquals("d", state.tabs[1].id)
        assertEquals("a", state.tabs[2].id)
        assertEquals("b", state.tabs[3].id)
        assertEquals("a", state.selectedTabId)
    }

    @Test
    fun `RestoreAction - Adds restored tabs to the end of existing tabs without updating selection`() {
        val initialState = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org", private = false),
                createTab(id = "b", url = "https://www.firefox.com", private = true),
            ),
            selectedTabId = "a",
        )

        assertEquals(2, initialState.tabs.size)

        val state = BrowserStateReducer.reduce(
            initialState,
            TabListAction.RestoreAction(
                tabs = listOf(
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "c", url = "https://www.example.org", private = true),
                    ),
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "d", url = "https://getpocket.com", private = false),
                    ),
                ),
                selectedTabId = "d",
                restoreLocation = TabListAction.RestoreAction.RestoreLocation.END,
            ),
        )

        assertEquals(4, state.tabs.size)
        assertEquals("a", state.tabs[0].id)
        assertEquals("b", state.tabs[1].id)
        assertEquals("c", state.tabs[2].id)
        assertEquals("d", state.tabs[3].id)
        assertEquals("a", state.selectedTabId)
    }

    @Test
    fun `RestoreAction - Adds restored tabs to beginning of existing tabs with updating selection`() {
        val initialState = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org", private = false),
                createTab(id = "b", url = "https://www.firefox.com", private = true),
            ),
        )

        assertEquals(2, initialState.tabs.size)

        val state = BrowserStateReducer.reduce(
            initialState,
            TabListAction.RestoreAction(
                tabs = listOf(
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "c", url = "https://www.example.org", private = true),
                    ),
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "d", url = "https://getpocket.com", private = false),
                    ),
                ),
                selectedTabId = "d",
                restoreLocation = TabListAction.RestoreAction.RestoreLocation.BEGINNING,
            ),
        )

        assertEquals(4, state.tabs.size)
        assertEquals("c", state.tabs[0].id)
        assertEquals("d", state.tabs[1].id)
        assertEquals("a", state.tabs[2].id)
        assertEquals("b", state.tabs[3].id)
        assertEquals("d", state.selectedTabId)
    }

    @Test
    fun `RestoreAction - Adds restored tabs to end of existing tabs with updating selection`() {
        val initialState = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org", private = false),
                createTab(id = "b", url = "https://www.firefox.com", private = true),
            ),
        )

        assertEquals(2, initialState.tabs.size)

        val state = BrowserStateReducer.reduce(
            initialState,
            TabListAction.RestoreAction(
                tabs = listOf(
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "c", url = "https://www.example.org", private = true),
                    ),
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "d", url = "https://getpocket.com", private = false),
                    ),
                ),
                selectedTabId = "d",
                restoreLocation = TabListAction.RestoreAction.RestoreLocation.END,
            ),
        )

        assertEquals(4, state.tabs.size)
        assertEquals("a", state.tabs[0].id)
        assertEquals("b", state.tabs[1].id)
        assertEquals("c", state.tabs[2].id)
        assertEquals("d", state.tabs[3].id)
        assertEquals("d", state.selectedTabId)
    }

    @Test
    fun `RestoreAction - Does not update selection if none was provided`() {
        val initialState = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org", private = false),
                createTab(id = "b", url = "https://www.firefox.com", private = true),
            ),
        )

        assertEquals(2, initialState.tabs.size)

        val state = BrowserStateReducer.reduce(
            initialState,
            TabListAction.RestoreAction(
                tabs = listOf(
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "c", url = "https://www.example.org", private = true),
                    ),
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "d", url = "https://getpocket.com", private = false),
                    ),
                ),
                selectedTabId = null,
                restoreLocation = TabListAction.RestoreAction.RestoreLocation.BEGINNING,
            ),
        )

        assertEquals(4, state.tabs.size)
        assertEquals("c", state.tabs[0].id)
        assertEquals("d", state.tabs[1].id)
        assertEquals("a", state.tabs[2].id)
        assertEquals("b", state.tabs[3].id)
        assertNull(state.selectedTabId)
    }

    @Test
    fun `RestoreAction - Add tab back to correct location (beginning)`() {
        val initialState = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
                createTab(id = "b", url = "https://www.firefox.com"),
            ),
        )

        assertEquals(2, initialState.tabs.size)

        val state = BrowserStateReducer.reduce(
            initialState,
            TabListAction.RestoreAction(
                tabs = listOf(
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "c", url = "https://www.example.org", index = 0),
                    ),
                ),
                selectedTabId = null,
                restoreLocation = TabListAction.RestoreAction.RestoreLocation.AT_INDEX,
            ),
        )

        assertEquals(3, state.tabs.size)
        assertEquals("c", state.tabs[0].id)
        assertEquals("a", state.tabs[1].id)
        assertEquals("b", state.tabs[2].id)
    }

    @Test
    fun `RestoreAction - Add tab back to correct location (middle)`() {
        val initialState = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
                createTab(id = "b", url = "https://www.firefox.com"),
            ),
        )

        assertEquals(2, initialState.tabs.size)

        val state = BrowserStateReducer.reduce(
            initialState,
            TabListAction.RestoreAction(
                tabs = listOf(
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "c", url = "https://www.example.org", index = 1),
                    ),
                ),
                selectedTabId = null,
                restoreLocation = TabListAction.RestoreAction.RestoreLocation.AT_INDEX,
            ),
        )

        assertEquals(3, state.tabs.size)
        assertEquals("a", state.tabs[0].id)
        assertEquals("c", state.tabs[1].id)
        assertEquals("b", state.tabs[2].id)
    }

    @Test
    fun `RestoreAction - Add tab back to correct location (end)`() {
        val initialState = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
                createTab(id = "b", url = "https://www.firefox.com"),
            ),
        )

        assertEquals(2, initialState.tabs.size)

        val state = BrowserStateReducer.reduce(
            initialState,
            TabListAction.RestoreAction(
                tabs = listOf(
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "c", url = "https://www.example.org", index = 2),
                    ),
                ),
                selectedTabId = null,
                restoreLocation = TabListAction.RestoreAction.RestoreLocation.AT_INDEX,
            ),
        )

        assertEquals(3, state.tabs.size)
        assertEquals("a", state.tabs[0].id)
        assertEquals("b", state.tabs[1].id)
        assertEquals("c", state.tabs[2].id)
    }

    @Test
    fun `RestoreAction - Add tab back to correct location with index beyond size of total tabs`() {
        val initialState = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
                createTab(id = "b", url = "https://www.firefox.com"),
            ),
        )

        assertEquals(2, initialState.tabs.size)

        val state = BrowserStateReducer.reduce(
            initialState,
            TabListAction.RestoreAction(
                tabs = listOf(
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "c", url = "https://www.example.org", index = 4),
                    ),
                ),
                selectedTabId = null,
                restoreLocation = TabListAction.RestoreAction.RestoreLocation.AT_INDEX,
            ),
        )

        assertEquals(3, state.tabs.size)
        assertEquals("a", state.tabs[0].id)
        assertEquals("b", state.tabs[1].id)
        assertEquals("c", state.tabs[2].id)
    }

    @Test
    fun `RestoreAction - Add tabs back to correct locations`() {
        val initialState = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
                createTab(id = "b", url = "https://www.firefox.com"),
            ),
        )

        assertEquals(2, initialState.tabs.size)

        val state = BrowserStateReducer.reduce(
            initialState,
            TabListAction.RestoreAction(
                tabs = listOf(
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "c", url = "https://www.example.org", index = 3),
                    ),
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "d", url = "https://www.example.org", index = 0),
                    ),
                ),
                selectedTabId = null,
                restoreLocation = TabListAction.RestoreAction.RestoreLocation.AT_INDEX,
            ),
        )

        assertEquals(4, state.tabs.size)
        assertEquals("d", state.tabs[0].id)
        assertEquals("a", state.tabs[1].id)
        assertEquals("b", state.tabs[2].id)
        assertEquals("c", state.tabs[3].id)
    }

    @Test
    fun `RestoreAction - Add tabs with matching indices back to correct locations`() {
        val initialState = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
                createTab(id = "b", url = "https://www.firefox.com"),
            ),
        )

        assertEquals(2, initialState.tabs.size)

        val state = BrowserStateReducer.reduce(
            initialState,
            TabListAction.RestoreAction(
                tabs = listOf(
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "c", url = "https://www.example.org", index = 0),
                    ),
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "d", url = "https://www.example.org", index = 0),
                    ),
                ),
                selectedTabId = null,
                restoreLocation = TabListAction.RestoreAction.RestoreLocation.AT_INDEX,
            ),
        )

        assertEquals(4, state.tabs.size)
        assertEquals("d", state.tabs[0].id)
        assertEquals("c", state.tabs[1].id)
        assertEquals("a", state.tabs[2].id)
        assertEquals("b", state.tabs[3].id)
    }

    @Test
    fun `RestoreAction - Add tabs with a -1 removal index`() {
        val initialState = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
                createTab(id = "b", url = "https://www.firefox.com"),
            ),
        )

        assertEquals(2, initialState.tabs.size)

        val state = BrowserStateReducer.reduce(
            initialState,
            TabListAction.RestoreAction(
                tabs = listOf(
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "c", url = "https://www.example.org", index = -1),
                    ),
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState(id = "d", url = "https://www.example.org"),
                    ),
                ),
                selectedTabId = null,
                restoreLocation = TabListAction.RestoreAction.RestoreLocation.AT_INDEX,
            ),
        )

        assertEquals(4, state.tabs.size)
        assertEquals("a", state.tabs[0].id)
        assertEquals("b", state.tabs[1].id)
        assertEquals("c", state.tabs[2].id)
        assertEquals("d", state.tabs[3].id)
    }

    @Test
    fun `RemoveAllTabsAction - Removes both private and non-private tabs (but not custom tabs)`() {
        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org", private = false),
                createTab(id = "b", url = "https://www.firefox.com", private = true),
            ),
            customTabs = listOf(
                createCustomTab(id = "a1", url = "https://www.firefox.com"),
                createCustomTab(
                    id = "a2",
                    url = "https://www.firefox.com/hello",
                    source = SessionState.Source.External.CustomTab(mock()),
                ),
            ),
            selectedTabId = "a",
        )

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveAllTabsAction())

        assertTrue(state.tabs.isEmpty())
        assertNull(state.selectedTabId)
        assertEquals(2, state.customTabs.size)
        assertEquals("a2", state.customTabs.last().id)
    }

    @Test
    fun `RemoveAllTabsAction - Removes tabs from partition`() {
        val tabGroup = TabGroup("test1", tabIds = setOf("a", "b"))
        val tabPartition = TabPartition("testPartition", tabGroups = listOf(tabGroup))

        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
                createTab(id = "b", url = "https://www.firefox.com", private = true),
            ),
            tabPartitions = mapOf(tabPartition.id to tabPartition),
        )

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveAllTabsAction())
        assertEquals(0, state.tabs.size)
        assertEquals(
            0,
            state.tabPartitions[tabPartition.id]?.getGroupById(tabGroup.id)?.tabIds?.size,
        )
    }

    @Test
    fun `RemoveAllPrivateTabsAction - Removes only private tabs`() {
        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org", private = false),
                createTab(id = "b", url = "https://www.firefox.com", private = true),
            ),
            customTabs = listOf(
                createCustomTab(id = "a1", url = "https://www.firefox.com"),
            ),
            selectedTabId = "a",
        )

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveAllPrivateTabsAction)

        assertEquals(1, state.tabs.size)
        assertEquals("a", state.tabs[0].id)
        assertEquals("a", state.selectedTabId)

        assertEquals(1, state.customTabs.size)
        assertEquals("a1", state.customTabs.last().id)
    }

    @Test
    fun `RemoveAllPrivateTabsAction - Updates selection if affected`() {
        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org", private = false),
                createTab(id = "b", url = "https://www.firefox.com", private = true),
            ),
            customTabs = listOf(
                createCustomTab(id = "a1", url = "https://www.firefox.com"),
            ),
            selectedTabId = "b",
        )

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveAllPrivateTabsAction)

        assertEquals(1, state.tabs.size)
        assertEquals("a", state.tabs[0].id)
        assertEquals(null, state.selectedTabId)

        assertEquals(1, state.customTabs.size)
        assertEquals("a1", state.customTabs.last().id)
    }

    @Test
    fun `RemoveAllPrivateTabsAction - Removes tabs from partition`() {
        val normalTabGroup = TabGroup("test1", tabIds = setOf("a"))
        val privateTabGroup = TabGroup("test2", tabIds = setOf("b"))
        val tabPartition =
            TabPartition("testPartition", tabGroups = listOf(normalTabGroup, privateTabGroup))

        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
                createTab(id = "b", url = "https://www.firefox.com", private = true),
            ),
            tabPartitions = mapOf(tabPartition.id to tabPartition),
        )

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveAllPrivateTabsAction)
        assertEquals(1, state.tabs.size)
        assertEquals(
            1,
            state.tabPartitions[tabPartition.id]?.getGroupById(normalTabGroup.id)?.tabIds?.size,
        )
        assertEquals(
            0,
            state.tabPartitions[tabPartition.id]?.getGroupById(privateTabGroup.id)?.tabIds?.size,
        )
    }

    @Test
    fun `RemoveAllNormalTabsAction - Removes only normal (non-private) tabs`() {
        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org", private = false),
                createTab(id = "b", url = "https://www.firefox.com", private = true),
            ),
            customTabs = listOf(
                createCustomTab(id = "a1", url = "https://www.firefox.com"),
            ),
            selectedTabId = "b",
        )

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveAllNormalTabsAction)

        assertEquals(1, state.tabs.size)
        assertEquals("b", state.tabs[0].id)
        assertEquals("b", state.selectedTabId)

        assertEquals(1, state.customTabs.size)
        assertEquals("a1", state.customTabs.last().id)
    }

    @Test
    fun `RemoveAllNormalTabsAction - Updates selection if affected`() {
        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org", private = false),
                createTab(id = "b", url = "https://www.firefox.com", private = true),
            ),
            customTabs = listOf(
                createCustomTab(id = "a1", url = "https://www.firefox.com"),
            ),
            selectedTabId = "a",
        )

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveAllNormalTabsAction)

        assertEquals(1, state.tabs.size)
        assertEquals("b", state.tabs[0].id)
        // After removing the last normal tab NO private tab should get selected
        assertNull(state.selectedTabId)

        assertEquals(1, state.customTabs.size)
        assertEquals("a1", state.customTabs.last().id)
    }

    @Test
    fun `RemoveAllNormalTabsAction - Removes tabs from partition`() {
        val normalTabGroup = TabGroup("test1", tabIds = setOf("a"))
        val privateTabGroup = TabGroup("test2", tabIds = setOf("b"))
        val tabPartition =
            TabPartition("testPartition", tabGroups = listOf(normalTabGroup, privateTabGroup))

        var state = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org"),
                createTab(id = "b", url = "https://www.firefox.com", private = true),
            ),
            tabPartitions = mapOf(tabPartition.id to tabPartition),
        )

        state = BrowserStateReducer.reduce(state, TabListAction.RemoveAllNormalTabsAction)
        assertEquals(1, state.tabs.size)
        assertEquals(
            0,
            state.tabPartitions[tabPartition.id]?.getGroupById(normalTabGroup.id)?.tabIds?.size,
        )
        assertEquals(
            1,
            state.tabPartitions[tabPartition.id]?.getGroupById(privateTabGroup.id)?.tabIds?.size,
        )
    }

    @Test
    fun `AddMultipleTabsAction - Adds multiple tabs and updates selection`() {
        var state = BrowserState()

        assertEquals(0, state.tabs.size)
        assertNull(state.selectedTabId)

        state = BrowserStateReducer.reduce(
            state,
            TabListAction.AddMultipleTabsAction(
                tabs = listOf(
                    createTab(id = "a", url = "https://www.mozilla.org", private = false),
                    createTab(id = "b", url = "https://www.firefox.com", private = true),
                ),
            ),
        )

        assertEquals(2, state.tabs.size)
        assertEquals("https://www.mozilla.org", state.tabs[0].content.url)
        assertEquals("https://www.firefox.com", state.tabs[1].content.url)
        assertNotNull(state.selectedTabId)
        assertEquals("a", state.selectedTabId)
    }

    @Test
    fun `AddMultipleTabsAction - Adds multiple tabs and does not update selection if one exists already`() {
        val initialState = BrowserState(
            tabs = listOf(createTab(id = "z", url = "https://getpocket.com")),
            selectedTabId = "z",
        )

        assertEquals(1, initialState.tabs.size)
        assertEquals("z", initialState.selectedTabId)

        val state = BrowserStateReducer.reduce(
            initialState,
            TabListAction.AddMultipleTabsAction(
                tabs = listOf(
                    createTab(id = "a", url = "https://www.mozilla.org", private = false),
                    createTab(id = "b", url = "https://www.firefox.com", private = true),
                ),
            ),
        )

        assertEquals(3, state.tabs.size)
        assertEquals("https://getpocket.com", state.tabs[0].content.url)
        assertEquals("https://www.mozilla.org", state.tabs[1].content.url)
        assertEquals("https://www.firefox.com", state.tabs[2].content.url)
        assertEquals("z", state.selectedTabId)
    }

    @Test
    fun `AddMultipleTabsAction - Non private tab will be selected`() {
        var state = BrowserState()

        assertEquals(0, state.tabs.size)
        assertNull(state.selectedTabId)

        state = BrowserStateReducer.reduce(
            state,
            TabListAction.AddMultipleTabsAction(
                tabs = listOf(
                    createTab(id = "a", url = "https://www.mozilla.org", private = true),
                    createTab(id = "b", url = "https://www.example.org", private = true),
                    createTab(id = "c", url = "https://www.firefox.com", private = false),
                    createTab(id = "d", url = "https://getpocket.com", private = true),
                ),
            ),
        )

        assertEquals(4, state.tabs.size)
        assertEquals("https://www.mozilla.org", state.tabs[0].content.url)
        assertEquals("https://www.example.org", state.tabs[1].content.url)
        assertEquals("https://www.firefox.com", state.tabs[2].content.url)
        assertEquals("https://getpocket.com", state.tabs[3].content.url)
        assertNotNull(state.selectedTabId)
        assertEquals("c", state.selectedTabId)
    }

    @Test
    fun `AddMultipleTabsAction - No tab will be selected if only private tabs are added`() {
        var state = BrowserState()

        assertEquals(0, state.tabs.size)
        assertNull(state.selectedTabId)

        state = BrowserStateReducer.reduce(
            state,
            TabListAction.AddMultipleTabsAction(
                tabs = listOf(
                    createTab(id = "a", url = "https://www.mozilla.org", private = true),
                    createTab(id = "b", url = "https://www.example.org", private = true),
                    createTab(id = "c", url = "https://getpocket.com", private = true),
                ),
            ),
        )

        assertEquals(3, state.tabs.size)
        assertEquals("https://www.mozilla.org", state.tabs[0].content.url)
        assertEquals("https://www.example.org", state.tabs[1].content.url)
        assertEquals("https://getpocket.com", state.tabs[2].content.url)
        assertNull(state.selectedTabId)
    }

    @Test
    fun `RemoveAllNormalTabsAction with private tab selected`() {
        val initialState = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org", private = true),
                createTab(id = "b", url = "https://www.example.org", private = false),
                createTab(id = "c", url = "https://www.firefox.com", private = false),
                createTab(id = "d", url = "https://getpocket.com", private = true),
            ),
            selectedTabId = "d",
        )

        val state =
            BrowserStateReducer.reduce(initialState, TabListAction.RemoveAllNormalTabsAction)

        assertEquals(0, state.normalTabs.size)
        assertEquals(2, state.privateTabs.size)
        assertEquals("d", state.selectedTabId)
    }

    @Test
    fun `RemoveAllNormalTabsAction with normal tab selected`() {
        val initialState = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org", private = true),
                createTab(id = "b", url = "https://www.example.org", private = false),
                createTab(id = "c", url = "https://www.firefox.com", private = false),
                createTab(id = "d", url = "https://getpocket.com", private = true),
            ),
            selectedTabId = "b",
        )

        val state =
            BrowserStateReducer.reduce(initialState, TabListAction.RemoveAllNormalTabsAction)

        assertEquals(0, state.normalTabs.size)
        assertEquals(2, state.privateTabs.size)
        assertNull(state.selectedTabId)
    }

    @Test
    fun `RemoveAllPrivateTabsAction with private tab selected`() {
        val initialState = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org", private = true),
                createTab(id = "b", url = "https://www.example.org", private = false),
                createTab(id = "c", url = "https://www.firefox.com", private = false),
                createTab(id = "d", url = "https://getpocket.com", private = true),
            ),
            selectedTabId = "d",
        )

        val state =
            BrowserStateReducer.reduce(initialState, TabListAction.RemoveAllPrivateTabsAction)

        assertEquals(2, state.normalTabs.size)
        assertEquals(0, state.privateTabs.size)
        assertEquals(null, state.selectedTabId)
    }

    @Test
    fun `RemoveAllPrivateTabsAction with private tab selected and no normal tabs`() {
        val initialState = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org", private = true),
                createTab(id = "b", url = "https://getpocket.com", private = true),
            ),
            selectedTabId = "b",
        )

        val state =
            BrowserStateReducer.reduce(initialState, TabListAction.RemoveAllPrivateTabsAction)

        assertEquals(0, state.normalTabs.size)
        assertEquals(0, state.privateTabs.size)
        assertNull(state.selectedTabId)
    }

    @Test
    fun `RemoveAllPrivateTabsAction with normal tab selected`() {
        val initialState = BrowserState(
            tabs = listOf(
                createTab(id = "a", url = "https://www.mozilla.org", private = true),
                createTab(id = "b", url = "https://www.example.org", private = false),
                createTab(id = "c", url = "https://www.firefox.com", private = false),
                createTab(id = "d", url = "https://getpocket.com", private = true),
            ),
            selectedTabId = "b",
        )

        val state =
            BrowserStateReducer.reduce(initialState, TabListAction.RemoveAllPrivateTabsAction)

        assertEquals(2, state.normalTabs.size)
        assertEquals(0, state.privateTabs.size)
        assertEquals("b", state.selectedTabId)
    }

    private fun assertSameTabs(a: BrowserState, b: List<TabSessionState>, str: String? = null) {
        val aMap = a.tabs.map { "<" + it.id + "," + it.content.url + ">\n" }
        val bMap = b.map { "<" + it.id + "," + it.content.url + ">\n" }
        assertEquals(str, aMap.toString(), bMap.toString())
    }

    private fun moveTabsAction(
        state: BrowserState,
        tabIds: List<String>,
        targetTabId: String,
        placeAfter: Boolean,
    ): BrowserState {
        return BrowserStateReducer.reduce(
            state,
            TabListAction.MoveTabsAction(
                tabIds,
                targetTabId,
                placeAfter,
            ),
        )
    }

    @Test
    fun `MoveTabsAction - Tabs move as expected`() {
        val tabList = listOf(
            createTab(id = "a", url = "https://www.mozilla.org"),
            createTab(id = "b", url = "https://www.firefox.com"),
            createTab(id = "c", url = "https://getpocket.com"),
            createTab(id = "d", url = "https://www.example.org"),
        )
        val initialState = BrowserState(
            tabs = tabList,
            selectedTabId = "a",
        )

        var state: BrowserState = moveTabsAction(initialState, listOf("a"), "a", false)
        assertSameTabs(state, tabList, "a to a-")
        state = moveTabsAction(initialState, listOf("a"), "a", true)
        assertSameTabs(state, tabList, "a to a+")
        state = moveTabsAction(initialState, listOf("a"), "b", false)
        assertSameTabs(state, tabList, "a to b-")

        state = moveTabsAction(initialState, listOf("a", "b"), "a", false)
        assertSameTabs(state, tabList, "a,b to a-")
        state = moveTabsAction(initialState, listOf("a", "b"), "a", true)
        assertSameTabs(state, tabList, "a,b to a+")
        state = moveTabsAction(initialState, listOf("a", "b"), "b", false)
        assertSameTabs(state, tabList, "a,b to b-")
        state = moveTabsAction(initialState, listOf("a", "b"), "b", true)
        assertSameTabs(state, tabList, "a,b to b+")
        state = moveTabsAction(initialState, listOf("a", "b"), "c", false)
        assertSameTabs(state, tabList, "a,b to c-")

        state = moveTabsAction(initialState, listOf("c", "d"), "c", false)
        assertSameTabs(state, tabList, "c,d to c-")
        state = moveTabsAction(initialState, listOf("c", "d"), "d", true)
        assertSameTabs(state, tabList, "c,d to d+")

        val movedTabList = listOf(
            createTab(id = "b", url = "https://www.firefox.com"),
            createTab(id = "c", url = "https://getpocket.com"),
            createTab(id = "a", url = "https://www.mozilla.org"),
            createTab(id = "d", url = "https://www.example.org"),
        )
        state = moveTabsAction(initialState, listOf("a"), "d", false)
        assertSameTabs(state, movedTabList, "a to d-")
        state = moveTabsAction(initialState, listOf("b", "c"), "a", true)
        assertSameTabs(state, tabList, "b,c to a+")

        state = moveTabsAction(initialState, listOf("a", "d"), "c", true)
        assertSameTabs(state, movedTabList, "a,d to c+")

        state = moveTabsAction(initialState, listOf("b", "c"), "d", false)
        assertSameTabs(state, tabList, "b,c to d-")
        assertEquals("a", state.selectedTabId)
    }

    @Test
    fun `MoveTabsAction - Complex moves work`() {
        val tabList = listOf(
            createTab(id = "a", url = "https://www.mozilla.org"),
            createTab(id = "b", url = "https://www.firefox.com"),
            createTab(id = "c", url = "https://getpocket.com"),
            createTab(id = "d", url = "https://www.example.org"),
            createTab(id = "e", url = "https://www.mozilla.org/en-US/firefox/features/"),
            createTab(id = "f", url = "https://www.mozilla.org/en-US/firefox/products/"),
        )
        val initialState = BrowserState(
            tabs = tabList,
            selectedTabId = "a",
        )

        var state =
            moveTabsAction(initialState, listOf("a", "b", "c", "d", "e", "f"), "a", false)
        assertSameTabs(state, tabList, "all to a-")

        val movedTabList = listOf(
            createTab(id = "a", url = "https://www.mozilla.org"),
            createTab(id = "c", url = "https://getpocket.com"),
            createTab(id = "b", url = "https://www.firefox.com"),
            createTab(id = "e", url = "https://www.mozilla.org/en-US/firefox/features/"),
            createTab(id = "d", url = "https://www.example.org"),
            createTab(id = "f", url = "https://www.mozilla.org/en-US/firefox/products/"),
        )
        state = moveTabsAction(initialState, listOf("b", "e"), "d", false)
        assertSameTabs(state, movedTabList, "b,e to d-")

        state = moveTabsAction(initialState, listOf("c", "d"), "b", true)
        assertSameTabs(state, tabList, "c,d to b+")
    }

    @Test
    fun `WHEN an unselected child tab is closed THEN the tab that is selected remains selected`() {
        var state = BrowserState()

        val parent = createTab("https://www.mozilla.org")
        val child = createTab("https://www.mozilla.org/en-US/internet-health/", parent = parent)
        val nonChildTab = createTab("https://www.firefox.com")

        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(parent))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(nonChildTab))
        state = BrowserStateReducer.reduce(state, TabListAction.AddTabAction(child))

        state = BrowserStateReducer.reduce(state, TabListAction.SelectTabAction(nonChildTab.id))
        state = BrowserStateReducer.reduce(
            state,
            TabListAction.RemoveTabAction(child.id, selectParentIfExists = true),
        )

        assertEquals(nonChildTab.id, state.selectedTabId)
        assertEquals(nonChildTab.content.url, state.selectedTab?.content?.url)
    }
}
