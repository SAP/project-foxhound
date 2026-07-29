/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.browser.compose

/**
 * The tab item's interaction state (hover, drag, etc)
 *
 * @property isHoveredByItem: True when the tab item is being hovered over by another tab item.  False otherwise.
 * @property isDragged: True when the tab item is being dragged for re-order or drag and drop, false otherwise.
 * @property isHeld: True when the tab item is being held down before being moved, false otherwise.  isHeld
 * and isDragged can both be true, because isDragged tracks the drag gesture action.
 */
data class TabItemInteractionState(
    val isHoveredByItem: Boolean = false,
    val isDragged: Boolean = false,
    val isHeld: Boolean = false,
)
