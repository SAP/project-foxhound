/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.settingssearch

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.BiasAlignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.colorResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import mozilla.components.lib.state.ext.observeAsComposableState
import org.mozilla.fenix.GleanMetrics.SettingsSearch
import org.mozilla.fenix.R
import org.mozilla.fenix.settings.settingssearch.ui.SettingsSearchSectionHeader
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * Composable for the settings search screen.
 *
 * @param store [SettingsSearchStore] for the screen.
 * @param onBackClick Callback for when the back button is clicked.
 * @param isSearchFocused Whether the search bar is currently focused.
 * @param onSearchFocusChange Callback for when the search bar's focus state changes.
 */
@Composable
fun SettingsSearchScreen(
    store: SettingsSearchStore,
    onBackClick: () -> Unit,
    isSearchFocused: Boolean,
    onSearchFocusChange: (Boolean) -> Unit,
) {
    val state by store.observeAsComposableState { it }
    Scaffold(
        topBar = {
            Column {
                SettingsSearchBar(
                    store = store,
                    onBackClick = onBackClick,
                    isSearchFocused = isSearchFocused,
                    onSearchFocusChange = onSearchFocusChange,
                )
                HorizontalDivider()
            }
        },
    ) { paddingValues ->
        val topPadding = remember(paddingValues) {
            paddingValues.calculateTopPadding()
        }

        when (state) {
            is SettingsSearchState.Default -> {
                if (state.recentSearches.isNotEmpty()) {
                    RecentSearchesContent(
                        store = store,
                        modifier = Modifier
                            .padding(top = topPadding)
                            .fillMaxSize(),
                        )
                } else {
                    SettingsSearchMessageContent(
                        modifier = Modifier
                            .padding(top = topPadding)
                            .fillMaxSize(),
                    )
                }
            }
            is SettingsSearchState.NoSearchResults -> {
                EmptySearchResultsView(
                    modifier = Modifier
                        .padding(top = topPadding)
                        .fillMaxSize(),
                )
            }
            is SettingsSearchState.SearchInProgress -> {
                SearchResults(
                    store = store,
                    modifier = Modifier
                        .padding(top = topPadding)
                        .fillMaxSize(),
                )
            }
        }
    }
}

@Composable
private fun SettingsSearchMessageContent(
    modifier: Modifier = Modifier,
) {
    val displayMessage = stringResource(R.string.settings_search_empty_query_placeholder)
    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = displayMessage,
            textAlign = TextAlign.Center,
            style = FirefoxTheme.typography.body2,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SearchResults(
    store: SettingsSearchStore,
    modifier: Modifier = Modifier,
) {
    val state by store.observeAsComposableState { it }
    val focusManager = LocalFocusManager.current
    val listState = rememberLazyListState()

    LaunchedEffect(listState) {
        snapshotFlow { listState.isScrollInProgress }
            .collect { isScrolling ->
                if (isScrolling) {
                    focusManager.clearFocus()
                }
            }
    }

    LazyColumn(
        modifier = modifier,
        state = listState,
    ) {
        state.groupedResults.forEach { (header, items) ->
            item {
                SettingsSearchSectionHeader(title = header)
            }

            items(items.size) { index ->
                val settingsSearchItem = items[index]
                SettingsSearchResultItem(
                    item = settingsSearchItem,
                    query = state.searchQuery,
                    onClick = {
                        SettingsSearch.searchResultClicked.record(
                            SettingsSearch.SearchResultClickedExtra(
                                itemPreferenceKey = settingsSearchItem.preferenceKey,
                                isRecentSearch = false,
                            ),
                        )
                        store.dispatch(
                            SettingsSearchAction.ResultItemClicked(
                                settingsSearchItem,
                            ),
                        )
                    },
                )
            }

            item {
                HorizontalDivider(modifier = Modifier.padding(top = 8.dp, bottom = 12.dp))
            }
        }
    }
}

@Composable
private fun RecentSearchesContent(
    store: SettingsSearchStore,
    modifier: Modifier = Modifier,
) {
    val state by store.observeAsComposableState { it }
    val focusManager = LocalFocusManager.current
    val listState = rememberLazyListState()

    LaunchedEffect(listState) {
        snapshotFlow { listState.isScrollInProgress }
            .collect { isScrolling ->
                if (isScrolling) {
                    focusManager.clearFocus()
                }
            }
    }

    Column(
        modifier = modifier,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 50.dp)
                .padding(start = 16.dp, top = 12.dp, bottom = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = stringResource(R.string.settings_search_recent_searches_section_header),
                style = FirefoxTheme.typography.headline8,
                color = colorResource(RECENT_SEARCHES_HEADER_TEXT_COLOR),
            )
            TextButton(
                onClick = {
                    store.dispatch(SettingsSearchAction.ClearRecentSearchesClicked)
                },
                colors = ButtonDefaults.textButtonColors(),
                modifier = Modifier.heightIn(min = 48.dp),
                enabled = true,
            ) {
               Text(
                   text = stringResource(R.string.settings_search_clear_recent_searches_message),
                   color = colorResource(RECENT_SEARCHES_CLEAR_RECENTS_TEXT_COLOR),
                   style = FirefoxTheme.typography.button,
                   maxLines = 1,
               )
            }
        }
        LazyColumn(
            state = listState,
        ) {
            items(state.recentSearches.size) { index ->
                val searchItem = state.recentSearches[index]

                SettingsSearchResultItem(
                    item = searchItem,
                    query = state.searchQuery,
                    onClick = {
                        SettingsSearch.searchResultClicked.record(
                            SettingsSearch.SearchResultClickedExtra(
                                itemPreferenceKey = searchItem.preferenceKey,
                                isRecentSearch = true,
                            ),
                        )
                        store.dispatch(
                            SettingsSearchAction.ResultItemClicked(
                                searchItem,
                            ),
                        )
                    },
                )
            }
        }
    }
}

@Composable
private fun EmptySearchResultsView(
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier,
        contentAlignment = BiasAlignment(0f, VERTICAL_BIAS_OFFSET_IMAGE_MESSAGE),
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Image(
                modifier = Modifier.size(77.dp),
                painter = painterResource(R.drawable.fox_exclamation_alert),
                contentDescription = null,
            )

            Text(
                text = stringResource(R.string.settings_search_no_results_title),
                textAlign = TextAlign.Center,
                style = FirefoxTheme.typography.headline7,
            )
            Text(
                text = stringResource(R.string.settings_search_no_results_message),
                textAlign = TextAlign.Center,
                style = FirefoxTheme.typography.body2,
            )
        }
    }
}

/**
 * Preview for the settings search screen initial state.
 */
@PreviewLightDark
@Composable
private fun SettingsSearchScreenInitialStatePreview() {
    FirefoxTheme {
        SettingsSearchScreen(
            store = SettingsSearchStore(),
            onBackClick = {},
            isSearchFocused = false,
            onSearchFocusChange = {},
        )
    }
}

/**
 * Preview for the settings search screen displaying a list of recent searches.
 */
@PreviewLightDark
@Composable
private fun SettingsSearchScreenWithRecentsPreview() {
    val storeWithRecents = SettingsSearchStore(
        initialState = SettingsSearchState.Default(
            recentSearches = listOf(
                SettingsSearchItem(
                    "Search engine",
                    "Choose your default",
                    "search_engine",
                    categoryHeader = "General",
                    PreferenceFileInformation.SearchSettingsPreferences,
                ),
                SettingsSearchItem(
                    "Delete browsing data",
                    "Clear history, cookies, and more",
                    "delete_browsing_data",
                    categoryHeader = "Privacy",
                    PreferenceFileInformation.PrivateBrowsingPreferences,
                ),
            ),
        ),
    )
    FirefoxTheme {
        SettingsSearchScreen(
            store = storeWithRecents,
            onBackClick = {},
            isSearchFocused = false,
            onSearchFocusChange = {},
        )
    }
}

/**
 * Preview for the settings search screen displaying search results.
 */
@PreviewLightDark
@Composable
private fun SettingsSearchScreenWithResultsPreview() {
    val storeWithResults = SettingsSearchStore(
        initialState = SettingsSearchState.SearchInProgress(
            searchQuery = "privacy",
            searchResults = listOf(
                SettingsSearchItem(
                    "Search engine",
                    "Choose your default",
                    "search_engine",
                    categoryHeader = "General",
                    PreferenceFileInformation.SearchSettingsPreferences,
                ),
                SettingsSearchItem(
                    "Homepage",
                    "Choose your homepage",
                    "home_page",
                    categoryHeader = "General",
                    PreferenceFileInformation.SearchSettingsPreferences,
                ),
                SettingsSearchItem(
                    "Tracking Protection",
                    "Strict, Standard, or Custom",
                    "tracking_protection",
                    categoryHeader = "Privacy",
                    PreferenceFileInformation.GeneralPreferences,
                ),
                SettingsSearchItem(
                    "Delete browsing data",
                    "Clear history, cookies, and more",
                    "delete_browsing_data",
                    categoryHeader = "Privacy",
                    PreferenceFileInformation.GeneralPreferences,
                ),
                SettingsSearchItem(
                    "HTTPS-Only Mode",
                    "Enable in all tabs",
                    "https_only_mode",
                    categoryHeader = "Privacy",
                    PreferenceFileInformation.GeneralPreferences,
                ),
            ),
            recentSearches = emptyList(),
        ),
    )
    FirefoxTheme {
        SettingsSearchScreen(
            store = storeWithResults,
            onBackClick = {},
            isSearchFocused = false,
            onSearchFocusChange = {},
        )
    }
}

/**
 * Preview for the settings search screen when no results are found.
 */
@PreviewLightDark
@Composable
private fun SettingsSearchScreenNoResultsPreview() {
    val storeWithNoResults = SettingsSearchStore(
        initialState = SettingsSearchState.NoSearchResults(
            searchQuery = "nonexistent query",
            recentSearches = emptyList(),
        ),
    )
    FirefoxTheme {
        SettingsSearchScreen(
            store = storeWithNoResults,
            onBackClick = {},
            isSearchFocused = false,
            onSearchFocusChange = {},
        )
    }
}

private val RECENT_SEARCHES_HEADER_TEXT_COLOR = mozilla.components.ui.colors.R.color.photonLightGrey40
private val RECENT_SEARCHES_CLEAR_RECENTS_TEXT_COLOR = mozilla.components.ui.colors.R.color.photonViolet70
private const val VERTICAL_BIAS_OFFSET_IMAGE_MESSAGE = -0.33f
