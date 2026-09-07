/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ext

import mozilla.components.browser.state.search.SearchEngine
import mozilla.components.browser.state.search.SearchEngine.Type.APPLICATION
import org.mozilla.fenix.R
import org.mozilla.fenix.components.search.BOOKMARKS_SEARCH_ENGINE_ID
import org.mozilla.fenix.components.search.HISTORY_SEARCH_ENGINE_ID
import org.mozilla.fenix.components.search.TABS_SEARCH_ENGINE_ID

// List of well known search domains, taken from
// https://searchfox.org/firefox-main/source/toolkit/components/search/SearchService.jsm#2405
private val wellKnownSearchDomains = setOf(
    "aol",
    "ask",
    "baidu",
    "bing",
    "duckduckgo",
    "google",
    "yahoo",
    "yandex",
    "startpage",
)

/**
 * Whether or not the search engine is a custom engine added by the user.
 */
fun SearchEngine.isCustomEngine(): Boolean =
    this.type == SearchEngine.Type.CUSTOM

/**
 * Whether this is a Google search engine (any regional/distribution variant).
 *
 * The bundled Google engines ship with ids like `google-b-1-m`, `google-com-nocodes`, etc.,
 * so this matches on the `google` prefix rather than a single exact id.
 */
fun SearchEngine?.isGoogleSearchEngine(): Boolean =
    this?.id?.startsWith("google") == true

/**
 * Whether or not the search engine is a known search domain.
 */
fun SearchEngine.isKnownSearchDomain(): Boolean =
    this.resultUrls[0].findAnyOf(wellKnownSearchDomains, 0, true) != null

/**
 * Return safe search engine name for telemetry purposes.
 */
fun SearchEngine.telemetryName(): String =
    when (type) {
        SearchEngine.Type.CUSTOM -> "custom"
        SearchEngine.Type.APPLICATION ->
            when (id) {
                HISTORY_SEARCH_ENGINE_ID -> "history"
                BOOKMARKS_SEARCH_ENGINE_ID -> "bookmarks"
                TABS_SEARCH_ENGINE_ID -> "tabs"
                else -> "application"
            }
        else -> name
    }

/**
 * Returns the correct toolbar‐placeholder string resource for this search engine.
 *
 * @param defaultEngine The “default” engine to compare to (nullable).
 */
fun SearchEngine?.toolbarHintRes(defaultEngine: SearchEngine?): Int {
    if (this == null) return R.string.search_hint

    val isDefault = this.id == defaultEngine?.id
    return when (this.type) {
        APPLICATION -> when (this.id) {
            HISTORY_SEARCH_ENGINE_ID -> R.string.history_search_hint
            BOOKMARKS_SEARCH_ENGINE_ID -> R.string.bookmark_search_hint
            TABS_SEARCH_ENGINE_ID -> R.string.tab_search_hint
            else -> R.string.application_search_hint
        }
        else -> {
            if (!this.isGeneral) {
                R.string.application_search_hint
            } else if (isDefault) {
                R.string.search_hint
            } else {
                R.string.search_hint_general_engine
            }
        }
    }
}
