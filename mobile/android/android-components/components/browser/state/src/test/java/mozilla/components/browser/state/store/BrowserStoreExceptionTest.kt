/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.store

import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.browser.state.action.TabGroupAction
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.TabGroup
import mozilla.components.browser.state.state.TabPartition
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.state.recover.toRecoverableTab
import org.junit.Test
import org.junit.runner.RunWith

// These tests are in a separate class because they needs to run with
// Robolectric (different runner, slower) while all other tests only
// need a Java VM (fast).
@RunWith(AndroidJUnit4::class)
class BrowserStoreExceptionTest {

    @Test(expected = IllegalArgumentException::class)
    fun `AddTabAction - Exception is thrown if parent doesn't exist`() {
        val store = BrowserStore()
        val parent = createTab("https://www.mozilla.org")
        val child = createTab("https://www.firefox.com", parent = parent)

        store.dispatch(TabListAction.AddTabAction(child))
    }

    @Test(expected = IllegalArgumentException::class)
    fun `AddTabAction - Exception is thrown if tab already exists`() {
        val store = BrowserStore()
        val tab1 = createTab("https://www.mozilla.org")
        store.dispatch(TabListAction.AddTabAction(tab1))
        store.dispatch(TabListAction.AddTabAction(tab1))
    }

    @Test(expected = IllegalArgumentException::class)
    fun `RestoreTabAction - Exception is thrown if tab already exists`() {
        val store = BrowserStore()
        val tab1 = createTab("https://www.mozilla.org")
        store.dispatch(TabListAction.AddTabAction(tab1))
        store.dispatch(
            TabListAction.RestoreAction(
                listOf(tab1.toRecoverableTab()),
                restoreLocation = TabListAction.RestoreAction.RestoreLocation.BEGINNING,
            ),
        )
    }

    @Test(expected = IllegalArgumentException::class)
    fun `AddMultipleTabsAction - Exception is thrown in tab with id already exists`() {
        val store = BrowserStore(
            BrowserState(
                tabs = listOf(
                    createTab(id = "a", url = "https://www.mozilla.org"),
                ),
            ),
        )

        store.dispatch(
            TabListAction.AddMultipleTabsAction(
                tabs = listOf(
                    createTab(id = "a", url = "https://www.example.org"),
                ),
            ),
        )
    }

    @Test(expected = IllegalArgumentException::class)
    fun `AddMultipleTabsAction - Exception is thrown if parent id is set`() {
        val store = BrowserStore()

        val tab1 = createTab(
            id = "a",
            url = "https://www.mozilla.org",
        )

        val tab2 = createTab(
            id = "b",
            url = "https://www.firefox.com",
            private = true,
            parent = tab1,
        )

        store.dispatch(
            TabListAction.AddMultipleTabsAction(
                tabs = listOf(tab1, tab2),
            ),
        )
    }

    @Test(expected = IllegalArgumentException::class)
    fun `AddTabGroupAction - Exception is thrown when group already exists`() {
        val partitionId = "testFeaturePartition"
        val testGroup = TabGroup("test")
        val store = BrowserStore(
            BrowserState(
                tabPartitions = mapOf(
                    partitionId to TabPartition(
                        partitionId,
                        tabGroups = listOf(testGroup),
                    ),
                ),
            ),
        )

        store.dispatch(
            TabGroupAction.AddTabGroupAction(
                partition = partitionId,
                group = testGroup,
            ),
        )
    }

    @Test(expected = IllegalArgumentException::class)
    fun `AddTabGroupAction - Asserts that tabs exist`() {
        val store = BrowserStore()

        val partition = "testFeaturePartition"
        val testGroup = TabGroup("test", tabIds = setOf("invalid"))
        store.dispatch(
            TabGroupAction.AddTabGroupAction(
                partition = partition,
                group = testGroup,
            ),
        )
    }

    @Test(expected = IllegalArgumentException::class)
    fun `AddTabAction - Asserts that tab exists when adding to group`() {
        val tabGroup = TabGroup("test1", tabIds = emptySet())
        val tabPartition = TabPartition("testFeaturePartition", tabGroups = listOf(tabGroup))

        val store = BrowserStore(
            BrowserState(
                tabs = listOf(),
                tabPartitions = mapOf("testFeaturePartition" to tabPartition),
            ),
        )

        val tab = createTab(id = "tab1", url = "https://firefox.com")
        store.dispatch(TabGroupAction.AddTabAction(tabPartition.id, tabGroup.id, tab.id))
    }

    @Test(expected = IllegalArgumentException::class)
    fun `AddTabsAction - Asserts that tabs exist when adding to group`() {
        val tabGroup = TabGroup("test1", tabIds = emptySet())
        val tabPartition = TabPartition("testFeaturePartition", tabGroups = listOf(tabGroup))
        val tab1 = createTab(id = "tab1", url = "https://firefox.com")
        val tab2 = createTab(id = "tab2", url = "https://mozilla.org")

        val store = BrowserStore(
            BrowserState(
                tabs = listOf(tab1),
                tabPartitions = mapOf("testFeaturePartition" to tabPartition),
            ),
        )

        store.dispatch(
            TabGroupAction.AddTabsAction(tabPartition.id, tabGroup.id, setOf(tab1.id, tab2.id)),
        )
    }
}
