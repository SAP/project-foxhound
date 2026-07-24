/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.experimentation

import org.junit.Assert.assertEquals
import org.junit.Test
import org.mozilla.fenix.termsofuse.experimentation.utils.FakeTermsOfUseDataProvider
import org.mozilla.fenix.termsofuse.experimentation.utils.supportedSponsoredShortcutsLocales

class TermsOfUseAdvancedTargetingHelperTest {

    private val shortcutsLocale = supportedSponsoredShortcutsLocales.first()

    @Test
    fun `WHEN privacySettingsPoints and sponsoredContentPoints each return 1 THEN getTouPoints returns 2`() {
        val dataProvider = FakeTermsOfUseDataProvider(
            useStrictTrackingProtection = true,
            showSponsoredShortcuts = false,
        )

        val result = TermsOfUseAdvancedTargetingHelper(dataProvider, shortcutsLocale).getTouPoints()

        assertEquals(2, result)
    }

    @Test
    fun `WHEN only privacySettingsPoints returns 1 THEN getTouPoints returns 1`() {
        val dataProvider = FakeTermsOfUseDataProvider(
            useStrictTrackingProtection = true,
        )

        val result = TermsOfUseAdvancedTargetingHelper(dataProvider, shortcutsLocale).getTouPoints()

        assertEquals(1, result)
    }

    @Test
    fun `WHEN only sponsoredContentPoints returns 1 THEN getTouPoints returns 1`() {
        val dataProvider = FakeTermsOfUseDataProvider(
            showSponsoredShortcuts = false,
        )

        val result = TermsOfUseAdvancedTargetingHelper(dataProvider, shortcutsLocale).getTouPoints()

        assertEquals(1, result)
    }

    @Test
    fun `WHEN privacySettingsPoints and sponsoredContentPoints each return 0 THEN getTouPoints returns 0`() {
        val dataProvider = FakeTermsOfUseDataProvider()

        val result = TermsOfUseAdvancedTargetingHelper(dataProvider, shortcutsLocale).getTouPoints()

        assertEquals(0, result)
    }
}
