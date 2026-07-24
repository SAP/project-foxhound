/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.translations

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import org.mozilla.fenix.R
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme
import mozilla.components.ui.icons.R as iconsR

private val ROUNDED_CORNER_SHAPE = RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp)

/**
 * A translation toolbar for browsers.
 *
 * @param label Translation toolbar label that is displayed when the current page has been
 * translated by the translation feature.
 * @param onExpand Invoked when user wants to expand the translations controls..
 * @param onClose Invoked when user wants to close the translation toolbar.
 */
@Composable
fun TranslationToolbar(
    label: String,
    onExpand: () -> Unit = {},
    onClose: () -> Unit = {},
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .height(40.dp)
            .clip(ROUNDED_CORNER_SHAPE),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.87f),
        contentColor = MaterialTheme.colorScheme.onSurface,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, end = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                painter = painterResource(iconsR.drawable.mozac_ic_translate_active_24),
                contentDescription = null,
                tint = MaterialTheme.colorScheme.tertiary,
            )

            Text(
                text = label,
                modifier = Modifier
                    .padding(start = 8.dp)
                    .weight(1f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                style = FirefoxTheme.typography.body2,
            )

            IconButton(onClick = onExpand) {
                Icon(
                    painter = painterResource(iconsR.drawable.mozac_ic_chevron_up_24),
                    contentDescription = stringResource(R.string.translation_toolbar_expand_action),
                )
            }

            IconButton(onClick = onClose) {
                Icon(
                    painter = painterResource(iconsR.drawable.mozac_ic_cross_20),
                    contentDescription = stringResource(R.string.translation_toolbar_close_action),
                )
            }
        }
    }
}

@Preview
@Composable
private fun TranslationToolbarPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        TranslationToolbar(
            label = "Translated from French to English",
        )
    }
}
