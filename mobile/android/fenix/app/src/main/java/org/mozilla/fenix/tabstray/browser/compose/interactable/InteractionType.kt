/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.browser.compose.interactable

import androidx.compose.ui.geometry.Rect

/**
 * An interface of the different types of interaction candidates that are possible for a dragged item.
 * A dragged item's location is compared against several destinations based on distance.
 * Here, closest point means any point in the range (x1..x2, y1..y2) of the dragged item as
 * compared with its destination candidates.
 */
sealed interface InteractionType {
    /**
     * The closest point represents an overlap between the dragged item and a target's center point.
     */
    data object Overlap : InteractionType

    /**
     * The closest point represents a gutter area to the left of a target item.
     * @property rect A [Rect] representing the gutter indicated for interaction.
     */
    data class LeftGutter(val rect: Rect) : InteractionType

    /**
     * The closest point represents a gutter area to the right of a target item.
     * @property rect A [Rect] representing the gutter indicated for interaction.
     */
    data class RightGutter(val rect: Rect) : InteractionType

    /**
     * The closest point represents a gutter area to the top of a target item.
     * @property rect A [Rect] representing the gutter indicated for interaction.
     */
    data class TopGutter(val rect: Rect) : InteractionType

    /**
     * The closest point represents a gutter area to the bottom of a target item.
     * @property rect A [Rect] representing the gutter indicated for interaction.
     */
    data class BottomGutter(val rect: Rect) : InteractionType

    /**
     * The closest point represents a scroll area spanning the top/bottom of the viewport.
     * @property scroll A [Float] value representing the scroll amount indicated.
     */
    data class Scroll(val scroll: Float) : InteractionType
}
