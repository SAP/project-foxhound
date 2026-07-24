/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.settingssearch

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import androidx.compose.ui.unit.dp
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * Composable for the settings search result item.
 *
 * @param item [SettingsSearchItem] to display.
 * @param query Query to highlight in the title.
 * @param onClick Callback for when the item is clicked.
 */
@Composable
fun SettingsSearchResultItem(
    item: SettingsSearchItem,
    query: String,
    onClick: () -> Unit,
) {
    val defaultSpanStyle = SpanStyle(
        fontWeight = FontWeight.Bold,
        background = FirefoxTheme.colors.layer3,
    )

    val displayTitle = remember(item.title, query) {
        highlightQueryMatchingText(
            text = item.title,
            query = query,
            highlight = defaultSpanStyle,
        )
    }
    val displaySubtitle = if (shouldShowSummary(item)) {
        AnnotatedString(item.summary)
    } else {
        val breadcrumbString = buildString {
            append(stringResource(item.preferenceFileInformation.topBreadcrumbResourceId))
            if (item.preferenceFileInformation.secondaryBreadcrumbResourceId != 0) {
                append(" > ")
                append(stringResource(item.preferenceFileInformation.secondaryBreadcrumbResourceId))
            }
        }
        AnnotatedString(breadcrumbString)
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 64.dp)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
    ) {
        Text(
            text = displayTitle,
            style = FirefoxTheme.typography.subtitle1,
            maxLines = 1,
            color = MaterialTheme.colorScheme.onSurface,
        )

        if (displaySubtitle.isNotBlank()) {
            Text(
                text = displaySubtitle,
                style = FirefoxTheme.typography.caption,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

/**
 * Whether the summary should be shown.
 *
 * @param item [SettingsSearchItem] to check.
 */
internal fun shouldShowSummary(
    item: SettingsSearchItem,
): Boolean {
    return (
            item.preferenceFileInformation == PreferenceFileInformation.GeneralPreferences &&
            item.summary.isNotBlank()
            )
}

/**
 * Highlights the query matching text.  Only the first instance of the matching text.
 * Works with even with mismatched capitalization.
 *
 * @param text Text to highlight.
 * @param query Query to highlight.
 * @param highlight Highlight style.
 */
internal fun highlightQueryMatchingText(
    text: String,
    query: String,
    highlight: SpanStyle,
): AnnotatedString {
    val trimmedQuery = query.trim()
    if (trimmedQuery.isBlank()) {
        return AnnotatedString(text)
    }

    var match = Regex.escape(trimmedQuery).toRegex(RegexOption.IGNORE_CASE).find(text)

    if (match == null) {
        val tokens = trimmedQuery.split(Regex("\\s+")).filter { it.isNotBlank() }
        if (tokens.isNotEmpty()) {
            val pattern = tokens.joinToString("|") { Regex.escape(it) }
            match = Regex(pattern, RegexOption.IGNORE_CASE).find(text)
        }
    }

    return buildAnnotatedString {
        append(text)
        match?.range?.let { range ->
            addStyle(highlight, range.first, range.last + 1)
        }
    }
}

private class SettingsSearchResultItemParameterProvider : PreviewParameterProvider<SettingsSearchItem> {
    override val values: Sequence<SettingsSearchItem>
        get() = sequenceOf(
            SettingsSearchItem(
                title = "Search Engine",
                summary = "Set your preferred search engine for browsing.",
                preferenceKey = "search_engine_main",
                categoryHeader = "General",
                preferenceFileInformation = PreferenceFileInformation.SearchSettingsPreferences,
            ),
            SettingsSearchItem(
                title = "Advanced Settings",
                summary = "", // Empty or blank summary
                preferenceKey = "advanced_stuff",
                categoryHeader = "Advanced",
                preferenceFileInformation = PreferenceFileInformation.GeneralPreferences,
            ),
        )
}

/**
 * Preview for the Settings Search Result Item.
 */
@PreviewLightDark
@Composable
private fun SettingsSearchResultItemFullPreview(
    @PreviewParameter(SettingsSearchResultItemParameterProvider::class) item: SettingsSearchItem,
) {
    FirefoxTheme {
        SettingsSearchResultItem(
            item = item,
            "a",
            onClick = {},
        )
    }
}
