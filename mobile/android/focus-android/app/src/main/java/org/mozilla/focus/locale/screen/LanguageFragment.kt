/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.locale.screen

import android.os.Bundle
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import kotlinx.coroutines.launch
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.lib.state.ext.observeAsComposableState
import mozilla.components.support.locale.LocaleManager
import mozilla.components.support.locale.LocaleUseCases
import org.mozilla.focus.R
import org.mozilla.focus.ext.components
import org.mozilla.focus.settings.BaseComposeFragment

/**
 * A [BaseComposeFragment] responsible for displaying and managing the language selection screen.
 */
class LanguageFragment : BaseComposeFragment() {
    private lateinit var browserStore: BrowserStore
    private lateinit var localeUseCases: LocaleUseCases
    private lateinit var languageScreenStore: LanguageScreenStore
    private lateinit var defaultLanguageScreenInteractor: DefaultLanguageScreenInteractor

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        browserStore = requireContext().components.store
        localeUseCases = LocaleUseCases(browserStore)
        languageScreenStore = LanguageScreenStore(
            LanguageScreenState(),
            listOf(
                LanguageMiddleware(
                    activity = requireActivity(),
                    localeUseCase = localeUseCases,
                    storage = LanguageStorage(requireContext()),
                    getSystemDefault = { LocaleManager.getSystemDefault() },
                ),
            ),
        )
        languageScreenStore.state.languageList

        defaultLanguageScreenInteractor = DefaultLanguageScreenInteractor(
            languageScreenStore = languageScreenStore,
        )
    }

    override val titleRes: Int
        get() = R.string.preference_language

    @Composable
    override fun Content() {
        val languagesList by languageScreenStore.observeAsComposableState { it.languageList }
        val languageSelected by languageScreenStore.observeAsComposableState { it.selectedLanguage }

        languageSelected?.let { Languages(languageSelected = it, languages = languagesList) }
    }

    @Composable
    private fun Languages(languageSelected: Language, languages: List<Language>) {
        val listState = rememberLazyListState()
        val coroutineScope = rememberCoroutineScope()

        // This local state for the selected tag allows for instant UI feedback upon click.
        var selectedTag by remember(languageSelected) { mutableStateOf(languageSelected.tag) }

        LaunchedEffect(languageSelected.index) {
            coroutineScope.launch {
                if (languageSelected.index in languages.indices) {
                    listState.scrollToItem(languageSelected.index)
                }
            }
        }

        LanguagesList(
            languages = languages,
            selectedTag = selectedTag,
            onLanguageSelected = {
                selectedTag = it.tag
                defaultLanguageScreenInteractor.handleLanguageSelected(it)
            },
            listState = listState,
        )
    }
}
