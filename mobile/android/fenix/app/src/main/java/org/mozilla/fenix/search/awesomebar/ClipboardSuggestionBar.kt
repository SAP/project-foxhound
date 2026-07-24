/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.search.awesomebar

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import org.mozilla.fenix.R
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme
import mozilla.components.ui.icons.R as iconsR

/**
 * A suggestion bar that appears when a link is copied to the clipboard.
 * It allows the user to fill the link into the current input field.
 *
 * @param shouldUseBottomToolbar Indicates whether the toolbar is at the bottom of the screen.
 * @param onClick Callback invoked when the suggestion bar is clicked.
 */
@Composable
fun ClipboardSuggestionBar(
    shouldUseBottomToolbar: Boolean,
    onClick: () -> Unit,
) {
    Surface {
        Box {
            Row(
                modifier = Modifier
                    .clickable(onClick = onClick)
                    .padding(8.dp)
                    .height(32.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    painter = painterResource(id = iconsR.drawable.mozac_ic_link_24),
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                )

                Spacer(modifier = Modifier.width(8.dp))

                Text(
                    text = stringResource(R.string.awesomebar_clipboard_title),
                    style = FirefoxTheme.typography.body2,
                    modifier = Modifier.weight(1f),
                )
            }

            HorizontalDivider(
                modifier = when (shouldUseBottomToolbar) {
                    true -> Modifier.align(Alignment.TopCenter)
                    false -> Modifier.align(Alignment.BottomCenter)
                },
            )
        }
    }
}

@Preview
@Composable
private fun ClipboardBarPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        ClipboardSuggestionBar(
            shouldUseBottomToolbar = false,
            onClick = {},
        )
    }
}
