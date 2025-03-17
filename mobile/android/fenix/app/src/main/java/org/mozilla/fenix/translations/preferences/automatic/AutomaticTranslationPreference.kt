/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.translations.preferences.automatic

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import mozilla.components.concept.engine.translate.Language
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.annotation.LightDarkPreview
import org.mozilla.fenix.compose.list.TextListItem
import org.mozilla.fenix.shopping.ui.ReviewQualityCheckInfoCard
import org.mozilla.fenix.shopping.ui.ReviewQualityCheckInfoType
import org.mozilla.fenix.theme.FirefoxTheme
import java.util.Locale

/**
 * Automatic Translate preference screen.
 *
 * @param automaticTranslationListPreferences List of [AutomaticTranslationItemPreference]s to display.
 * @param hasLanguageError If a translation error occurs.
 * @param onItemClick Invoked when the user clicks on the a item from the list.
 */
@Composable
fun AutomaticTranslationPreference(
    automaticTranslationListPreferences: List<AutomaticTranslationItemPreference>,
    hasLanguageError: Boolean = false,
    onItemClick: (AutomaticTranslationItemPreference) -> Unit,
) {
    Column(
        modifier = Modifier
            .background(
                color = FirefoxTheme.colors.layer1,
            ),
    ) {
        TextListItem(
            label = stringResource(R.string.automatic_translation_header_preference),
            modifier = Modifier
                .padding(
                    start = 56.dp,
                )
                .semantics { heading() }
                .defaultMinSize(minHeight = 76.dp)
                .wrapContentHeight(),
            maxLabelLines = Int.MAX_VALUE,
        )

        if (hasLanguageError) {
            CouldNotLoadLanguagesErrorWarning()
        }

        LazyColumn {
            items(automaticTranslationListPreferences) { item: AutomaticTranslationItemPreference ->
                var description: String? = null
                if (
                    item.automaticTranslationOptionPreference !is
                    AutomaticTranslationOptionPreference.OfferToTranslate
                ) {
                    description = stringResource(item.automaticTranslationOptionPreference.titleId)
                }
                item.language.localizedDisplayName?.let {
                    TextListItem(
                        label = it,
                        description = description,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 56.dp)
                            .defaultMinSize(minHeight = 56.dp)
                            .wrapContentHeight(),
                        onClick = {
                            onItemClick(item)
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun CouldNotLoadLanguagesErrorWarning() {
    val modifier = Modifier
        .fillMaxWidth()
        .padding(start = 72.dp, end = 16.dp, bottom = 16.dp, top = 16.dp)
        .defaultMinSize(minHeight = 56.dp)
        .wrapContentHeight()

    ReviewQualityCheckInfoCard(
        description = stringResource(id = R.string.automatic_translation_error_warning_text),
        type = ReviewQualityCheckInfoType.Warning,
        verticalRowAlignment = Alignment.CenterVertically,
        modifier = modifier,
    )
}

@Composable
internal fun getAutomaticTranslationListPreferences(): List<AutomaticTranslationItemPreference> {
    return mutableListOf<AutomaticTranslationItemPreference>().apply {
        add(
            AutomaticTranslationItemPreference(
                language = Language(Locale.ENGLISH.toLanguageTag(), Locale.ENGLISH.displayLanguage),
                automaticTranslationOptionPreference = AutomaticTranslationOptionPreference.AlwaysTranslate(),
            ),
        )
        add(
            AutomaticTranslationItemPreference(
                language = Language(Locale.FRANCE.toLanguageTag(), Locale.FRANCE.displayLanguage),
                automaticTranslationOptionPreference = AutomaticTranslationOptionPreference.OfferToTranslate(),
            ),
        )
        add(
            AutomaticTranslationItemPreference(
                language = Language(Locale.GERMAN.toLanguageTag(), Locale.GERMAN.displayLanguage),
                automaticTranslationOptionPreference = AutomaticTranslationOptionPreference.NeverTranslate(),
            ),
        )
        add(
            AutomaticTranslationItemPreference(
                language = Language(Locale.ITALIAN.toLanguageTag(), Locale.ITALIAN.displayLanguage),
                automaticTranslationOptionPreference = AutomaticTranslationOptionPreference.AlwaysTranslate(),
            ),
        )
    }
}

@Composable
@LightDarkPreview
private fun AutomaticTranslationPreferencePreview() {
    FirefoxTheme {
        AutomaticTranslationPreference(
            automaticTranslationListPreferences = getAutomaticTranslationListPreferences(),
            onItemClick = {},
        )
    }
}
