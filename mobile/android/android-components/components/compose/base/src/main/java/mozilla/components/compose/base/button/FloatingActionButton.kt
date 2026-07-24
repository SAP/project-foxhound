/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.button

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.material3.FloatingActionButtonElevation
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.theme.AcornTheme
import androidx.compose.material3.FloatingActionButton as M3FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults as M3FloatingActionButtonDefaults
import mozilla.components.ui.icons.R as iconsR

/**
 * Floating action button.
 *
 * @param icon [Painter] icon to be displayed inside the action button.
 * @param modifier [Modifier] to be applied to the action button.
 * @param contentDescription The content description to describe the icon.
 * @param label Text to be displayed next to the icon.
 * @param colors The [FloatingActionButtonColors] used to color this FAB.
 * @param elevation [FloatingActionButtonElevation] used to resolve the elevation for this FAB in
 * different states. This controls the size of the shadow below the FAB.
 * @param onClick Invoked when the button is clicked.
 */
@Composable
fun FloatingActionButton(
    icon: Painter,
    modifier: Modifier = Modifier,
    contentDescription: String? = null,
    label: String? = null,
    colors: FloatingActionButtonColors = FloatingActionButtonDefaults.colorsPrimary(),
    elevation: FloatingActionButtonElevation = M3FloatingActionButtonDefaults.elevation(),
    onClick: () -> Unit,
) {
    M3FloatingActionButton(
        onClick = onClick,
        modifier = modifier,
        containerColor = colors.containerColor,
        contentColor = colors.contentColor,
        elevation = elevation,
    ) {
        Row(
            modifier = Modifier
                .wrapContentSize()
                .padding(16.dp)
                .animateContentSize(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                painter = icon,
                contentDescription = contentDescription,
            )

            if (!label.isNullOrBlank()) {
                Spacer(Modifier.width(12.dp))

                Text(
                    text = label,
                    style = AcornTheme.typography.button,
                    maxLines = 1,
                )
            }
        }
    }
}

@Preview
@Composable
private fun FloatingActionButtonPreview() {
    var label by remember { mutableStateOf<String?>("LABEL") }

    AcornTheme {
        Box(Modifier.wrapContentSize()) {
            FloatingActionButton(
                label = label,
                icon = painterResource(iconsR.drawable.mozac_ic_plus_24),
                onClick = {
                    label = if (label == null) "LABEL" else null
                },
            )
        }
    }
}

@Preview
@Composable
private fun SurfaceFloatingActionButtonPreview() {
    var label by remember { mutableStateOf<String?>("LABEL") }

    AcornTheme {
        Box(Modifier.wrapContentSize()) {
            FloatingActionButton(
                label = label,
                icon = painterResource(iconsR.drawable.mozac_ic_plus_24),
                colors = FloatingActionButtonDefaults.colorsSurface(),
                onClick = {
                    label = if (label == null) "LABEL" else null
                },
            )
        }
    }
}

@Preview
@Composable
private fun CustomFloatingActionButtonPreview() {
    var label by remember { mutableStateOf<String?>("LABEL") }

    AcornTheme {
        Box(Modifier.wrapContentSize()) {
            FloatingActionButton(
                label = label,
                icon = painterResource(iconsR.drawable.mozac_ic_plus_24),
                colors = FloatingActionButtonColors(
                    containerColor = MaterialTheme.colorScheme.secondary,
                    contentColor = MaterialTheme.colorScheme.onSecondary,
                ),
                onClick = {
                    label = if (label == null) "LABEL" else null
                },
            )
        }
    }
}
