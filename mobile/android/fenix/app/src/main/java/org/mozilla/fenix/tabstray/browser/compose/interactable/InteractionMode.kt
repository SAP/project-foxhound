/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.browser.compose.interactable

import androidx.compose.ui.geometry.Rect

/**
 * Defines the mode that an interactable grid or list is in, and holds source and target items.
 * The user may be reordering, dragging and dropping items, and so on.
 */
sealed interface InteractionMode {

    /**
     * Defines the interaction modes for a Grid that uses Offsets to handle a 2 dimensional coordinate system.
     */
    sealed interface Grid {

        // The source [InteractionState] for the mode
        val source: InteractionState.Grid

        // The target [InteractionState] for the mode
        val target: InteractionState.Grid

        /**
         * Represents no interaction mode is currently happening
         * @property source [InteractionState], which is always [InteractionState.None]
         * @property target [InteractionState], which is always [InteractionState.None]
         */
        data object None : Grid {
            override val source = InteractionState.Grid.None
            override val target = InteractionState.Grid.None
        }

        /**
         * Represents a source item placed next to a target item, either before or after.
         * @property source [InteractionState], which is always [InteractionState.Active]
         * @property target [InteractionState], which is always [InteractionState.Active]
         * @property placeAfter: Boolean representing whether to place the source item before or after the target
         * @property rect: Rect representing the reorder "gutter" target, to be used as a visual indicator.
         */
        data class Reordering(
            override val source: InteractionState.Grid.Active,
            override val target: InteractionState.Grid.Active,
            val placeAfter: Boolean = true,
            val rect: Rect? = null,
        ) : Grid

        /**
         * Represents a source item dragged and dropped onto a target item.
         * @property source [InteractionState], which is always [InteractionState.Active]
         * @property target [InteractionState], which is always [InteractionState.Active]
         */
        data class DragAndDrop(
            override val source: InteractionState.Grid.Active,
            override val target: InteractionState.Grid.Active,
        ) : Grid

        /**
         * Represents a user attempting to scroll up or down the list or grid.
         * @property scroll: [Float] representing the scroll amount, which may be negative.
         * @property source [InteractionState], which is always [InteractionState.None]
         * @property target [InteractionState], which is always [InteractionState.None]
         */
        data class Scroll(
            val scroll: Float,
            override val source: InteractionState.Grid = InteractionState.Grid.None,
            override val target: InteractionState.Grid = InteractionState.Grid.None,
        ) : Grid
    }

    /**
     * Defines the interaction modes for a List that uses Floats to handle a 1 dimensional coordinate system.
     */
    sealed interface List {

        // The source [InteractionState] for the mode
        val source: InteractionState

        // The target [InteractionState] for the mode
        val target: InteractionState

        /**
         * Represents no interaction mode is currently happening
         * @property source [InteractionState], which is always [InteractionState.None]
         * @property target [InteractionState], which is always [InteractionState.None]
         */
        data object None : List {
            override val source = InteractionState.List.None
            override val target = InteractionState.List.None
        }

        /**
         * Represents a source item placed next to a target item, either before or after.
         * @property source [InteractionState], which is always [InteractionState.Active]
         * @property target [InteractionState], which is always [InteractionState.Active]
         * @property placeAfter: Boolean representing whether to place the source item before or after the target
         * @property rect: Rect representing the reorder "gutter" target, to be used as a visual indicator.
         */
        data class Reordering(
            override val source: InteractionState.List.Active,
            override val target: InteractionState.List.Active,
            val placeAfter: Boolean = true,
            val rect: Rect? = null,
        ) : List

        /**
         * Represents a source item dragged and dropped onto a target item.
         * @property source [InteractionState], which is always [InteractionState.Active]
         * @property target [InteractionState], which is always [InteractionState.Active]
         */
        data class DragAndDrop(
            override val source: InteractionState.List.Active,
            override val target: InteractionState.List.Active,
        ) : List

        /**
         * Represents a user attempting to scroll up or down the list or grid.
         * @property scroll: [Float] representing the scroll amount, which may be negative.
         * @property source [InteractionState], which is always [InteractionState.None]
         * @property target [InteractionState], which is always [InteractionState.None]
         */
        data class Scroll(
            val scroll: Float,
            override val source: InteractionState = InteractionState.List.None,
            override val target: InteractionState = InteractionState.List.None,
        ) : List
    }
}
