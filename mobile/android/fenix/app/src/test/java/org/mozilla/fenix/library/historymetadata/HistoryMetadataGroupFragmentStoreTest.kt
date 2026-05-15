/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.library.historymetadata

import kotlinx.coroutines.test.runTest
import mozilla.components.concept.storage.HistoryMetadataKey
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mozilla.fenix.library.history.History
import org.mozilla.fenix.library.history.HistoryItemTimeGroup
import org.mozilla.fenix.library.history.PendingDeletionHistory
import org.mozilla.fenix.library.history.toPendingDeletionHistory

class HistoryMetadataGroupFragmentStoreTest {

    private lateinit var state: HistoryMetadataGroupFragmentState
    private lateinit var store: HistoryMetadataGroupFragmentStore

    private val mozillaHistoryMetadataItem = History.Metadata(
        position = 1,
        title = "Mozilla",
        url = "mozilla.org",
        visitedAt = 0,
        historyTimeGroup = HistoryItemTimeGroup.timeGroupForTimestamp(0),
        totalViewTime = 0,
        historyMetadataKey = HistoryMetadataKey("http://www.mozilla.com", "mozilla", null),
    )
    private val firefoxHistoryMetadataItem = History.Metadata(
        position = 1,
        title = "Firefox",
        url = "firefox.com",
        visitedAt = 0,
        historyTimeGroup = HistoryItemTimeGroup.timeGroupForTimestamp(0),
        totalViewTime = 0,
        historyMetadataKey = HistoryMetadataKey("http://www.firefox.com", "mozilla", null),
    )
    private val pendingDeletionItem = mozillaHistoryMetadataItem.toPendingDeletionHistory()

    @Before
    fun setup() {
        state = HistoryMetadataGroupFragmentState(
            items = emptyList(),
            pendingDeletionItems = emptySet(),
            isEmpty = true,
        )
        store = HistoryMetadataGroupFragmentStore(state)
    }

    @Test
    fun `Test updating the items in HistoryMetadataGroupFragmentStore`() = runTest {
        assertEquals(0, store.state.items.size)

        val items = listOf(mozillaHistoryMetadataItem, firefoxHistoryMetadataItem)
        store.dispatch(HistoryMetadataGroupFragmentAction.UpdateHistoryItems(items))

        assertEquals(items, store.state.items)
    }

    @Test
    fun `Test selecting and deselecting an item in HistoryMetadataGroupFragmentStore`() = runTest {
        val items = listOf(mozillaHistoryMetadataItem, firefoxHistoryMetadataItem)

        store.dispatch(HistoryMetadataGroupFragmentAction.UpdateHistoryItems(items))

        assertFalse(store.state.items[0].selected)
        assertFalse(store.state.items[1].selected)

        store.dispatch(HistoryMetadataGroupFragmentAction.Select(mozillaHistoryMetadataItem))

        assertTrue(store.state.items[0].selected)
        assertFalse(store.state.items[1].selected)

        store.dispatch(HistoryMetadataGroupFragmentAction.Deselect(store.state.items[0]))

        assertFalse(store.state.items[0].selected)
        assertFalse(store.state.items[1].selected)
    }

    @Test
    fun `Test deselecting all items in HistoryMetadataGroupFragmentStore`() = runTest {
        val items = listOf(mozillaHistoryMetadataItem, firefoxHistoryMetadataItem)

        store.dispatch(HistoryMetadataGroupFragmentAction.UpdateHistoryItems(items))
        store.dispatch(HistoryMetadataGroupFragmentAction.Select(mozillaHistoryMetadataItem))
        store.dispatch(HistoryMetadataGroupFragmentAction.DeselectAll)

        assertFalse(store.state.items[0].selected)
        assertFalse(store.state.items[1].selected)
    }

    @Test
    fun `Test deleting an item in HistoryMetadataGroupFragmentStore`() = runTest {
        val items = listOf(mozillaHistoryMetadataItem, firefoxHistoryMetadataItem)

        store.dispatch(HistoryMetadataGroupFragmentAction.UpdateHistoryItems(items))
        store.dispatch(HistoryMetadataGroupFragmentAction.Delete(mozillaHistoryMetadataItem))

        assertEquals(1, store.state.items.size)
        assertEquals(firefoxHistoryMetadataItem, store.state.items.first())
    }

    @Test
    fun `Test deleting all items in HistoryMetadataGroupFragmentStore`() = runTest {
        val items = listOf(mozillaHistoryMetadataItem, firefoxHistoryMetadataItem)

        store.dispatch(HistoryMetadataGroupFragmentAction.UpdateHistoryItems(items))
        store.dispatch(HistoryMetadataGroupFragmentAction.DeleteAll)

        assertEquals(0, store.state.items.size)
    }

    @Test
    fun `Test changing the empty state of HistoryMetadataGroupFragmentStore`() = runTest {
        store.dispatch(HistoryMetadataGroupFragmentAction.ChangeEmptyState(false))
        assertFalse(store.state.isEmpty)

        store.dispatch(HistoryMetadataGroupFragmentAction.ChangeEmptyState(true))
        assertTrue(store.state.isEmpty)
    }

    @Test
    fun `Test updating pending deletion items in HistoryMetadataGroupFragmentStore`() = runTest {
        store.dispatch(HistoryMetadataGroupFragmentAction.UpdatePendingDeletionItems(setOf(pendingDeletionItem)))
        assertEquals(setOf(pendingDeletionItem), store.state.pendingDeletionItems)

        store.dispatch(HistoryMetadataGroupFragmentAction.UpdatePendingDeletionItems(setOf()))
        assertEquals(emptySet<PendingDeletionHistory>(), store.state.pendingDeletionItems)
    }
}
