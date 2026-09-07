/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.searchsuggestions

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import mozilla.components.browser.state.state.selectedOrDefaultSearchEngine
import mozilla.components.feature.search.ext.canProvideSearchSuggestions
import mozilla.telemetry.glean.private.NoExtras
import org.mozilla.focus.FocusApplication
import org.mozilla.focus.GleanMetrics.SearchSuggestions

/**
 * Represents the state of search suggestions.
 */
sealed class State {
    /**
     * Search suggestions are disabled.
     */
    data class Disabled(val givePrompt: Boolean) : State()

    /**
     * The selected search engine does not provide a suggestions API.
     */
    data class NoSuggestionsAPI(val givePrompt: Boolean) : State()

    /**
     * Ready to fetch and display search suggestions.
     */
    object ReadyForSuggestions : State()
}

/**
 * ViewModel for managing search suggestions.
 */
class SearchSuggestionsViewModel(application: Application) : AndroidViewModel(application) {
    private val preferences: SearchSuggestionsPreferences = SearchSuggestionsPreferences(application)

    private val _selectedSearchSuggestion = MutableLiveData<String?>()
    val selectedSearchSuggestion: LiveData<String?> = _selectedSearchSuggestion

    private val _searchQuery = MutableLiveData<String>()
    val searchQuery: LiveData<String> = _searchQuery

    private val _state = MutableLiveData<State>()
    val state: LiveData<State> = _state

    private val _autocompleteSuggestion = MutableLiveData<String?>()
    val autocompleteSuggestion: LiveData<String?> = _autocompleteSuggestion

    var alwaysSearch = false
        private set

    /**
     * Selects a [suggestion] from the list of search suggestions.
     *
     * @param suggestion the suggestion text.
     * @param defaultSearchEngineName the name of the default search engine.
     * @param alwaysSearch if true, performs a search immediately.
     */
    fun selectSearchSuggestion(
        suggestion: String,
        defaultSearchEngineName: String,
        alwaysSearch: Boolean = false,
    ) {
        this.alwaysSearch = alwaysSearch
        _selectedSearchSuggestion.postValue(suggestion)

        if (suggestion == searchQuery.value) {
            SearchSuggestions.searchTapped.record(
                SearchSuggestions.SearchTappedExtra(defaultSearchEngineName),
            )
        } else {
            SearchSuggestions.suggestionTapped.record(
                SearchSuggestions.SuggestionTappedExtra(defaultSearchEngineName),
            )
        }
    }

    /**
     * Clears the currently selected search suggestion.
     */
    fun clearSearchSuggestion() {
        _selectedSearchSuggestion.postValue(null)
    }

    /**
     * Sets the given [text] as an autocomplete suggestion.
     */
    fun setAutocompleteSuggestion(text: String) {
        _autocompleteSuggestion.postValue(text)
        SearchSuggestions.autocompleteArrowTapped.record(NoExtras())
    }

    /**
     * Clears the current autocomplete suggestion.
     */
    fun clearAutocompleteSuggestion() {
        _autocompleteSuggestion.postValue(null)
    }

    /**
     * Sets the current search [query].
     */
    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    /**
     * Enables search suggestions.
     */
    fun enableSearchSuggestions() {
        preferences.enableSearchSuggestions()
        updateState()
        setSearchQuery(searchQuery.value ?: "")
    }

    /**
     * Disables search suggestions.
     */
    fun disableSearchSuggestions() {
        preferences.disableSearchSuggestions()
        updateState()
    }

    /**
     * Dismisses the "no suggestions" message.
     */
    fun dismissNoSuggestionsMessage() {
        preferences.dismissNoSuggestionsMessage()
        updateState()
    }

    /**
     * Refreshes the state of search suggestions.
     */
    fun refresh() {
        updateState()
    }

    private fun updateState() {
        val enabled = preferences.searchSuggestionsEnabled()

        val store = getApplication<FocusApplication>().components.store

        val state = if (enabled) {
            if (store.state.search.selectedOrDefaultSearchEngine?.canProvideSearchSuggestions == true) {
                State.ReadyForSuggestions
            } else {
                val givePrompt = !preferences.userHasDismissedNoSuggestionsMessage()
                State.NoSuggestionsAPI(givePrompt)
            }
        } else {
            val givePrompt = !preferences.hasUserToggledSearchSuggestions()
            State.Disabled(givePrompt)
        }

        _state.value = state
    }
}
