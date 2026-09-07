/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.compose

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme
import mozilla.components.ui.icons.R as iconsR

/**
 * The background of an item that is being swiped horizontally.
 *
 * @param isSwipeActive Whether the swipe gesture is active.
 * @param isSwipingToStart Whether the swipe gesture is in the start direction.
 * @param modifier [Modifier] to apply to the background.
 * @param shape Shape of the background.
 */
@Composable
fun DismissibleItemBackground(
    isSwipeActive: Boolean,
    isSwipingToStart: Boolean,
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(0.dp),
) {
    if (isSwipeActive) {
        Card(
            modifier = modifier.fillMaxSize(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
            shape = shape,
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                Icon(
                    painter = painterResource(iconsR.drawable.mozac_ic_delete_24),
                    contentDescription = null,
                    modifier = Modifier
                        .padding(horizontal = 32.dp)
                        .align(
                            if (isSwipingToStart) {
                                Alignment.CenterEnd
                            } else {
                                Alignment.CenterStart
                            },
                        ),
                    tint = MaterialTheme.colorScheme.error,
                )
            }
        }
    }
}

@Composable
private fun DismissibleItemBackgroundPreviewContent() {
    Surface {
        Column {
            Box(modifier = Modifier.height(56.dp)) {
                DismissibleItemBackground(
                    isSwipeActive = true,
                    isSwipingToStart = true,
                )
            }

            Spacer(Modifier.height(10.dp))

            Box(modifier = Modifier.height(56.dp)) {
                DismissibleItemBackground(
                    isSwipeActive = true,
                    isSwipingToStart = false,
                    shape = RoundedCornerShape(bottomStart = 8.dp, bottomEnd = 8.dp),
                )
            }

            Spacer(Modifier.height(10.dp))

            // this should NOT be visible in the preview
            Box(modifier = Modifier.height(56.dp)) {
                DismissibleItemBackground(
                    isSwipeActive = false,
                    isSwipingToStart = false,
                )
            }
        }
    }
}

@Preview
@Composable
private fun DismissedTabBackgroundPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        DismissibleItemBackgroundPreviewContent()
    }
}
