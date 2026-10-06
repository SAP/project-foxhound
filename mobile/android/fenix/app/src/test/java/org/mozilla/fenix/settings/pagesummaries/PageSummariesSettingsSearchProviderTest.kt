/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.pagesummaries

import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.support.test.robolectric.testContext
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.settings.summarize.FakeSummarizationFeatureConfiguration
import kotlin.test.assertEquals

@RunWith(AndroidJUnit4::class)
class PageSummariesSettingsSearchProviderTest {

    private val fakeSummarizationFeatureConfiguration = FakeSummarizationFeatureConfiguration()

    private lateinit var provider: PageSummariesSettingsSearchProvider

    @Before
    fun setUp() {
        provider = PageSummariesSettingsSearchProvider(
            summarizationFeatureConfiguration = fakeSummarizationFeatureConfiguration,
        )
    }

    @Test
    fun `GIVEN the feature is not available, no search items are returned`() {
        // Given the feature is not available
        fakeSummarizationFeatureConfiguration.isFeatureAvailable = false

        // When we get search items
        val items = provider.getSearchItems(testContext)

        // Then assert the list is empty
        assertEquals(
            expected = emptyList(),
            actual = items,
            message = "Expected the search items to be empty",
        )
    }

    @Test
    fun `GIVEN the feature is available, search items are returned`() {
        // Given the feature is available
        fakeSummarizationFeatureConfiguration.isFeatureAvailable = true

        // When we get search items
        val items = provider.getSearchItems(testContext)
        val keys = items.map { it.preferenceKey }

        // Then assert the keys represent the items returned
        assertEquals(
            expected = listOf(
                "PAGE_SUMMARIES_FEATURE",
                "PAGE_SUMMARIES_GESTURES",
            ),
            actual = keys,
            message = "Expected the search items to match the page summaries settings",
        )
    }
}
