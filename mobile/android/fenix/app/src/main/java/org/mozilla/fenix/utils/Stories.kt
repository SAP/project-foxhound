/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.utils

import androidx.core.net.toUri
import mozilla.components.browser.state.state.SessionState

private const val STORY_URL_QUERY_PARAMETER_NAME = "utm_fenix_story_source"
private const val HOME_SCREEN_SOURCE = "home"
private const val STORIES_SCREEN_SOURCE = "stories"

/**
 * Helper methods for interacting with tabs and URLs of stories opened from application's home screen.
 */
object Stories {
    /**
     * Apply a custom UTM parameter to this URL to signal that is it a of a story opened from the home screen.
     */
    fun String.markAsOpenedFromHomeScreen() = toUri().buildUpon().appendQueryParameter(
        STORY_URL_QUERY_PARAMETER_NAME,
        HOME_SCREEN_SOURCE,
    ).build().toString()

    /**
     * Apply a custom UTM parameter to this URL to signal that is it a of a story opened from the stories screen.
     */
    fun String.markAsOpenedFromStoriesScreen() = toUri().buildUpon().appendQueryParameter(
        STORY_URL_QUERY_PARAMETER_NAME,
        STORIES_SCREEN_SOURCE,
    ).build().toString()

    /**
     * Apply the stories specific UTM parameter from the [source] URL to the current URL.
     */
    fun String.syncInternallyOpenedStoryMarker(source: String?) = when (source?.isUrlOfInternallyOpenedStory()) {
        true -> toUri().buildUpon().appendQueryParameter(
            STORY_URL_QUERY_PARAMETER_NAME,
            source.toUri().getQueryParameters(STORY_URL_QUERY_PARAMETER_NAME).firstOrNull(),
        ).build().toString()
        else -> this
    }

    /**
     * Check if this URL is of a story opened from the home screen.
     */
    fun String.isUrlOfAHomeScreenStory() = try {
        toUri().getQueryParameters(STORY_URL_QUERY_PARAMETER_NAME)?.firstOrNull() == HOME_SCREEN_SOURCE
    } catch (_: RuntimeException) {
        false
    }

    /**
     * Check if this URL is of a story opened from the stories screen.
     */
    fun String.isUrlOfAStoriesScreenStory() = try {
        toUri().getQueryParameters(STORY_URL_QUERY_PARAMETER_NAME)?.firstOrNull() == STORIES_SCREEN_SOURCE
    } catch (_: RuntimeException) {
        false
    }

    /**
     * Check if this URL is of a story opened from an application feature.
     */
    fun String.isUrlOfInternallyOpenedStory() = isUrlOfAHomeScreenStory() || isUrlOfAStoriesScreenStory()

    /**
     * Check if the current website is a story opened from the home screen in the current application session.
     */
    fun SessionState.hasUrlOfAHomeScreenStory() = !restored && content.url.isUrlOfAHomeScreenStory()

    /**
     * Check if the current website is a story opened from the stories screen in the current application session.
     */
    fun SessionState.hasUrlOfAStoriesScreenStory() = !restored && content.url.isUrlOfAStoriesScreenStory()

    /**
     * Check if the current website is a story opened from an application feature in the current session.
     */
    fun SessionState.hasUrlOfInternallyOpenedStory() = hasUrlOfAHomeScreenStory() || hasUrlOfAStoriesScreenStory()
}
