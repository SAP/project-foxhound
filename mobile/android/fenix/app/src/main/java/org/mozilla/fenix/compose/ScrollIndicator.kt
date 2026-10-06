/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.compose

import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp

private const val SCROLLBAR_ALPHA = 0.3f
private const val SCROLL_HANDLE_HEIGHT_PERCENTAGE = 0.4f
private const val SCROLL_INDICATOR_ALPHA = 0.8f

/**
 * A slim, dynamic scroll indicator that provides visual feedback during scrolling.
 *
 * @param scrollState The [ScrollState] of the scrollable container to synchronize with.
 * @param modifier [Modifier] to be applied to the layout.
 * @param enabled When true, the scrollbar is rendered (e.g., on small devices to hint at more content).
 */
@Composable
fun ScrollIndicator(
    scrollState: ScrollState,
    modifier: Modifier = Modifier,
    enabled: Boolean,
) {
    if (enabled && scrollState.maxValue > 0) {
        BoxWithConstraints(
            modifier = modifier
                .fillMaxHeight()
                .width(2.dp)
                .background(
                    MaterialTheme.colorScheme.outlineVariant.copy(alpha = SCROLLBAR_ALPHA),
                    CircleShape,
                ),
        ) {
            val trackHeight = maxHeight
            // Represents the scroll handle height (40% of the total track length).
            val handleHeight = trackHeight * SCROLL_HANDLE_HEIGHT_PERCENTAGE
            val scrollableArea = trackHeight - handleHeight

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(handleHeight)
                    .graphicsLayer {
                        val scrollPercentage = scrollState.value.toFloat() / scrollState.maxValue.toFloat()
                        translationY = (scrollableArea * scrollPercentage).toPx()
                    }
                    .background(
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = SCROLL_INDICATOR_ALPHA),
                        shape = CircleShape,
                    ),
            )
        }
    }
}
