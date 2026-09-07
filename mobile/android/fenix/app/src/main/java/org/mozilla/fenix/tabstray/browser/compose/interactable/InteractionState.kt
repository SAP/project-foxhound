/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.browser.compose.interactable

import androidx.compose.foundation.lazy.grid.LazyGridItemInfo
import androidx.compose.foundation.lazy.grid.LazyGridState
import androidx.compose.ui.geometry.Offset

/**
 * Defines the state for an interactable grid or list item.
 */
sealed interface InteractionState {
    /**
     * The item's index in the list of interactable items.
     */
    val index: Int?

    /**
     * The item's unique key, typically a String.
     */
    val key: String?

    /**
     * Fetches the [LazyGridItemInfo] for the interacted item, based on its key.
     */
    fun getLazyGridItemInfo(gridState: LazyGridState): LazyGridItemInfo?

    /**
     * Grid interface to handle the InteractionState for a 2 dimensional coordinate system.
     */
    sealed interface Grid : InteractionState {
        val initialOffset: Offset
        val cumulatedOffset: Offset

        /**
         * Increments the cumulated offset of the dragged item by the latest offset being passed in,
         * typically from a drag event update.
         */
        fun incrementCumulatedOffset(offset: Offset): Grid

        /**
         * Data object to represent no active interaction.
         * @property index of the item, always null
         * @property key of the item, always null
         * @property initialOffset initial offset of the item, always Offset.Zero
         * @property cumulatedOffset cumulative offset of the dragged item, always Offset.Zero
         */
        data object None : Grid {
            override val index = null
            override val key = null
            override val initialOffset: Offset = Offset.Zero
            override val cumulatedOffset: Offset = Offset.Zero
            override fun getLazyGridItemInfo(gridState: LazyGridState): LazyGridItemInfo? {
                return null
            }

            override fun incrementCumulatedOffset(offset: Offset): Grid {
                return this
            }
        }

        /**
         * Data object to represent an active interaction.
         * @property index of the item, as an Int
         * @property key of the item, as a String
         * @property initialOffset initial offset of the item,
         * @property cumulatedOffset cumulative offset of the dragged item
         */
        data class Active(
            override val index: Int,
            override val key: String,
            override val initialOffset: Offset = Offset.Zero,
            override val cumulatedOffset: Offset = Offset.Zero,
        ) : Grid {
            override fun getLazyGridItemInfo(gridState: LazyGridState): LazyGridItemInfo? {
                return gridState.layoutInfo.visibleItemsInfo.firstOrNull { it.key == this.key }
            }

            override fun incrementCumulatedOffset(offset: Offset): Grid {
                return this.copy(
                    cumulatedOffset = cumulatedOffset + offset,
                )
            }
        }
    }

    /**
     * List interface to handle the InteractionState for a 1 dimensional coordinate system.
     */
    sealed interface List : InteractionState {
        val initialOffset: Float
        val cumulatedOffset: Float

        val moved: Boolean

        /**
         * Increments the cumulated offset of the dragged item by the latest offset being passed in,
         * typically from a drag event update.
         */
        fun incrementCumulatedOffset(offset: Float): List

        /**
         * Mark that the dragged item has been moved.
         */
        fun markAsMoved(): List

        /**
         * Data object to represent no active interaction.
         * @property index of the item, always null
         * @property key of the item, always null
         * @property initialOffset initial offset of the item, always Offset.Zero
         * @property cumulatedOffset cumulative offset of the dragged item, always Offset.Zero
         * @property moved whether the item has been moved, always false
         */
        data object None : List {
            override val index = null
            override val key = null
            override val moved = false
            override val initialOffset: Float = 0f
            override val cumulatedOffset: Float = 0f
            override fun getLazyGridItemInfo(gridState: LazyGridState): LazyGridItemInfo? {
                return null
            }

            override fun incrementCumulatedOffset(offset: Float): List {
                return this
            }

            override fun markAsMoved(): List {
                return this
            }
        }

        /**
         * Data object to represent an active interaction.
         * @property index of the item, as an Int
         * @property key of the item, as a String
         * @property initialOffset initial offset of the item,
         * @property cumulatedOffset cumulative offset of the dragged item
         * @property moved whether the dragged item has moved
         */
        data class Active(
            override val index: Int,
            override val key: String,
            override val initialOffset: Float = 0f,
            override val cumulatedOffset: Float = 0f,
            override val moved: Boolean = false,
        ) : List {
            override fun getLazyGridItemInfo(gridState: LazyGridState): LazyGridItemInfo? {
                return gridState.layoutInfo.visibleItemsInfo.firstOrNull { it.key == this.key }
            }

            override fun incrementCumulatedOffset(offset: Float): List {
                return this.copy(
                    cumulatedOffset = cumulatedOffset + offset,
                )
            }

            override fun markAsMoved(): List {
                return this.copy(
                    moved = true,
                )
            }
        }
    }
}
