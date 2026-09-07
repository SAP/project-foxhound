/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.summarize.ui

import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.tooling.preview.PreviewLightDark
import mozilla.components.compose.base.LinkText
import mozilla.components.compose.base.LinkTextState
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.feature.summarize.R

@Composable
internal fun LearnMoreLinkText(
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val text = stringResource(R.string.mozac_summarize_learn_more_link)
    LinkText(
        text = text,
        linkTextStates = listOf(
            LinkTextState(
                text = text,
                url = "",
                onClick = { onClick() },
            ),
        ),
        modifier = modifier,
        linkTextDecoration = TextDecoration.Underline,
    )
}

@PreviewLightDark
@Composable
private fun PreviewLearnMoreLink() {
    AcornTheme {
        Surface {
            LearnMoreLinkText {}
        }
    }
}
