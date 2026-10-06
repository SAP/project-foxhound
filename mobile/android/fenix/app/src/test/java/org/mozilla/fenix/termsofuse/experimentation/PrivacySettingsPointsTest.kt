/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.experimentation

import org.junit.Assert.assertEquals
import org.junit.Test
import org.mozilla.fenix.termsofuse.experimentation.utils.FakeTermsOfUseDataProvider

/**
 * Test for the [TermsOfUseAdvancedTargetingHelper.privacySettingsPoints] function.
 */
class PrivacySettingsPointsTest {

    @Test
    fun `WHEN strict tracking protection is enabled THEN privacySettingsPoints returns 1`() {
        val dataProvider = FakeTermsOfUseDataProvider(useStrictTrackingProtection = true)
        val helper = TermsOfUseAdvancedTargetingHelper(dataProvider, "UNUSED")

        val result = helper.privacySettingsPoints()

        assertEquals(1, result)
    }

    @Test
    fun `WHEN global privacy control is enabled THEN privacySettingsPoints returns 1`() {
        val dataProvider = FakeTermsOfUseDataProvider(shouldEnableGlobalPrivacyControl = true)
        val helper = TermsOfUseAdvancedTargetingHelper(dataProvider, "UNUSED")

        val result = helper.privacySettingsPoints()

        assertEquals(1, result)
    }

    @Test
    fun `WHEN increased DoH protection is enabled THEN privacySettingsPoints returns 1`() {
        val dataProvider = FakeTermsOfUseDataProvider(isIncreasedDohProtectionEnabled = true)
        val helper = TermsOfUseAdvancedTargetingHelper(dataProvider, "UNUSED")

        val result = helper.privacySettingsPoints()

        assertEquals(1, result)
    }

    @Test
    fun `WHEN HTTPS Only mode is enabled THEN privacySettingsPoints returns 1`() {
        val dataProvider = FakeTermsOfUseDataProvider(enabledHttpsOnlyMode = true)
        val helper = TermsOfUseAdvancedTargetingHelper(dataProvider, "UNUSED")

        val result = helper.privacySettingsPoints()

        assertEquals(1, result)
    }

    @Test
    fun `WHEN some privacy settings are enabled THEN privacySettingsPoints returns 1`() {
        val dataProvider = FakeTermsOfUseDataProvider(
            isIncreasedDohProtectionEnabled = true,
            enabledHttpsOnlyMode = true,
        )
        val helper = TermsOfUseAdvancedTargetingHelper(dataProvider, "UNUSED")

        val result = helper.privacySettingsPoints()

        assertEquals(1, result)
    }

    @Test
    fun `WHEN all privacy settings are enabled THEN privacySettingsPoints returns 1`() {
        val dataProvider = FakeTermsOfUseDataProvider(
            useStrictTrackingProtection = true,
            shouldEnableGlobalPrivacyControl = true,
            isIncreasedDohProtectionEnabled = true,
            enabledHttpsOnlyMode = true,
        )
        val helper = TermsOfUseAdvancedTargetingHelper(dataProvider, "UNUSED")

        val result = helper.privacySettingsPoints()

        assertEquals(1, result)
    }

    @Test
    fun `WHEN no privacy settings are enabled THEN privacySettingsPoints returns 0`() {
        val dataProvider = FakeTermsOfUseDataProvider(
            useStrictTrackingProtection = false,
            shouldEnableGlobalPrivacyControl = false,
            isIncreasedDohProtectionEnabled = false,
            enabledHttpsOnlyMode = false,
        )
        val helper = TermsOfUseAdvancedTargetingHelper(dataProvider, "UNUSED")

        val result = helper.privacySettingsPoints()

        assertEquals(0, result)
    }
}
