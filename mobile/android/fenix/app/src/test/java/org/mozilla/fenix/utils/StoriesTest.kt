/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.utils

import mozilla.components.browser.state.state.createTab
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.utils.Stories.hasUrlOfAHomeScreenStory
import org.mozilla.fenix.utils.Stories.hasUrlOfAStoriesScreenStory
import org.mozilla.fenix.utils.Stories.hasUrlOfInternallyOpenedStory
import org.mozilla.fenix.utils.Stories.isUrlOfAHomeScreenStory
import org.mozilla.fenix.utils.Stories.isUrlOfAStoriesScreenStory
import org.mozilla.fenix.utils.Stories.isUrlOfInternallyOpenedStory
import org.mozilla.fenix.utils.Stories.markAsOpenedFromHomeScreen
import org.mozilla.fenix.utils.Stories.markAsOpenedFromStoriesScreen
import org.mozilla.fenix.utils.Stories.syncInternallyOpenedStoryMarker
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class StoriesTest {

    @Test
    fun `GIVEN a plain URL WHEN marking it as opened from home screen THEN a specific UTM parameter is appended`() {
        val url = "https://story.test"

        val result = url.markAsOpenedFromHomeScreen()

        assertEquals("https://story.test?utm_fenix_story_source=home", result)
    }

    @Test
    fun `GIVEN a URL with existing query params WHEN marking it as opened from home screen THEN a specific UTM parameter is appended`() {
        val url = "https://story.test?existing=param"

        val result = url.markAsOpenedFromHomeScreen()

        assertEquals("https://story.test?existing=param&utm_fenix_story_source=home", result)
    }

    @Test
    fun `GIVEN a plain URL WHEN marking as opened from stories screen THEN a specific UTM parameter is appended`() {
        val url = "https://story.test"

        val result = url.markAsOpenedFromStoriesScreen()

        assertEquals("https://story.test?utm_fenix_story_source=stories", result)
    }

    @Test
    fun `GIVEN a home screen story URL WHEN checking if opened from the home screen THEN return true`() {
        assertTrue("https://story.test?utm_fenix_story_source=home".isUrlOfAHomeScreenStory())
    }

    @Test
    fun `GIVEN a stories screen story URL WHEN checking if opened from the home screen THEN return false`() {
        assertFalse("https://story.test?utm_fenix_story_source=stories".isUrlOfAHomeScreenStory())
    }

    @Test
    fun `GIVEN a plain URL WHEN checking if opened from the home screen THEN return false`() {
        assertFalse("https://story.test".isUrlOfAHomeScreenStory())
    }

    @Test
    fun `GIVEN a stories screen story URL WHEN checking if opened from the stories screen THEN return true`() {
        assertTrue("https://story.test?utm_fenix_story_source=stories".isUrlOfAStoriesScreenStory())
    }

    @Test
    fun `GIVEN a home screen story URL WHEN checking if opened from the stories screen THEN return false`() {
        assertFalse("https://story.test?utm_fenix_story_source=home".isUrlOfAStoriesScreenStory())
    }

    @Test
    fun `GIVEN a plain URL WHEN checking if opened from the stories screen THEN return false`() {
        assertFalse("https://story.test".isUrlOfAStoriesScreenStory())
    }

    @Test
    fun `GIVEN a home screen story URL WHEN checking if opened from an internal application feature THEN return true`() {
        assertTrue("https://story.test?utm_fenix_story_source=home".isUrlOfInternallyOpenedStory())
    }

    @Test
    fun `GIVEN a stories screen story URL WHEN checking if opened from an internal application feature THEN return true`() {
        assertTrue("https://story.test?utm_fenix_story_source=stories".isUrlOfInternallyOpenedStory())
    }

    @Test
    fun `GIVEN a plain URL WHEN checking if opened from an internal application feature THEN return false`() {
        assertFalse("https://story.test".isUrlOfInternallyOpenedStory())
    }

    @Test
    fun `GIVEN an URL with a home UTM marker WHEN syncing the marker to a new URL THEN the marker is copied`() {
        val source = "https://source.com?utm_fenix_story_source=home"
        val target = "https://target.com"

        val result = target.syncInternallyOpenedStoryMarker(source)

        assertEquals("https://target.com?utm_fenix_story_source=home", result)
    }

    @Test
    fun `GIVEN an URL with a stories UTM marker WHEN syncing the marker to a new URL THEN the marker is copied`() {
        val source = "https://source.com?utm_fenix_story_source=stories"
        val target = "https://target.com"

        val result = target.syncInternallyOpenedStoryMarker(source)

        assertEquals("https://target.com?utm_fenix_story_source=stories", result)
    }

    @Test
    fun `GIVEN an URL without a UTM marker WHEN syncing the marker to a new URL THEN the target URL is unchanged`() {
        val source = "https://source.com?utm_source=test"
        val target = "https://target.com"

        val result = target.syncInternallyOpenedStoryMarker(source)

        assertEquals("https://target.com", result)
    }

    @Test
    fun `GIVEN a null source WHEN syncing the marker to a new URL THEN the target URL is unchanged`() {
        val target = "https://target.com"

        val result = target.syncInternallyOpenedStoryMarker(null)

        assertEquals("https://target.com", result)
    }

    @Test
    fun `GIVEN a non-restored tab with a home screen story URL WHEN checking hasUrlOfAHomeScreenStory THEN return true`() {
        val tab = createTab(url = "https://story.test".markAsOpenedFromHomeScreen())

        assertTrue(tab.hasUrlOfAHomeScreenStory())
    }

    @Test
    fun `GIVEN a restored tab with a home screen story URL WHEN checking hasUrlOfAHomeScreenStory THEN return false`() {
        val tab = createTab(url = "https://story.test".markAsOpenedFromHomeScreen(), restored = true)

        assertFalse(tab.hasUrlOfAHomeScreenStory())
    }

    @Test
    fun `GIVEN a non-restored tab with a stories screen story URL WHEN checking hasUrlOfAStoriesScreenStory THEN return true`() {
        val tab = createTab(url = "https://story.test".markAsOpenedFromStoriesScreen(), restored = false)

        assertTrue(tab.hasUrlOfAStoriesScreenStory())
    }

    @Test
    fun `GIVEN a restored tab with a stories screen story URL WHEN checking hasUrlOfAStoriesScreenStory THEN return false`() {
        val tab = createTab(url = "https://story.test".markAsOpenedFromStoriesScreen(), restored = true)

        assertFalse(tab.hasUrlOfAStoriesScreenStory())
    }

    @Test
    fun `GIVEN a non-restored tab with a home screen story URL WHEN checking hasUrlOfInternallyOpenedStory THEN return true`() {
        val tab = createTab(url = "https://story.test".markAsOpenedFromHomeScreen(), restored = false)

        assertTrue(tab.hasUrlOfInternallyOpenedStory())
    }

    @Test
    fun `GIVEN a non-restored tab with a plain URL WHEN checking hasUrlOfInternallyOpenedStory THEN return false`() {
        val tab = createTab(url = "https://story.test")

        assertFalse(tab.hasUrlOfInternallyOpenedStory())
    }
}
