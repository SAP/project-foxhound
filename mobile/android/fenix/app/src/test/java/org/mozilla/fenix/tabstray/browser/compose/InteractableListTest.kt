/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.browser.compose

import androidx.compose.foundation.lazy.LazyListItemInfo
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.hapticfeedback.HapticFeedback
import androidx.compose.ui.unit.IntSize
import io.mockk.Runs
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.tabstray.browser.compose.interactable.InteractionMode
import org.mozilla.fenix.tabstray.browser.compose.interactable.InteractionState
import org.mozilla.fenix.tabstray.browser.compose.interactable.InteractionType
import org.mozilla.fenix.tabstray.browser.compose.interactable.ListInteractionState
import org.mozilla.fenix.tabstray.browser.compose.interactable.ListInteractionStateImpl
import org.mozilla.fenix.tabstray.browser.compose.interactable.ListItemOffset
import org.mozilla.fenix.tabstray.browser.compose.interactable.closestDistanceTo
import org.mozilla.fenix.tabstray.browser.compose.interactable.closestPointTo
import org.mozilla.fenix.tabstray.browser.compose.interactable.gatherCandidates
import org.mozilla.fenix.tabstray.controller.NoOpTabInteractionHandler
import org.mozilla.fenix.tabstray.controller.TabInteractionHandler
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNull

class InteractableListTest {
    private val testDispatcher = StandardTestDispatcher()
    private val scope = TestScope(testDispatcher)

    private val defaultIgnoredItems = setOf("header", "span")

    @Test
    fun `GIVEN a y value is inside the Rect THEN closestDistanceTo returns 0`() {
        val rect = Rect(
            left = 0f,
            top = 0f,
            right = 100f,
            bottom = 100f,
        )
        assertEquals(0f, rect.closestDistanceTo(50f))
    }

    @Test
    fun `GIVEN a y value is to the top of a rect THEN closestDistanceTo returns squared distance from top edge`() {
        val rect = Rect(
            left = 0f,
            top = 0f,
            right = 100f,
            bottom = 100f,
        )
        assertEquals(100f, rect.closestDistanceTo(-10f))
    }

    @Test
    fun `GIVEN a y value is to the bottom of a rect THEN closestDistanceTo returns squared distance from bottom edge`() {
        val rect = Rect(
            left = 0f,
            top = 0f,
            right = 100f,
            bottom = 100f,
        )
        assertEquals(100f, rect.closestDistanceTo(110f))
    }

    @Test
    fun `Given a y value is inside a Rect THEN closestPointTo returns the same value`() {
        val rect = Rect(
            left = 0f,
            top = 0f,
            right = 100f,
            bottom = 100f,
        )
        val y = 50f
        assertEquals(y, rect.closestPointTo(y))
    }

    @Test
    fun `Given a y value is to the top of a rect THEN closestPointTo returns the top edge`() {
        val rect = Rect(
            left = 0f,
            top = 0f,
            right = 100f,
            bottom = 100f,
        )
        val y = rect.closestPointTo(-10f)
        assertEquals(y, rect.top)
    }

    @Test
    fun `Given a point is to the bottom of a rect THEN closestPointTo returns the bottom edge`() {
        val rect = Rect(
            left = 0f,
            top = 0f,
            right = 100f,
            bottom = 100f,
        )
        val y = rect.closestPointTo(110f)
        assertEquals(y, rect.bottom)
    }

    @Test
    fun `GIVEN a visible ListItem WHEN gatherCandidates is called THEN Overlap, Top and Bottom gutter candidates are created`() {
        val listState = mockListState(listOf(mockListItem("key"), mockListItem("key2")))

        val candidates = gatherCandidates(
            listState = listState,
            draggedItemOffset = fakeDraggedListItemOffset(),
            draggedItem = InteractionState.List.Active(
                index = 0,
                key = "key",
                initialOffset = 0f,
            ),
            ignoredItems = defaultIgnoredItems,
        )
        assertTrue(
            candidates.any { it.type is InteractionType.Overlap } &&
                candidates.any { it.type is InteractionType.TopGutter } &&
                candidates.any { it.type is InteractionType.BottomGutter } &&
                candidates.size == 3,
        )
    }

    @Test
    fun `GIVEN the first visible item is not the first in the list AND dragged item is at top of viewport WHEN gatherCandidates is called THEN top Scroll candidate is created`() {
        val listState = mockListState(
            listOf(
                mockListItem("key"),
                mockListItem("key2"),
                mockListItem("key3"),
            ),
            firstVisibleIndex = 1,
        )

        val candidates = gatherCandidates(
            listState = listState,
            draggedItemOffset = fakeDraggedListItemOffset(),
            draggedItem = InteractionState.List.Active(
                index = 0,
                key = "key",
                initialOffset = 0f,
            ),
            ignoredItems = defaultIgnoredItems,
        )
        assertTrue(
            candidates.filter { it.type is InteractionType.Scroll }.size == 1,
        )
    }

    @Test
    fun `GIVEN the last visible item is not the last in the list AND dragged item is at bottom of viewport WHEN gatherCandidates is called THEN bottom Scroll candidate is created`() {
        val listState = mockListState(
            listOf(
                mockListItem("key"),
                mockListItem("key2"),
                mockListItem("key3"),
            ),
            firstVisibleIndex = 0,
            totalItems = 10,
        )

        val draggedItem = InteractionState.List.Active(
            index = 0,
            key = "key",
            initialOffset = 10f,
        )
        val candidates = gatherCandidates(
            listState = listState,
            draggedItemOffset = ListItemOffset(
                draggedItem = draggedItem,
                draggingItemOffset = 10f,
                itemSize = 10,
            ),
            draggedItem = draggedItem,
            ignoredItems = defaultIgnoredItems,
        )
        assertTrue(
            candidates.filter { it.type is InteractionType.Scroll }.size == 1,
        )
    }

    @Test
    fun `GIVEN an ignored ListItem THEN no candidates are generated`() {
        val listState = mockListState(mockItems = listOf(mockListItem("ignored")))

        val candidates = gatherCandidates(
            listState = listState,
            draggedItemOffset = fakeDraggedListItemOffset(),
            draggedItem = InteractionState.List.Active(
                index = 0,
                key = "key",
                initialOffset = 0f,
            ),
            ignoredItems = setOf("ignored"),
        )
        assertTrue(
            candidates.isEmpty(),
        )
    }

    @Test
    fun `GIVEN an empty list THEN no candidates are generated`() {
        val listState = mockListState(mockItems = emptyList())

        val candidates = gatherCandidates(
            listState = listState,
            draggedItemOffset = fakeDraggedListItemOffset(),
            draggedItem = InteractionState.List.Active(
                index = 0,
                key = "key",
                initialOffset = .0f,
            ),
            ignoredItems = defaultIgnoredItems,
        )
        assertTrue(
            candidates.isEmpty(),
        )
    }

    @Test
    fun `GIVEN an item is dragged onto another WHEN onDragEnd is called THEN onDrop is called`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val dragItemOffset = 120
        val targetItemOffset = 140
        val reorderState = fakeListInteractionState(
            mockListState(
                mockItems = listOf(
                    mockk<LazyListItemInfo> {
                        every { key } returns "header"
                        every { index } returns 0
                        every { size } returns 100
                        every { offset } returns 0
                    },
                    mockk<LazyListItemInfo> {
                        every { key } returns "key1"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns dragItemOffset
                    },
                    mockk<LazyListItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns targetItemOffset
                    },
                ),
            ),
            handler = handler,
        )

        reorderState.onTouchSlopPassed(dragItemOffset.toFloat(), false)
        reorderState.onDrag(offset = 20f, preserveSelectMode = false) // 20 down
        reorderState.onDragEnd()

        verify { handler.onDrop("key1", "key2") }
    }

    @Test
    fun `GIVEN drag and drop disabled and an item is dragged onto another WHEN onDragEnd is called THEN onDrop is not called`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val dragItemOffset = 120
        val targetItemOffset = 140
        val reorderState = fakeListInteractionState(
            listState = mockListState(
                mockItems = listOf(
                    mockk<LazyListItemInfo> {
                        every { key } returns "header"
                        every { index } returns 0
                        every { size } returns 100
                        every { offset } returns 0
                    },
                    mockk<LazyListItemInfo> {
                        every { key } returns "key1"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns dragItemOffset
                    },
                    mockk<LazyListItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns targetItemOffset
                    },
                ),
            ),
            handler = handler,
            dragAndDropEnabled = false,
        )

        reorderState.onTouchSlopPassed(dragItemOffset.toFloat(), false)
        reorderState.onDrag(offset = 20f, preserveSelectMode = false) // 20 down
        reorderState.onDragEnd()

        verify(exactly = 0) { handler.onDrop("key1", "key2") }
        verify { handler.onMove("key1", "key2", false) }
    }

    @Test
    fun `GIVEN an item is dragged to the bottom of another WHEN onDragEnd is called THEN onMove is called`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val dragItemOffset = 110
        val targetItemOffset = 130
        val reorderState = fakeListInteractionState(
            mockListState(
                mockItems = listOf(
                    mockk<LazyListItemInfo> {
                        every { key } returns "header"
                        every { index } returns 0
                        every { size } returns 100
                        every { offset } returns 0
                    },
                    mockk<LazyListItemInfo> {
                        every { key } returns "key1"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns dragItemOffset
                    },
                    mockk<LazyListItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 2
                        every { size } returns 10
                        every { offset } returns targetItemOffset
                    },
                ),
            ),
            handler = handler,
        )

        reorderState.onTouchSlopPassed(dragItemOffset.toFloat(), false)
        reorderState.onDrag(offset = 50f, preserveSelectMode = false) // 50 down
        reorderState.onDragEnd()

        verify { handler.onMove("key1", "key2", true) }
    }

    @Test
    fun `GIVEN an item is dragged to the top of another WHEN onDragEnd is called THEN onMove is called`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val dragItemOffset = 30
        val targetItemOffset = 10
        val reorderState = fakeListInteractionState(
            mockListState(
                mockItems = listOf(
                    mockk<LazyListItemInfo> {
                        every { key } returns "key1"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns targetItemOffset
                    },
                    mockk<LazyListItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 2
                        every { size } returns 10
                        every { offset } returns dragItemOffset
                    },
                ),
            ),
            handler = handler,
        )

        reorderState.onTouchSlopPassed(dragItemOffset.toFloat(), false)
        reorderState.onDrag(offset = -30f, preserveSelectMode = false) // 30 up
        reorderState.onDragEnd()

        verify { handler.onMove("key2", "key1", false) }
    }

    @Test
    fun `GIVEN a drag is in progress and the dragged item is not visible when onDragEnd is called THEN the state is reset`() {
        val reorderState = fakeListInteractionState(listState = mockListState(mockItems = emptyList()))

        reorderState.onTouchSlopPassed(0f, false)
        reorderState.onDragEnd()

        assertEquals(InteractionState.List.None, reorderState.draggedItem)
        assertEquals(InteractionState.List.None, reorderState.hoveredItem)
        assertNull(reorderState.highlightedRect)
        assertEquals(InteractionMode.List.None, reorderState.interactionMode)
    }

    @Test
    fun `GIVEN a drag is in progress and the dragged item is not visible when onDragEnd is called THEN onDragCancelled is called`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val draggedItemOffset = 30
        val reorderState = fakeListInteractionState(
            mockListState(
                mockItems = listOf(
                    mockk<LazyListItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns draggedItemOffset
                    },
                ),
            ),
            handler = handler,
        )

        reorderState.onTouchSlopPassed(draggedItemOffset.toFloat(), false)
        reorderState.onDrag(offset = 50f, preserveSelectMode = false)
        reorderState.onDragEnd()

        verify { handler.onDragCancel() }
    }

    @Test
    fun `WHEN an item is dragged GIVEN preserveSelectMode is true THEN onDragStart is called with the same flag`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val dragItemOffset = 10
        val targetItemOffset = 30
        val reorderState = fakeListInteractionState(
            mockListState(
                mockItems = listOf(
                    mockk<LazyListItemInfo> {
                        every { key } returns "key1"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns dragItemOffset
                    },
                    mockk<LazyListItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns targetItemOffset
                    },
                ),
            ),
            handler = handler,
        )

        reorderState.onTouchSlopPassed(dragItemOffset.toFloat(), true)
        reorderState.onDrag(offset = 50f, preserveSelectMode = true) // 50 down

        verify { handler.onDragStart(sourceKey = "key1", preserveSelectMode = true) }
    }

    @Test
    fun `WHEN an item is dragged GIVEN preserveSelectMode is false THEN onDragStart is called with the same flag`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val dragItemOffset = 10
        val targetItemOffset = 30
        val reorderState = fakeListInteractionState(
            mockListState(
                mockItems = listOf(
                    mockk<LazyListItemInfo> {
                        every { key } returns "key1"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns dragItemOffset
                    },
                    mockk<LazyListItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns targetItemOffset
                    },
                ),
            ),
            handler = handler,
        )

        reorderState.onTouchSlopPassed(dragItemOffset.toFloat(), true)
        reorderState.onDrag(offset = 50f, preserveSelectMode = false) // 50 down

        verify { handler.onDragStart(sourceKey = "key1", preserveSelectMode = false) }
    }

    @Test
    fun `WHEN a drag is cancelled THEN the handler is invoked with a drag cancel call`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val dragItemOffset = 10
        val targetItemOffset = 30
        val reorderState = fakeListInteractionState(
            mockListState(
                mockItems = listOf(
                    mockk<LazyListItemInfo> {
                        every { key } returns "key1"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns dragItemOffset
                    },
                    mockk<LazyListItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns targetItemOffset
                    },
                ),
            ),
            handler = handler,
        )

        reorderState.onTouchSlopPassed(offset = dragItemOffset.toFloat(), shouldLongPress = false)
        reorderState.onDrag(offset = 50f, preserveSelectMode = false)
        reorderState.onDragCancelled()

        verify { handler.onDragCancel() }
    }

    @Test
    fun `WHEN a drag starts and the pointer does not move THEN the moved parameter is false`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val dragItemOffset = 10
        val targetItemOffset = 30
        val reorderState = fakeListInteractionState(
            mockListState(
                mockItems = listOf(
                    mockk<LazyListItemInfo> {
                        every { key } returns "key1"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns dragItemOffset
                    },
                    mockk<LazyListItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns targetItemOffset
                    },
                ),
            ),
            handler = handler,
        )

        reorderState.onTouchSlopPassed(offset = dragItemOffset.toFloat(), shouldLongPress = false)

        assertIs<InteractionState.List.Active>(reorderState.draggedItem)
        assertFalse(reorderState.draggedItem.moved)
    }

    @Test
    fun `WHEN a drag starts and the pointer moves THEN the moved parameter is true`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val dragItemOffset = 10
        val targetItemOffset = 30
        val reorderState = fakeListInteractionState(
            mockListState(
                mockItems = listOf(
                    mockk<LazyListItemInfo> {
                        every { key } returns "key1"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns dragItemOffset
                    },
                    mockk<LazyListItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns targetItemOffset
                    },
                ),
            ),
            handler = handler,
        )

        reorderState.onTouchSlopPassed(offset = dragItemOffset.toFloat(), shouldLongPress = false)
        reorderState.onDrag(40f, true)
        assertIs<InteractionState.List.Active>(reorderState.draggedItem)
        assertTrue(reorderState.draggedItem.moved)
    }

    @Test
    fun `GIVEN an in progress drag WHEN onCancelled is called THEN the dragged item is reset to None and moved is false`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val dragItemOffset = 10
        val targetItemOffset = 30
        val reorderState = fakeListInteractionState(
            mockListState(
                mockItems = listOf(
                    mockk<LazyListItemInfo> {
                        every { key } returns "key1"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns dragItemOffset
                    },
                    mockk<LazyListItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns targetItemOffset
                    },
                ),
            ),
            handler = handler,
        )

        reorderState.onTouchSlopPassed(offset = dragItemOffset.toFloat(), shouldLongPress = false)
        reorderState.onDrag(40f, true)
        reorderState.onDragCancelled()
        assertIs<InteractionState.List.None>(reorderState.draggedItem)
        assertFalse(reorderState.draggedItem.moved)
    }

    @Test
    fun `GIVEN a large ignored header item WHEN itemSize is called it retrieves a regular tab item size`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val dragItemOffset = 10
        val targetItemOffset = 30
        val reorderState = fakeListInteractionState(
            mockListState(
                mockItems = listOf(
                    mockk<LazyListItemInfo> {
                        every { key } returns "header"
                        every { index } returns 1
                        every { size } returns 10000
                        every { offset } returns 0
                    },
                    mockk<LazyListItemInfo> {
                        every { key } returns "key1"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns dragItemOffset
                    },
                    mockk<LazyListItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 1
                        every { size } returns 10
                        every { offset } returns targetItemOffset
                    },
                ),
            ),
            handler = handler,
        )

        assertEquals(reorderState.itemSize, 10)
    }

    private fun mockListItem(mockItemKey: String = "key"): LazyListItemInfo {
        return mockk<LazyListItemInfo> {
            every { key } returns mockItemKey
            every { index } returns 1
            every { size } returns 10
            every { offset } returns 0
        }
    }

    private fun mockListState(
        mockItems: List<LazyListItemInfo> = emptyList(),
        firstVisibleIndex: Int = 0,
        totalItems: Int = mockItems.size,
    ): LazyListState {
        return mockk<LazyListState> {
            every { firstVisibleItemIndex } returns firstVisibleIndex
            every { layoutInfo } returns
                mockk {
                    every { visibleItemsInfo } returns mockItems
                    every { viewportSize } returns IntSize(10, 10)
                    every { firstVisibleItemIndex } returns firstVisibleIndex
                    every { totalItemsCount } returns totalItems
                    every { mainAxisItemSpacing } returns 10
                    every { beforeContentPadding } returns 10
                    every { viewportStartOffset } returns 0
                    every { viewportEndOffset } returns 10
                }
            every { isScrollInProgress } returns false
        }
    }

    private fun fakeListInteractionState(
        listState: LazyListState,
        handler: TabInteractionHandler = NoOpTabInteractionHandler,
        dragAndDropEnabled: Boolean = true,
    ): ListInteractionState {
        return ListInteractionStateImpl(
            listState = listState,
            tabInteractionHandler = handler,
            scope = scope,
            touchSlop = 0f,
            ignoredItems = defaultIgnoredItems,
            onLongPress = { _ -> },
            hapticFeedback = mockk<HapticFeedback> {
                every { performHapticFeedback(any()) } just Runs
            },
            dragAndDropEnabled = dragAndDropEnabled,
        )
    }
}
