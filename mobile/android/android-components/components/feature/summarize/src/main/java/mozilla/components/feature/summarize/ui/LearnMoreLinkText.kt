/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.summarize.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.tooling.preview.PreviewLightDark
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.feature.summarize.R

@Composable
internal fun LearnMoreLinkText(
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    // TODO this should be a LinkText, once its made available in Acorn https://bugzilla.mozilla.org/show_bug.cgi?id=2015669
    Text(
        text = stringResource(R.string.mozac_summarize_learn_more_link),
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() },
        color = AcornTheme.colors.actionInformation,
        textAlign = TextAlign.Center,
        textDecoration = TextDecoration.Underline,
    )
}

@PreviewLightDark
@Composable
private fun PreviewLearnMoreLink() {
    LearnMoreLinkText { }
}
