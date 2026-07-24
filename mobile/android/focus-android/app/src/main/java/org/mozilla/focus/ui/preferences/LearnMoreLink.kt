/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.ui.preferences

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment.Companion.Start
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import org.mozilla.focus.R
import org.mozilla.focus.ui.theme.focusColors
import org.mozilla.focus.ui.theme.focusTypography

/**
 * Composable function that displays a "Learn More" link.
 *
 * @param openLearnMore A lambda function that defines the action to be performed when the link is clicked.
 * @param modifier Optional [Modifier] to be applied to the [Text] composable.
 */
@Composable
fun ColumnScope.LearnMoreLink(
    openLearnMore: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Text(
        text = stringResource(R.string.about_screen_learn_more),
        color = focusColors.aboutPageLink,
        style = focusTypography.links,
        modifier = modifier
            .padding(10.dp)
            .fillMaxWidth()
            .align(Start)
            .clickable {
                openLearnMore()
            },
    )
}
