/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.browser.compose

import androidx.compose.foundation.lazy.grid.LazyGridItemInfo
import androidx.compose.foundation.lazy.grid.LazyGridState
import androidx.compose.ui.geometry.Offset
import io.mockk.every
import io.mockk.mockk
import org.junit.Assert.assertNull
import org.mozilla.fenix.tabstray.browser.compose.interactable.InteractionState
import kotlin.test.Test
import kotlin.test.assertEquals

class InteractionStateTest {

    @Test
    fun `GIVEN Grid None State WHEN incrementCumulatedOffset is called THEN None is returned unchanged`() {
        val result = InteractionState.Grid.None.incrementCumulatedOffset(Offset(10f, 10f))
        assertEquals(InteractionState.Grid.None, result)
    }

    @Test
    fun `GIVEN List None State WHEN incrementCumulatedOffset is called THEN None is returned unchanged`() {
        val result = InteractionState.List.None.incrementCumulatedOffset(10f)
        assertEquals(InteractionState.List.None, result)
    }

    @Test
    fun `GIVEN Grid Active State with initial offset Zero WHEN incrementCumulatedOffset is called THEN State is updated`() {
        val initialState = InteractionState.Grid.Active(index = 0, key = "key", initialOffset = Offset.Zero)
        val result = initialState.incrementCumulatedOffset(Offset(10f, 10f))
        assertEquals(result.cumulatedOffset, Offset(10f, 10f))
    }

    @Test
    fun `GIVEN List Active State with initial offset Zero WHEN incrementCumulatedOffset is called THEN State is updated`() {
        val initialState = InteractionState.List.Active(index = 0, key = "key", initialOffset = 0f)
        val result = initialState.incrementCumulatedOffset(10f)
        assertEquals(result.cumulatedOffset, 10f)
    }

    @Test
    fun `GIVEN Grid Active State WHEN incrementCumulatedOffset is called THEN State is accumulated`() {
        val initialState = InteractionState.Grid.Active(index = 0, key = "key", initialOffset = Offset(10f, 10f))
        val result = initialState
            .incrementCumulatedOffset(Offset(10f, 10f))
            .incrementCumulatedOffset(Offset(10f, 10f))
            .incrementCumulatedOffset(Offset(10f, 10f))
        assertEquals(Offset(30f, 30f), result.cumulatedOffset)
    }

    @Test
    fun `GIVEN List Active State WHEN incrementCumulatedOffset is called THEN State is accumulated`() {
        val initialState = InteractionState.List.Active(index = 0, key = "key", initialOffset = 10f)
        val result = initialState
            .incrementCumulatedOffset(10f)
            .incrementCumulatedOffset(10f)
            .incrementCumulatedOffset(10f)
        assertEquals(30f, result.cumulatedOffset)
    }

    @Test
    fun `GIVEN Grid None state when lazyGridItemInfo is called THEN null is returned`() {
        val mockItem = mockk<LazyGridItemInfo>()
        val gridState = mockk<LazyGridState> {
            every { layoutInfo } returns mockk {
                every { visibleItemsInfo } returns listOf(mockItem)
            }
        }
        assertNull(InteractionState.Grid.None.getLazyGridItemInfo(gridState))
    }

    @Test
    fun `GIVEN List None state when lazyGridItemInfo is called THEN null is returned`() {
        val mockItem = mockk<LazyGridItemInfo>()
        val gridState = mockk<LazyGridState> {
            every { layoutInfo } returns mockk {
                every { visibleItemsInfo } returns listOf(mockItem)
            }
        }
        assertNull(InteractionState.List.None.getLazyGridItemInfo(gridState))
    }

    @Test
    fun `Given Grid Active state when lazyGridItemInfo is called with a matching item THEN that item is returned`() {
        val mockItem = mockk<LazyGridItemInfo> {
            every { key } returns "key"
            every { index } returns 0
        }
        val gridState = mockk<LazyGridState> {
            every { layoutInfo } returns mockk {
                every { visibleItemsInfo } returns listOf(mockItem)
            }
        }
        val result =
            InteractionState.Grid.Active(index = 0, key = "key", initialOffset = Offset.Zero)
                .getLazyGridItemInfo(gridState)
        assertEquals(mockItem, result)
    }

    @Test
    fun `Given List Active state when lazyGridItemInfo is called with a matching item THEN that item is returned`() {
        val mockItem = mockk<LazyGridItemInfo> {
            every { key } returns "key"
            every { index } returns 0
        }
        val gridState = mockk<LazyGridState> {
            every { layoutInfo } returns mockk {
                every { visibleItemsInfo } returns listOf(mockItem)
            }
        }
        val result =
            InteractionState.List.Active(index = 0, key = "key", initialOffset = 0f).getLazyGridItemInfo(gridState)
        assertEquals(mockItem, result)
    }

    @Test
    fun `Given Grid Active state when lazyGridItemInfo is called without a matching item THEN null is returned`() {
        val mockItem = mockk<LazyGridItemInfo> {
            every { key } returns "otherKey"
            every { index } returns 1
        }
        val gridState = mockk<LazyGridState> {
            every { layoutInfo } returns mockk {
                every { visibleItemsInfo } returns listOf(mockItem)
            }
        }
        val result =
            InteractionState.Grid.Active(index = 0, key = "key", initialOffset = Offset.Zero)
                .getLazyGridItemInfo(gridState)
        assertNull(result)
    }

    @Test
    fun `Given List Active state when lazyGridItemInfo is called without a matching item THEN null is returned`() {
        val mockItem = mockk<LazyGridItemInfo> {
            every { key } returns "otherKey"
            every { index } returns 1
        }
        val gridState = mockk<LazyGridState> {
            every { layoutInfo } returns mockk {
                every { visibleItemsInfo } returns listOf(mockItem)
            }
        }
        val result =
            InteractionState.List.Active(index = 0, key = "key", initialOffset = 0f).getLazyGridItemInfo(gridState)
        assertNull(result)
    }
}
