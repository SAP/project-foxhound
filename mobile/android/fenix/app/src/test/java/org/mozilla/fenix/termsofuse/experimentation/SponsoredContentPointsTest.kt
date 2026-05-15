/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.experimentation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.termsofuse.experimentation.utils.FakeTermsOfUseDataProvider
import org.mozilla.fenix.termsofuse.experimentation.utils.supportedSponsoredShortcutsLocales
import org.mozilla.fenix.termsofuse.experimentation.utils.supportedSponsoredStoriesLocales

/**
 * Test for the [TermsOfUseAdvancedTargetingHelper.sponsoredContentPoints] function and dependencies.
 */
class SponsoredContentPointsTest {

    private val shortcutsLocale = supportedSponsoredShortcutsLocales.first()
    private val storiesLocale = supportedSponsoredStoriesLocales.first()

    @Test
    fun `WHEN eligible user opted out of shortcuts THEN sponsoredContentPoints returns 1`() {
        val helper =
            TermsOfUseAdvancedTargetingHelper(FakeTermsOfUseDataProvider(), shortcutsLocale)

        assertEquals(
            1,
            helper.sponsoredContentPoints(
                hasEligibleUserOptedOutOfSponsoredShortcuts = true,
                hasEligibleUserOptedOutOfSponsoredStories = false,
            ),
        )
    }

    @Test
    fun `WHEN eligible user opted out of stories THEN sponsoredContentPoints returns 1`() {
        val helper =
            TermsOfUseAdvancedTargetingHelper(FakeTermsOfUseDataProvider(), shortcutsLocale)

        assertEquals(
            1,
            helper.sponsoredContentPoints(
                hasEligibleUserOptedOutOfSponsoredShortcuts = false,
                hasEligibleUserOptedOutOfSponsoredStories = true,
            ),
        )
    }

    @Test
    fun `WHEN eligible user opted out of shortcuts and stories THEN sponsoredContentPoints returns 1`() {
        val helper =
            TermsOfUseAdvancedTargetingHelper(FakeTermsOfUseDataProvider(), shortcutsLocale)

        assertEquals(
            1,
            helper.sponsoredContentPoints(
                hasEligibleUserOptedOutOfSponsoredShortcuts = true,
                hasEligibleUserOptedOutOfSponsoredStories = true,
            ),
        )
    }

    @Test
    fun `WHEN eligible user has no opt outs THEN sponsoredContentPoints returns 0`() {
        val helper =
            TermsOfUseAdvancedTargetingHelper(FakeTermsOfUseDataProvider(), shortcutsLocale)

        assertEquals(
            0,
            helper.sponsoredContentPoints(
                hasEligibleUserOptedOutOfSponsoredShortcuts = false,
                hasEligibleUserOptedOutOfSponsoredStories = false,
            ),
        )
    }

    @Test
    fun `WHEN region not supported THEN hasEligibleUserOptedOutOfSponsoredShortcuts returns false`() {
        val unsupportedRegion = "te-ST"
        val helper =
            TermsOfUseAdvancedTargetingHelper(FakeTermsOfUseDataProvider(), unsupportedRegion)

        val result = helper.hasEligibleUserOptedOutOfSponsoredShortcuts()

        assertFalse(result)
    }

    @Test
    fun `GIVEN region supported WHEN show sponsored shortcuts opted out THEN hasEligibleUserOptedOutOfSponsoredShortcuts returns true`() {
        val dataProvider = FakeTermsOfUseDataProvider(showSponsoredShortcuts = false)
        val helper =
            TermsOfUseAdvancedTargetingHelper(dataProvider, shortcutsLocale)

        val result = helper.hasEligibleUserOptedOutOfSponsoredShortcuts()

        assertTrue(result)
    }

    @Test
    fun `GIVEN region supported WHEN shortcuts feature opted out THEN hasEligibleUserOptedOutOfSponsoredShortcuts returns true`() {
        val dataProvider = FakeTermsOfUseDataProvider(showShortcutsFeature = false)
        val helper =
            TermsOfUseAdvancedTargetingHelper(dataProvider, shortcutsLocale)

        val result = helper.hasEligibleUserOptedOutOfSponsoredShortcuts()

        assertTrue(result)
    }

    @Test
    fun `GIVEN region supported WHEN sponsored shortcuts and shortcuts feature opted out THEN hasEligibleUserOptedOutOfSponsoredShortcuts returns true`() {
        val dataProvider =
            FakeTermsOfUseDataProvider(showSponsoredShortcuts = false, showShortcutsFeature = false)
        val helper = TermsOfUseAdvancedTargetingHelper(dataProvider, shortcutsLocale)

        val result = helper.hasEligibleUserOptedOutOfSponsoredShortcuts()

        assertTrue(result)
    }

    @Test
    fun `GIVEN region supported WHEN no opt outs THEN hasEligibleUserOptedOutOfSponsoredShortcuts returns false`() {
        val dataProvider = FakeTermsOfUseDataProvider()
        val helper = TermsOfUseAdvancedTargetingHelper(dataProvider, shortcutsLocale)

        val result = helper.hasEligibleUserOptedOutOfSponsoredShortcuts()

        assertFalse(result)
    }

    @Test
    fun `WHEN region not supported THEN hasEligibleUserOptedOutOfSponsoredStories returns false`() {
        val unsupportedRegion = "te-ST"
        val helper =
            TermsOfUseAdvancedTargetingHelper(FakeTermsOfUseDataProvider(), unsupportedRegion)

        val result = helper.hasEligibleUserOptedOutOfSponsoredStories()

        assertFalse(result)
    }

    @Test
    fun `GIVEN region supported WHEN show sponsored stories opted out THEN hasEligibleUserOptedOutOfSponsoredStories returns true`() {
        val dataProvider = FakeTermsOfUseDataProvider(showSponsoredStories = false)
        val helper =
            TermsOfUseAdvancedTargetingHelper(dataProvider, storiesLocale)

        val result = helper.hasEligibleUserOptedOutOfSponsoredStories()

        assertTrue(result)
    }

    @Test
    fun `GIVEN region supported WHEN stories feature opted out THEN hasEligibleUserOptedOutOfSponsoredStories returns true`() {
        val dataProvider = FakeTermsOfUseDataProvider(showStoriesFeature = false)
        val helper =
            TermsOfUseAdvancedTargetingHelper(dataProvider, storiesLocale)

        val result = helper.hasEligibleUserOptedOutOfSponsoredStories()

        assertTrue(result)
    }

    @Test
    fun `GIVEN region supported WHEN sponsored stories and stories feature opted out THEN hasEligibleUserOptedOutOfSponsoredStories returns true`() {
        val dataProvider =
            FakeTermsOfUseDataProvider(showSponsoredStories = false, showStoriesFeature = false)
        val helper = TermsOfUseAdvancedTargetingHelper(dataProvider, storiesLocale)

        val result = helper.hasEligibleUserOptedOutOfSponsoredStories()

        assertTrue(result)
    }

    @Test
    fun `GIVEN region supported WHEN no opt outs THEN hasEligibleUserOptedOutOfSponsoredStories returns false`() {
        val helper = TermsOfUseAdvancedTargetingHelper(FakeTermsOfUseDataProvider(), storiesLocale)

        val result = helper.hasEligibleUserOptedOutOfSponsoredStories()

        assertFalse(result)
    }

    @Test
    fun `WHEN region is supported THEN regionSupportsSponsoredShortcuts returns true`() {
        supportedSponsoredShortcutsLocales.forEach {
            val helper = TermsOfUseAdvancedTargetingHelper(FakeTermsOfUseDataProvider(), it)

            assertTrue(helper.regionSupportsSponsoredShortcuts())
        }
    }

    @Test
    fun `WHEN region is supported THEN regionSupportsSponsoredStories returns true`() {
        supportedSponsoredStoriesLocales.forEach {
            val helper = TermsOfUseAdvancedTargetingHelper(FakeTermsOfUseDataProvider(), it)

            assertTrue(helper.regionSupportsSponsoredStories())
        }
    }
}
