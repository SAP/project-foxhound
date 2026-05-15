/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.pocket.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.SelectableChipColors
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTag
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.SelectableChip
import org.mozilla.fenix.home.pocket.POCKET_STORIES_DEFAULT_CATEGORY_NAME
import org.mozilla.fenix.home.pocket.PocketRecommendedStoriesCategory
import org.mozilla.fenix.home.pocket.PocketRecommendedStoriesSelectedCategory

/**
 * Displays a list of [PocketRecommendedStoriesCategory]s.
 *
 * @param categories The categories needed to be displayed.
 * @param selections List of categories currently selected.
 * @param modifier [Modifier] to be applied to the layout.
 * @param categoryColors The color set defined by [SelectableChipColors] used to style Pocket categories.
 * @param onCategoryClick Callback for when the user taps a category.
 */
@Composable
fun StoriesCategories(
    categories: List<PocketRecommendedStoriesCategory>,
    selections: List<PocketRecommendedStoriesSelectedCategory>,
    modifier: Modifier = Modifier,
    categoryColors: SelectableChipColors = FilterChipDefaults.filterChipColors(),
    onCategoryClick: (PocketRecommendedStoriesCategory) -> Unit,
) {
    Box(
        modifier = modifier.semantics {
            testTagsAsResourceId = true
            testTag = "pocket.categories"
        },
    ) {
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            categories.filter { it.name != POCKET_STORIES_DEFAULT_CATEGORY_NAME }
                .forEach { category ->
                    SelectableChip(
                        text = category.name,
                        selected = selections.map { it.name }.contains(category.name),
                        colors = categoryColors,
                    ) {
                        onCategoryClick(category)
                    }
                }
        }
    }
}
