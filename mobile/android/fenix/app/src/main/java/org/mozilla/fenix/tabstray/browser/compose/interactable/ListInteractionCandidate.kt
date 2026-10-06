/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.browser.compose.interactable

import androidx.compose.foundation.lazy.LazyListItemInfo

/**
 * Represents a candidate for a tab list item interaction.
 * @property type the [InteractionType] representing the type of interaction - reorder, scroll, drag and drop, etc.
 * @property score the [Float] representing the candidate score - lowest score wins.
 * @property anchorItem the [LazyListItemInfo] representing the item that anchors the interaction, or the target.
 */
data class ListInteractionCandidate(val type: InteractionType, val score: Float, val anchorItem: LazyListItemInfo)
