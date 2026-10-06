/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.SwitchColors
import androidx.compose.material3.SwitchDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.PreviewLightDark
import mozilla.components.compose.base.theme.AcornTheme
import androidx.compose.material3.Switch as M3Switch

/**
 * Switch toggle.
 *
 * @param checked [Boolean] indicating whether the switch is checked or not.
 * @param onCheckedChange Invoked when the switch is clicked. Pass `null` to make the switch
 * non-interactive.
 * @param modifier [Modifier] to be applied to the switch.
 * @param enabled [Boolean] that controls the enabled state of this switch.
 * @param colors [SwitchColors] that will be used to resolve the colors used for this switch in
 * different states. See [SwitchDefaults.colors].
 */
@Composable
fun Switch(
    checked: Boolean,
    onCheckedChange: ((Boolean) -> Unit)?,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    colors: SwitchColors = SwitchDefaults.colors(
        checkedTrackColor = MaterialTheme.colorScheme.tertiary,
    ),
) {
    M3Switch(
        checked = checked,
        onCheckedChange = onCheckedChange,
        modifier = modifier,
        enabled = enabled,
        colors = colors,
    )
}

@Composable
@PreviewLightDark
private fun SwitchPreview() {
    var checked by remember { mutableStateOf(true) }

    AcornTheme {
        Surface {
            Column {
                Switch(
                    checked = checked,
                    onCheckedChange = { checked = it },
                    modifier = Modifier.padding(AcornTheme.layout.space.static200),
                )

                Spacer(modifier = Modifier.padding(AcornTheme.layout.space.static100))

                Switch(
                    checked = false,
                    onCheckedChange = {},
                    modifier = Modifier.padding(AcornTheme.layout.space.static200),
                    enabled = false,
                )
            }
        }
    }
}
