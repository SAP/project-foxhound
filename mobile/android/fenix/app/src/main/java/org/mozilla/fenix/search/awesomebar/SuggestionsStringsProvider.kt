/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.search.awesomebar

import android.content.Context
import androidx.annotation.VisibleForTesting
import mozilla.components.browser.state.search.SearchEngine
import mozilla.components.browser.state.search.SearchEngineProvider
import org.mozilla.fenix.R
import org.mozilla.fenix.search.awesomebar.SearchSuggestionsProvidersBuilder.Companion.GOOGLE_SEARCH_ENGINE_NAME
import mozilla.components.feature.awesomebar.R as awesomebarR
import mozilla.components.feature.fxsuggest.R as fxsuggestR

/**
 * Provides localized strings for various suggestion groups in the AwesomeBar.
 * This includes headers for different suggestion categories and descriptive texts.
 */
interface SuggestionsStringsProvider {

    /**
     * Returns a localized string that can be used as a header for search engine suggestions.
     * The string will be formatted with the current search engine's name if provided.
     * If `currentEngine` is null, it will use the `defaultSearchEngine`.
     *
     * Examples:
     * - If `currentEngine` is null and `defaultSearchEngine.name` is "Mozilla": "Search with Mozilla"
     * - If `currentEngine.name` is "Google": "Search with Google"
     *
     * @param currentEngine The current search engine, or null if no specific engine is active.
     * @return The header string for search engine suggestions, or null if both engines are null or have no name.
     */
    fun forSearchEngineSuggestion(currentEngine: SearchEngine? = null): String?

    /**
     * Returns a String for the "Trending searches" header.
     *
     * This header is shown above the trending search suggestions.
     *
     * @param engine The search engine for which the trending searches are relevant.
     * @return The header string.
     */
    fun forTrendingSearches(engine: SearchEngine?): String?

    /**
     * Header for recent search terms.
     */
    fun forRecentSearches(): String

    /**
     * Returns the localized description text for search engine suggestions.
     * This is typically shown below the title for search engine shortcuts/suggestions.
     */
    fun forSearchEngineSuggestionDescription(): String

    /**
     * Returns the title for the search shortcuts settings.
     *
     * @return The localized title string.
     */
    fun searchShortcutsSettingsTitle(): String

    /**
     * Returns a localized string that can be used as a title for suggestions from a specific search engine provider.
     * The string will be formatted with the provided [searchEngineName].
     *
     * Example:
     * - If `searchEngineName` is "Google": "Search Google"
     *
     * @param searchEngineName The name of the search engine.
     * @return The title string for the search engine suggestion provider.
     */
    fun searchEngineSuggestionProviderTitle(searchEngineName: String): String

    /**
     * Returns the localized description string for "Switch to Tab" suggestions.
     * This string is typically displayed as a secondary text or description for
     * suggestions that allow the user to switch to an already open tab.
     *
     * @return The localized description string.
     */
    fun getSwitchToTabDescriptionString(): String

    /**
     * Returns the localized description string for sponsored suggestions.
     * This string is typically displayed as secondary text or a disclaimer
     * for suggestions that are sponsored or promoted.
     *
     * @return The localized description string for sponsored suggestions.
     */
    fun getSponsoredSuggestionDescription(): String

    /**
     * "Firefox Suggest" header.
     */
    val firefoxSuggestHeader: String
}

/**
 * Default implementation of [SuggestionsStringsProvider] that retrieves
 * headers from Android string resources.
 */
class DefaultSuggestionsStringsProvider(
    private val context: Context,
    private val searchEngineProvider: SearchEngineProvider,
) : SuggestionsStringsProvider {

    /**
     * Retrieves the header text for search engine suggestions.
     *
     * This function determines the appropriate header string based on the current and default search engines.
     * - If a `currentEngine` is provided and it's different from the `defaultSearchEngine`,
     *   no header is returned (returns `null`). This implies that headers are only shown
     *   for the default search engine or when no specific `currentEngine` is provided (implying the default).
     * - If the `defaultSearchEngine` is Google, a specific "Search Google" string is used.
     * - For any other `defaultSearchEngine`, a generic "Search with [Engine Name]" string is used.
     * - If the `defaultSearchEngine` is null or its name is empty, `null` is returned.
     *
     * @param currentEngine The search engine currently in context, if any.
     * @return The localized header string for search suggestions, or `null` if no header should be displayed.
     */
    @VisibleForTesting
    override fun forSearchEngineSuggestion(currentEngine: SearchEngine?): String? {
        val defaultSearchEngine = searchEngineProvider.getDefaultSearchEngine()

        if (currentEngine != null && defaultSearchEngine != currentEngine) {
            return null // Header only for the default engine or if currentEngine is null (implying default)
        }

        var searchEngineName = defaultSearchEngine?.name
        if (!searchEngineName.isNullOrEmpty()) {
            searchEngineName = when (searchEngineName) {
                GOOGLE_SEARCH_ENGINE_NAME -> context.getString(
                    R.string.google_search_engine_suggestion_header,
                )
                else -> context.getString(
                    R.string.other_default_search_engine_suggestion_header,
                    searchEngineName,
                )
            }
        }
        return searchEngineName
    }

    /**
     * Provides a string that serves as a header for trending searches.
     * The string is localized and formatted with the provided search engine's name.
     *
     * Example: "Trending on Google"
     *
     * @param engine The search engine, or null.
     * @return A localized string for the trending searches header, or null if the engine is null.
     */
    override fun forTrendingSearches(engine: SearchEngine?): String? {
        return engine?.name?.let { context.getString(R.string.trending_searches_header_2, it) }
    }

    /**
     * Retrieves the header text for recent searches.
     *
     * @return The localized header string for recent searches.
     */
    override fun forRecentSearches(): String {
        return context.getString(R.string.recent_searches_header)
    }

    /**
     * Retrieves the localized description text for search engine suggestions.
     *
     * @return The localized description string.
     */
    override fun forSearchEngineSuggestionDescription(): String {
        return context.getString(R.string.search_engine_suggestions_description)
    }

    /**
     * Returns the localized string for the "Firefox Suggest" header.
     *
     * This header is used in the awesomebar to indicate suggestions
     * that are powered by Firefox Suggest.
     */
    override val firefoxSuggestHeader =
        context.getString(R.string.firefox_suggest_header)

    /**
     * Returns the title for the search shortcuts engine settings.
     * This title is displayed in the UI, typically for a settings section related to search engine shortcuts.
     *
     * @return The localized title string.
     */
    override fun searchShortcutsSettingsTitle(): String {
        return context.getString(R.string.search_shortcuts_engine_settings)
    }

    override fun searchEngineSuggestionProviderTitle(searchEngineName: String): String {
        return context.getString(R.string.search_engine_suggestions_title, searchEngineName)
    }

    override fun getSwitchToTabDescriptionString(): String {
        return context.getString(awesomebarR.string.switch_to_tab_description)
    }

    override fun getSponsoredSuggestionDescription(): String {
        return context.getString(fxsuggestR.string.sponsored_suggestion_description)
    }
}
