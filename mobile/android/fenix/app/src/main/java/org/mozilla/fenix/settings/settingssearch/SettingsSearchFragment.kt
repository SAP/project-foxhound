/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.settingssearch

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.fragment.app.Fragment
import androidx.fragment.compose.content
import androidx.lifecycle.coroutineScope
import androidx.navigation.fragment.findNavController
import mozilla.components.lib.state.helpers.StoreProvider.Companion.storeProvider
import org.mozilla.fenix.GleanMetrics.SettingsSearch
import org.mozilla.fenix.e2e.SystemInsetsPaddedFragment
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.settings.settingssearch.DefaultFenixSettingsIndexer.Companion.defaultPreferenceFileInformationList
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * Fragment for the settings search screen.
 */
open class SettingsSearchFragment : Fragment(), SystemInsetsPaddedFragment {

    protected lateinit var settingsSearchStore: SettingsSearchStore

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View = content {
        settingsSearchStore = buildSettingsSearchStore()
        (activity as? AppCompatActivity)?.supportActionBar?.hide()
        FirefoxTheme {
            var isSearchFocused by rememberSaveable { mutableStateOf(true) }

            SettingsSearchScreen(
                store = settingsSearchStore,
                onBackClick = {
                    findNavController().popBackStack()
                },
                isSearchFocused = isSearchFocused,
                onSearchFocusChange = { isSearchFocused = it },
                onResultItemClick = { item, isRecentSearch ->
                    onResultItemClick(item, isRecentSearch)
                },
            )
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        (activity as? AppCompatActivity)?.supportActionBar?.show()
    }

    protected open fun buildSettingsSearchStore(): SettingsSearchStore {
        val recentSettingsSearchesRepository = FenixRecentSettingsSearchesRepository(
            dataStore = requireContext().recentSearchesDataStore,
            preferenceFileInformationList = defaultPreferenceFileInformationList,
        )

        return storeProvider.get { restoredState ->
            SettingsSearchStore(
                initialState = restoredState ?: SettingsSearchState.Default(emptyList()),
                middleware = listOf(
                    SettingsSearchMiddleware(
                        fenixSettingsIndexer = requireContext().components.settingsIndexer,
                        navController = findNavController(),
                        recentSettingsSearchesRepository = recentSettingsSearchesRepository,
                        scope = viewLifecycleOwner.lifecycle.coroutineScope,
                    ),
                ),
            )
        }
    }

    protected open fun onResultItemClick(
        item: SettingsSearchItem,
        isRecentSearch: Boolean,
    ) {
        SettingsSearch.searchResultClicked.record(
            SettingsSearch.SearchResultClickedExtra(
                itemPreferenceKey = item.preferenceKey,
                isRecentSearch = isRecentSearch,
            ),
        )
        settingsSearchStore.dispatch(SettingsSearchAction.ResultItemClicked(item))
    }
}
