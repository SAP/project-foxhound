/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.search

import android.graphics.Bitmap
import android.graphics.Color
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import androidx.core.graphics.createBitmap
import mozilla.components.browser.state.search.SearchEngine
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.SearchState
import mozilla.components.browser.state.state.availableSearchEngines
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.compose.base.annotation.FlexibleWindowPreview
import mozilla.components.compose.base.button.IconButton
import mozilla.components.compose.base.menu.DropdownMenu
import mozilla.components.compose.base.menu.MenuItem
import mozilla.components.compose.base.menu.MenuItem.FixedItem.Level
import mozilla.components.compose.base.text.Text
import mozilla.components.lib.state.ext.observeAsComposableState
import org.mozilla.fenix.R
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme
import mozilla.components.ui.icons.R as iconsR

/**
 * Top-level UI for search shortcuts settings.
 *
 * @param categoryTitle is used for displaying a title above the search shortcut list.
 * @param store [BrowserStore] used to listen for changes to [SearchState].
 * @param onCheckboxClicked Invoked when the user clicks on the checkbox of a search engine item.
 * @param onEditEngineClicked Invoked when the user clicks on the edit item of the three dot menu.
 * @param onDeleteEngineClicked Invoked when the user clicks on the delete item of the three dot menu.
 * @param onAddEngineClicked Invoked when the user clicks on the add search engine button.
 */
@Composable
fun SearchEngineShortcuts(
    categoryTitle: String,
    store: BrowserStore,
    onCheckboxClicked: (SearchEngine, Boolean) -> Unit,
    onEditEngineClicked: (SearchEngine) -> Unit,
    onDeleteEngineClicked: (SearchEngine) -> Unit,
    onAddEngineClicked: () -> Unit,
) {
    val searchState = store.observeAsComposableState { it.search }.value
    val searchEngines = with(searchState) {
        regionSearchEngines + additionalSearchEngines + availableSearchEngines + customSearchEngines
    }
    val disabledShortcutsIds = searchState.disabledSearchEngineIds

    Surface {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
        ) {
            item {
                Spacer(modifier = Modifier.height(8.dp))

                Title(title = categoryTitle)

                Spacer(modifier = Modifier.height(16.dp))
            }

            items(
                items = searchEngines,
                key = { engine -> engine.id },
            ) {
                SearchItem(
                    engine = it,
                    name = it.name,
                    isEnabled = !disabledShortcutsIds.contains(it.id),
                    onCheckboxClicked = onCheckboxClicked,
                    onEditEngineClicked = onEditEngineClicked,
                    onDeleteEngineClicked = onDeleteEngineClicked,
                )
            }

            item {
                AddEngineButton(onAddEngineClicked = onAddEngineClicked)
            }
        }
    }
}

@Composable
private fun Title(title: String) {
    Text(
        text = title,
        modifier = Modifier.padding(horizontal = 16.dp),
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        style = FirefoxTheme.typography.headline8,
    )
}

@Suppress("LongMethod")
@Composable
private fun SearchItem(
    engine: SearchEngine,
    name: String,
    isEnabled: Boolean,
    onCheckboxClicked: (SearchEngine, Boolean) -> Unit,
    onEditEngineClicked: (SearchEngine) -> Unit,
    onDeleteEngineClicked: (SearchEngine) -> Unit,
) {
    val isMenuExpanded: MutableState<Boolean> = remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .defaultMinSize(minHeight = 56.dp)
            .padding(start = 4.dp),
    ) {
        Checkbox(
            modifier = Modifier.align(Alignment.CenterVertically),
            checked = isEnabled,
            onCheckedChange = { onCheckboxClicked.invoke(engine, it) },
        )

        Spacer(modifier = Modifier.width(20.dp))

        Image(
            modifier = Modifier
                .align(Alignment.CenterVertically)
                .size(24.dp),
            bitmap = engine.icon.asImageBitmap(),
            contentDescription = stringResource(
                id = R.string.search_engine_icon_content_description_1,
                engine.name,
            ),
        )

        Spacer(modifier = Modifier.width(16.dp))

        Text(
            text = name,
            modifier = Modifier
                .align(Alignment.CenterVertically)
                .padding(vertical = 8.dp)
                .weight(1f),
            style = FirefoxTheme.typography.body1,
        )

        if (engine.type == SearchEngine.Type.CUSTOM) {
            Box(
                modifier = Modifier
                    .align(Alignment.CenterVertically),
            ) {
                IconButton(
                    onClick = {
                        isMenuExpanded.value = true
                    },
                    contentDescription = stringResource(id = R.string.content_description_menu),
                ) {
                    Icon(
                        painter = painterResource(id = iconsR.drawable.mozac_ic_ellipsis_vertical_24),
                        contentDescription = null,
                    )

                    DropdownMenu(
                        menuItems = listOf(
                            MenuItem.TextItem(
                                text = Text.Resource(R.string.search_engine_edit),
                                level = Level.Critical,
                                onClick = { onEditEngineClicked(engine) },
                            ),
                            MenuItem.TextItem(
                                text = Text.Resource(R.string.search_engine_delete),
                                level = Level.Critical,
                                onClick = { onDeleteEngineClicked(engine) },
                            ),
                        ),
                        expanded = isMenuExpanded.value,
                        modifier = Modifier,
                        offset = DpOffset(x = 0.dp, y = (-24).dp),
                        onDismissRequest = { isMenuExpanded.value = false },
                    )
                }
            }
        } else {
            Spacer(modifier = Modifier.width(16.dp))
        }
    }
}

@Composable
private fun AddEngineButton(
    onAddEngineClicked: () -> Unit,
) {
    Row(
        modifier = Modifier
            .defaultMinSize(minHeight = 56.dp)
            .padding(start = 4.dp)
            .clickable { onAddEngineClicked() },
    ) {
        Spacer(modifier = Modifier.width(68.dp))

        Icon(
            modifier = Modifier
                .size(24.dp)
                .align(Alignment.CenterVertically),
            painter = painterResource(id = iconsR.drawable.mozac_ic_plus_24),
            contentDescription = stringResource(
                id = R.string.search_engine_add_custom_search_engine_button_content_description,
            ),
        )

        Spacer(modifier = Modifier.width(16.dp))

        Text(
            modifier = Modifier
                .align(Alignment.CenterVertically)
                .padding(vertical = 8.dp)
                .weight(1f),
            text = stringResource(id = R.string.search_engine_add_custom_search_engine_title),
            style = FirefoxTheme.typography.body1,
        )

        Spacer(modifier = Modifier.width(16.dp))
    }
}

private fun generateFakeEnginesList(): List<SearchEngine> {
    return listOf(
        generateFakeEngines("1", "Google"),
        generateFakeEngines("2", "Bing"),
        generateFakeEngines("3", "Bing"),
        generateFakeEngines("4", "DuckDuckGo"),
        generateFakeEngines("5", "Qwant"),
        generateFakeEngines("6", "eBay"),
        generateFakeEngines("7", "Reddit"),
        generateFakeEngines("8", "YouTube"),
        generateFakeEngines("9", "Yandex", SearchEngine.Type.CUSTOM),
    )
}

private fun generateFakeEngines(
    id: String,
    name: String,
    type: SearchEngine.Type = SearchEngine.Type.BUNDLED,
): SearchEngine {
    return SearchEngine(
        id = id,
        name = name,
        icon = createBitmap(1, 1, Bitmap.Config.ARGB_8888).apply {
            eraseColor(Color.BLUE)
        },
        type = type,
        isGeneral = true,
    )
}

@FlexibleWindowPreview
@Composable
private fun SearchEngineShortcutsPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        SearchEngineShortcuts(
            categoryTitle = stringResource(id = R.string.preferences_category_engines_in_search_menu),
            store = BrowserStore(
                initialState = BrowserState(
                    search = SearchState(
                        regionSearchEngines = generateFakeEnginesList(),
                        disabledSearchEngineIds = listOf("7", "8"),
                    ),
                ),
            ),
            onCheckboxClicked = { _, _ -> },
            onEditEngineClicked = {},
            onDeleteEngineClicked = {},
            onAddEngineClicked = {},
        )
    }
}
