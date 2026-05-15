/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.trackingprotection

import androidx.core.view.isVisible
import androidx.fragment.app.FragmentActivity
import io.mockk.every
import io.mockk.mockk
import junit.framework.TestCase.assertFalse
import junit.framework.TestCase.assertTrue
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.mozilla.fenix.trackingprotection.TrackingProtectionMode.CUSTOM
import org.mozilla.fenix.trackingprotection.TrackingProtectionMode.STANDARD
import org.mozilla.fenix.trackingprotection.TrackingProtectionMode.STRICT
import org.mozilla.fenix.utils.Settings
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class TrackingProtectionBlockingFragmentTest {

    @Test
    fun `GIVEN total cookie protection is enabled WHEN showing details THEN show the updated cookie protection text`() {
        val expectedTitle = testContext.getString(R.string.etp_cookies_title_2)
        val expectedDescription = testContext.getString(R.string.etp_cookies_description_2)
        val mockSettings = mockk<Settings>(relaxed = true)
        val fragment = createFragment(mockSettings)

        val cookiesCategory = fragment.binding.categoryCookies
        assertEquals(expectedTitle, cookiesCategory.trackingProtectionCategoryTitle.text.toString())
        assertEquals(expectedDescription, cookiesCategory.trackingProtectionCategoryItemDescription.text.toString())
    }

    @Test
    fun `GIVEN standard mode WHEN creating fragment THEN only tracking content category is hidden`() {
        val mockSettings = mockk<Settings>(relaxed = true)
        val fragment = createFragment(mockSettings, STANDARD)

        with(fragment.binding) {
            assertTrue(categoryCookies.isVisible)
            assertTrue(categoryCryptominers.isVisible)
            assertTrue(categoryFingerprinters.isVisible)
            assertTrue(categoryRedirectTrackers.isVisible)
            assertTrue(categorySuspectedFingerprinters.isVisible)
            assertFalse(categoryTrackingContent.isVisible)
        }
    }

    @Test
    fun `GIVEN strict mode WHEN creating fragment THEN all categories are visible`() {
        val mockSettings = mockk<Settings>(relaxed = true)
        val fragment = createFragment(mockSettings, STRICT)

        with(fragment.binding) {
            assertTrue(categoryCookies.isVisible)
            assertTrue(categoryTrackingContent.isVisible)
            assertTrue(categoryCryptominers.isVisible)
            assertTrue(categoryFingerprinters.isVisible)
            assertTrue(categoryRedirectTrackers.isVisible)
            assertTrue(categorySuspectedFingerprinters.isVisible)
        }
    }

    @Test
    fun `GIVEN custom mode WHEN all blocking settings are true THEN all categories are visible`() {
        val mockSettings = mockk<Settings> {
            every { blockFingerprintersInCustomTrackingProtection } returns true
            every { blockCryptominersInCustomTrackingProtection } returns true
            every { blockCookiesInCustomTrackingProtection } returns true
            every { blockTrackingContentInCustomTrackingProtection } returns true
            every { blockRedirectTrackersInCustomTrackingProtection } returns true
            every { blockSuspectedFingerprintersInCustomTrackingProtection } returns true
        }
        val fragment = createFragment(mockSettings, CUSTOM)

        with(fragment.binding) {
            assertTrue(categoryCookies.isVisible)
            assertTrue(categoryTrackingContent.isVisible)
            assertTrue(categoryCryptominers.isVisible)
            assertTrue(categoryFingerprinters.isVisible)
            assertTrue(categoryRedirectTrackers.isVisible)
            assertTrue(categorySuspectedFingerprinters.isVisible)
        }
    }

    @Test
    fun `GIVEN custom mode WHEN all blocking settings are false THEN all categories are hidden`() {
        val mockSettings = mockk<Settings> {
            every { blockFingerprintersInCustomTrackingProtection } returns false
            every { blockCryptominersInCustomTrackingProtection } returns false
            every { blockCookiesInCustomTrackingProtection } returns false
            every { blockTrackingContentInCustomTrackingProtection } returns false
            every { blockRedirectTrackersInCustomTrackingProtection } returns false
            every { blockSuspectedFingerprintersInCustomTrackingProtection } returns false
        }
        val fragment = createFragment(mockSettings, CUSTOM)

        with(fragment.binding) {
            assertFalse(categoryCookies.isVisible)
            assertFalse(categoryTrackingContent.isVisible)
            assertFalse(categoryCryptominers.isVisible)
            assertFalse(categoryFingerprinters.isVisible)
            assertFalse(categoryRedirectTrackers.isVisible)
            assertFalse(categorySuspectedFingerprinters.isVisible)
        }
    }

    private fun createFragment(
        mockedSettings: Settings,
        protectionMode: TrackingProtectionMode = CUSTOM,
    ): TrackingProtectionBlockingFragment {
        // Create and attach the fragment ourself instead of using "createAddedTestFragment"
        // to prevent having "onResume -> showToolbar" called.

        val activity = Robolectric.buildActivity(FragmentActivity::class.java)
            .create()
            .start()
            .get()

        val fragment = TrackingProtectionBlockingFragment().apply {
            arguments = TrackingProtectionBlockingFragmentArgs(
                protectionMode = protectionMode,
            ).toBundle()
            // Set the provider to return our mock settings for this test instance
            settingsProvider = { mockedSettings }
        }

        activity.supportFragmentManager.beginTransaction()
            .add(fragment, "test")
            .commitNow()

        return fragment
    }
}
