/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsPropertyKey
import androidx.compose.ui.semantics.SemanticsPropertyReceiver
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTag
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.modifier.thenConditional
import org.mozilla.fenix.R
import org.mozilla.fenix.home.ui.HomepageTestTag.HOMEPAGE_WORDMARK_LOGO
import org.mozilla.fenix.home.ui.HomepageTestTag.HOMEPAGE_WORDMARK_TEXT

/**
 * Semantic property for accessing a Composable item's current resource property.
 */
internal val ResourceId = SemanticsPropertyKey<Int>("ResourceId")
internal var SemanticsPropertyReceiver.resourceId by ResourceId

@Composable
internal fun WordmarkLogo(
    onLogoClicked: () -> Unit,
    isSportsWidgetEnabled: Boolean,
) {
    val wordmarkResourceId = if (isSportsWidgetEnabled) R.attr.fenixWordmarkSportLogo else R.attr.fenixWordmarkLogo
    val sportsLogoContentDescription = stringResource(R.string.sports_widget_country_selector_title)
    Image(
        modifier = Modifier
            .height(40.dp)
            .semantics {
                testTagsAsResourceId = true
                testTag = HOMEPAGE_WORDMARK_LOGO
                resourceId = wordmarkResourceId
                if (isSportsWidgetEnabled) {
                    contentDescription = sportsLogoContentDescription
                }
            }
            .thenConditional(
                Modifier.clickable(
                    onClick = onLogoClicked,
                    role = Role.Button,
                ),
            ) { isSportsWidgetEnabled }
            .padding(end = 10.dp),
        painter = painterResource(
            getAttr(
                wordmarkResourceId,
            ),
        ),
        contentDescription = null,
    )
}

@Composable
internal fun WordmarkText(color: Color?) {
    Image(
        modifier = Modifier
            .semantics {
                testTagsAsResourceId = true
                testTag = HOMEPAGE_WORDMARK_TEXT
            }
            .height(dimensionResource(R.dimen.wordmark_text_height)),
        painter = painterResource(getAttr(R.attr.fenixWordmarkText)),
        colorFilter = color?.let { ColorFilter.tint(it) },
        contentDescription = stringResource(R.string.app_name),
    )
}
