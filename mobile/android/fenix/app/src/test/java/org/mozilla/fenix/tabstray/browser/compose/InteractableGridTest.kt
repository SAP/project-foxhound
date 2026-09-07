/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.browser.compose

import androidx.compose.foundation.lazy.grid.LazyGridItemInfo
import androidx.compose.foundation.lazy.grid.LazyGridState
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.hapticfeedback.HapticFeedback
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.toOffset
import io.mockk.Runs
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.tabstray.browser.compose.interactable.GridInteractionState
import org.mozilla.fenix.tabstray.browser.compose.interactable.GridInteractionStateImpl
import org.mozilla.fenix.tabstray.browser.compose.interactable.GridItemOffset
import org.mozilla.fenix.tabstray.browser.compose.interactable.InteractionMode
import org.mozilla.fenix.tabstray.browser.compose.interactable.InteractionState
import org.mozilla.fenix.tabstray.browser.compose.interactable.InteractionType
import org.mozilla.fenix.tabstray.browser.compose.interactable.closestDistanceTo
import org.mozilla.fenix.tabstray.browser.compose.interactable.closestPointTo
import org.mozilla.fenix.tabstray.browser.compose.interactable.gatherCandidates
import org.mozilla.fenix.tabstray.controller.NoOpTabInteractionHandler
import org.mozilla.fenix.tabstray.controller.TabInteractionHandler
import kotlin.test.assertEquals
import kotlin.test.assertNull

class InteractableGridTest {
    private val testDispatcher = StandardTestDispatcher()
    private val scope = TestScope(testDispatcher)
    private val defaultIgnoredItems = setOf("header", "span")

    @Test
    fun `GIVEN a point is inside the Rect THEN closestDistanceTo returns 0`() {
        val rect = Rect(
            left = 0f,
            top = 0f,
            right = 100f,
            bottom = 100f,
        )
        assertEquals(0f, rect.closestDistanceTo(Offset(50f, 50f)))
    }

    @Test
    fun `GIVEN a point is to the right of a rect THEN closestDistanceTo returns squared distance from right edge`() {
        val rect = Rect(
            left = 0f,
            top = 0f,
            right = 100f,
            bottom = 100f,
        )
        // (110 - 100) ^2 = 100
        assertEquals(100f, rect.closestDistanceTo(Offset(110f, 50f)))
    }

    @Test
    fun `GIVEN a point is to the left of a rect THEN closestDistanceTo returns squared distance from left edge`() {
        val rect = Rect(
            left = 0f,
            top = 0f,
            right = 100f,
            bottom = 100f,
        )
        // (110 - 100) ^2 = 100
        assertEquals(100f, rect.closestDistanceTo(Offset(-10f, 50f)))
    }

    @Test
    fun `GIVEN a point is to the top of a rect THEN closestDistanceTo returns squared distance from top edge`() {
        val rect = Rect(
            left = 0f,
            top = 0f,
            right = 100f,
            bottom = 100f,
        )
        // (110 - 100) ^2 = 100
        assertEquals(100f, rect.closestDistanceTo(Offset(50f, -10f)))
    }

    @Test
    fun `GIVEN a point is to the bottom of a rect THEN closestDistanceTo returns squared distance from bottom edge`() {
        val rect = Rect(
            left = 0f,
            top = 0f,
            right = 100f,
            bottom = 100f,
        )
        // (110 - 100) ^2 = 100
        assertEquals(100f, rect.closestDistanceTo(Offset(50f, 110f)))
    }

    @Test
    fun `Given a point is inside a Rect THEN closestPointTo returns the same point`() {
        val rect = Rect(
            left = 0f,
            top = 0f,
            right = 100f,
            bottom = 100f,
        )
        val point = Offset(50f, 50f)
        assertEquals(point, rect.closestPointTo(point))
    }

    @Test
    fun `Given a point is to the right of a rect THEN closestPointTo returns the right edge`() {
        val rect = Rect(
            left = 0f,
            top = 0f,
            right = 100f,
            bottom = 100f,
        )
        val point = rect.closestPointTo(Offset(110f, 50f))
        assertEquals(point.x, rect.right)
    }

    @Test
    fun `Given a point is to the top of a rect THEN closestPointTo returns the top edge`() {
        val rect = Rect(
            left = 0f,
            top = 0f,
            right = 100f,
            bottom = 100f,
        )
        val point = rect.closestPointTo(Offset(50f, -10f))
        assertEquals(point.y, rect.top)
    }

    @Test
    fun `Given a point is to the left of a rect THEN closestPointTo returns the left edge`() {
        val rect = Rect(
            left = 0f,
            top = 0f,
            right = 100f,
            bottom = 100f,
        )
        val point = rect.closestPointTo(Offset(-10f, 50f))
        assertEquals(point.x, rect.left)
    }

    @Test
    fun `Given a point is to the bottom of a rect THEN closestPointTo returns the bottom edge`() {
        val rect = Rect(
            left = 0f,
            top = 0f,
            right = 100f,
            bottom = 100f,
        )
        val point = rect.closestPointTo(Offset(50f, 110f))
        assertEquals(point.y, rect.bottom)
    }

    @Test
    fun `GIVEN a visible GridItem WHEN gatherCandidates is called THEN Overlap, Left and Right gutter candidates are created`() {
        val gridState = mockGridState(listOf(mockGridItem("key"), mockGridItem("key2")))

        val candidates = gatherCandidates(
            gridState = gridState,
            draggedItemOffset = fakeDraggedGridItemOffset(),
            draggedItem = InteractionState.Grid.Active(
                index = 0,
                key = "key",
                initialOffset = Offset.Zero,
            ),
            ignoredItems = defaultIgnoredItems,
        )
        assertTrue(
            candidates.any { it.type is InteractionType.Overlap } &&
                candidates.any { it.type is InteractionType.LeftGutter } &&
                candidates.any { it.type is InteractionType.RightGutter } &&
                candidates.size == 3,
        )
    }

    @Test
    fun `GIVEN the first visible item is not the first in the list AND dragged item is at top of viewport WHEN gatherCandidates is called THEN top Scroll candidate is created`() {
        val gridState = mockGridState(
            listOf(
                mockGridItem("key"),
                mockGridItem("key2"),
                mockGridItem("key3"),
            ),
            firstVisibleIndex = 1,
        )

        val candidates = gatherCandidates(
            gridState = gridState,
            draggedItemOffset = fakeDraggedGridItemOffset(),
            draggedItem = InteractionState.Grid.Active(
                index = 0,
                key = "key",
                initialOffset = Offset.Zero,
            ),
            ignoredItems = defaultIgnoredItems,
        )
        assertTrue(
            candidates.filter { it.type is InteractionType.Scroll }.size == 1,
        )
    }

    @Test
    fun `GIVEN the last visible item is not the last in the list AND dragged item is at bottom of viewport WHEN gatherCandidates is called THEN bottom Scroll candidate is created`() {
        val gridState = mockGridState(
            listOf(
                mockGridItem("key"),
                mockGridItem("key2"),
                mockGridItem("key3"),
            ),
            firstVisibleIndex = 0,
            totalItems = 10,
        )

        val draggedItem = InteractionState.Grid.Active(
            index = 0,
            key = "key",
            initialOffset = Offset(10f, 10f),
        )
        val candidates = gatherCandidates(
            gridState = gridState,
            draggedItemOffset = GridItemOffset(
                draggedItem = draggedItem,
                draggingItemOffset = Offset(10f, 10f),
                itemSize = IntSize(10, 10),
            ),
            draggedItem = draggedItem,
            ignoredItems = defaultIgnoredItems,
        )
        assertTrue(
            candidates.filter { it.type is InteractionType.Scroll }.size == 1,
        )
    }

    @Test
    fun `GIVEN an ignored GridItem THEN no candidates are generated`() {
        val gridState = mockGridState(mockItems = listOf(mockGridItem("ignored")))

        val candidates = gatherCandidates(
            gridState = gridState,
            draggedItemOffset = fakeDraggedGridItemOffset(),
            draggedItem = InteractionState.Grid.Active(
                index = 0,
                key = "key",
                initialOffset = Offset.Zero,
            ),
            ignoredItems = setOf("ignored"),
        )
        assertTrue(
            candidates.isEmpty(),
        )
    }

    @Test
    fun `GIVEN an empty GridItem list THEN no candidates are generated`() {
        val gridState = mockGridState(mockItems = emptyList())

        val candidates = gatherCandidates(
            gridState = gridState,
            draggedItemOffset = fakeDraggedGridItemOffset(),
            draggedItem = InteractionState.Grid.Active(
                index = 0,
                key = "key",
                initialOffset = Offset.Zero,
            ),
            ignoredItems = setOf("ignored"),
        )
        assertTrue(
            candidates.isEmpty(),
        )
    }

    @Test
    fun `GIVEN an item is dragged onto another WHEN onDragEnd is called THEN onDrop is called`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val dragItemOffset = IntOffset(0, 110)
        val targetItemOffset = IntOffset(20, 110)
        val reorderState = fakeGridReorderState(
            mockGridState(
                mockItems = listOf(
                    mockk<LazyGridItemInfo> {
                        every { key } returns "header"
                        every { index } returns 0
                        every { size } returns IntSize(1000, 100)
                        every { offset } returns IntOffset(0, 0)
                    },
                    mockk<LazyGridItemInfo> {
                        every { key } returns "key1"
                        every { index } returns 1
                        every { size } returns IntSize(10, 110)
                        every { offset } returns dragItemOffset
                    },
                    mockk<LazyGridItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 1
                        every { size } returns IntSize(10, 110)
                        every { offset } returns targetItemOffset
                    },
                ),
            ),
            handler = handler,
        )

        reorderState.onTouchSlopPassed(dragItemOffset.toOffset(), false)
        reorderState.onDrag(offset = Offset(20f, 0f), preserveSelectMode = false) // 20 to the right
        reorderState.onDragEnd()

        verify { handler.onDrop("key1", "key2") }
    }

    @Test
    fun `GIVEN an item is dragged to the right of another WHEN onDragEnd is called THEN onMove is called`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val dragItemOffset = IntOffset(10, 110)
        val targetItemOffset = IntOffset(30, 110)
        val reorderState = fakeGridReorderState(
            mockGridState(
                mockItems = listOf(
                    mockk<LazyGridItemInfo> {
                        every { key } returns "header"
                        every { index } returns 0
                        every { size } returns IntSize(1000, 100)
                        every { offset } returns IntOffset(0, 0)
                    },
                    mockk<LazyGridItemInfo> {
                        every { key } returns "key1"
                        every { index } returns 1
                        every { size } returns IntSize(10, 110)
                        every { offset } returns dragItemOffset
                    },
                    mockk<LazyGridItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 1
                        every { size } returns IntSize(10, 110)
                        every { offset } returns targetItemOffset
                    },
                ),
            ),
            handler = handler,
        )

        reorderState.onTouchSlopPassed(dragItemOffset.toOffset(), false)
        reorderState.onDrag(offset = Offset(50f, 0f), preserveSelectMode = false) // 50 to the right
        reorderState.onDragEnd()

        verify { handler.onMove("key1", "key2", true) }
    }

    @Test
    fun `GIVEN an item is dragged to the left of another WHEN onDragEnd is called THEN onMove is called`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val targetItemOffset = IntOffset(10, 110)
        val draggedItemOffset = IntOffset(30, 110)
        val reorderState = fakeGridReorderState(
            mockGridState(
                mockItems = listOf(
                    mockk<LazyGridItemInfo> {
                        every { key } returns "header"
                        every { index } returns 0
                        every { size } returns IntSize(1000, 100)
                        every { offset } returns IntOffset(0, 0)
                    },
                    mockk<LazyGridItemInfo> {
                        every { key } returns "key1"
                        every { index } returns 1
                        every { size } returns IntSize(10, 110)
                        every { offset } returns targetItemOffset
                    },
                    mockk<LazyGridItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 1
                        every { size } returns IntSize(10, 110)
                        every { offset } returns draggedItemOffset
                    },
                ),
            ),
            handler = handler,
        )

        reorderState.onTouchSlopPassed(draggedItemOffset.toOffset(), false)
        reorderState.onDrag(offset = Offset(-10f, 0f), preserveSelectMode = false) // 10 to the left
        reorderState.onDragEnd()

        verify { handler.onMove("key2", "key1", false) }
    }

    @Test
    fun `GIVEN a drag is in progress and the dragged item is not visible when onDragEnd is called THEN the state is reset`() {
        val reorderState = fakeGridReorderState(gridState = mockGridState(mockItems = emptyList()))

        reorderState.onTouchSlopPassed(Offset.Zero, false)
        reorderState.onDragEnd()

        assertEquals(InteractionState.Grid.None, reorderState.draggedItem)
        assertEquals(InteractionState.Grid.None, reorderState.hoveredItem)
        assertNull(reorderState.highlightedRect)
        assertEquals(InteractionMode.Grid.None, reorderState.interactionMode)
    }

    @Test
    fun `GIVEN a drag is in progress and the dragged item is not visible when onDragEnd is called THEN onDragCancelled is called`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        // val targetItemOffset = IntOffset(10, 0)
        val draggedItemOffset = IntOffset(30, 0)
        val reorderState = fakeGridReorderState(
            mockGridState(
                mockItems = listOf(
                    mockk<LazyGridItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 1
                        every { size } returns IntSize(10, 10)
                        every { offset } returns draggedItemOffset
                    },
                ),
            ),
            handler = handler,
        )

        reorderState.onTouchSlopPassed(draggedItemOffset.toOffset(), false)
        reorderState.onDrag(offset = Offset(50f, 50f), preserveSelectMode = false)
        reorderState.onDragEnd()

        verify { handler.onDragCancel() }
    }

    @Test
    fun `WHEN an item is dragged GIVEN preserveSelectMode is true THEN onDragStart is called with the same flag`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val dragItemOffset = IntOffset(10, 0)
        val targetItemOffset = IntOffset(30, 0)
        val reorderState = fakeGridReorderState(
            mockGridState(
                mockItems = listOf(
                    mockk<LazyGridItemInfo> {
                        every { key } returns "key1"
                        every { index } returns 1
                        every { size } returns IntSize(10, 10)
                        every { offset } returns dragItemOffset
                    },
                    mockk<LazyGridItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 1
                        every { size } returns IntSize(10, 10)
                        every { offset } returns targetItemOffset
                    },
                ),
            ),
            handler = handler,
        )

        reorderState.onTouchSlopPassed(dragItemOffset.toOffset(), true)
        reorderState.onDrag(offset = Offset(50f, 0f), preserveSelectMode = true) // 50 to the right

        verify { handler.onDragStart(sourceKey = "key1", preserveSelectMode = true) }
    }

    @Test
    fun `WHEN an item is dragged GIVEN preserveSelectMode is false THEN onDragStart is called with the same flag`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val dragItemOffset = IntOffset(10, 0)
        val targetItemOffset = IntOffset(30, 0)
        val reorderState = fakeGridReorderState(
            mockGridState(
                mockItems = listOf(
                    mockk<LazyGridItemInfo> {
                        every { key } returns "key1"
                        every { index } returns 1
                        every { size } returns IntSize(10, 10)
                        every { offset } returns dragItemOffset
                    },
                    mockk<LazyGridItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 1
                        every { size } returns IntSize(10, 10)
                        every { offset } returns targetItemOffset
                    },
                ),
            ),
            handler = handler,
        )

        reorderState.onTouchSlopPassed(dragItemOffset.toOffset(), false)
        reorderState.onDrag(Offset(50f, 0f), preserveSelectMode = false) // 50 to the right

        verify { handler.onDragStart(sourceKey = "key1", preserveSelectMode = false) }
    }

    @Test
    fun `WHEN a drag is cancelled THEN the handler is invoked with a drag cancel call`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val dragItemOffset = IntOffset(10, 0)
        val targetItemOffset = IntOffset(30, 0)
        val reorderState = fakeGridReorderState(
            mockGridState(
                mockItems = listOf(
                    mockk<LazyGridItemInfo> {
                        every { key } returns "key1"
                        every { index } returns 1
                        every { size } returns IntSize(10, 10)
                        every { offset } returns dragItemOffset
                    },
                    mockk<LazyGridItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 1
                        every { size } returns IntSize(10, 10)
                        every { offset } returns targetItemOffset
                    },
                ),
            ),
            handler = handler,
        )

        reorderState.onTouchSlopPassed(offset = dragItemOffset.toOffset(), shouldLongPress = false)
        reorderState.onDrag(offset = Offset(50f, 50f), preserveSelectMode = false)
        reorderState.onDragCancelled()

        verify { handler.onDragCancel() }
    }

    @Test
    fun `WHEN a large ignored item is placed in the TabsTray THEN the item size is the size of a normal tab`() {
        val handler = mockk<TabInteractionHandler>(relaxed = true)
        val reorderState = fakeGridReorderState(
            mockGridState(
                mockItems = listOf(
                    mockk<LazyGridItemInfo> {
                        every { key } returns "header"
                        every { index } returns 0
                        every { size } returns IntSize(1248, 168)
                        every { offset } returns IntOffset(0, 0)
                    },
                    mockk<LazyGridItemInfo> {
                        every { key } returns "key1"
                        every { index } returns 1
                        every { size } returns IntSize(600, 750)
                        every { offset } returns IntOffset(0, 918)
                    },
                    mockk<LazyGridItemInfo> {
                        every { key } returns "key2"
                        every { index } returns 1
                        every { size } returns IntSize(600, 750)
                        every { offset } returns IntOffset(600, 918)
                    },
                    mockk<LazyGridItemInfo> {
                        every { key } returns "span"
                        every { index } returns 1
                        every { size } returns IntSize(1248, 10)
                        every { offset } returns IntOffset(600, 2000)
                    },
                ),
            ),
            handler = handler,
        )

        assertEquals(expected = IntSize(600, 750), actual = reorderState.itemSize)
    }

    private fun mockGridItem(mockItemKey: String = "key"): LazyGridItemInfo {
        return mockk<LazyGridItemInfo> {
            every { key } returns mockItemKey
            every { index } returns 1
            every { size } returns IntSize(10, 10)
            every { offset } returns IntOffset(0, 0)
        }
    }

    private fun mockGridState(
        mockItems: List<LazyGridItemInfo> = emptyList(),
        firstVisibleIndex: Int = 0,
        totalItems: Int = mockItems.size,
    ): LazyGridState {
        return mockk<LazyGridState> {
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

    private fun fakeGridReorderState(
        gridState: LazyGridState,
        handler: TabInteractionHandler = NoOpTabInteractionHandler,
    ): GridInteractionState {
        return GridInteractionStateImpl(
            gridState = gridState,
            tabInteractionHandler = handler,
            scope = scope,
            touchSlop = 0f,
            ignoredItems = defaultIgnoredItems,
            onLongPress = { _ -> },
            hapticFeedback = mockk<HapticFeedback> {
                every { performHapticFeedback(any()) } just Runs
            },
            dragAndDropEnabled = true,
        )
    }
}
