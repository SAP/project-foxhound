/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.experimentation.utils

import mozilla.components.concept.engine.Engine
import mozilla.components.concept.engine.Engine.HttpsOnlyMode
import mozilla.components.support.test.whenever
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.Mockito.mock
import org.mozilla.fenix.utils.Settings

class DefaultTermsOfUseDataProviderTest {
    @Test
    fun `useStrictTrackingProtection returns the same as the referenced Settings value`() {
        val settings = mock<Settings>()

        whenever(settings.useStrictTrackingProtection).thenReturn(true)
        val defaultTermsOfUseDataProvider1 = DefaultTermsOfUseDataProvider(settings)
        assertTrue(defaultTermsOfUseDataProvider1.useStrictTrackingProtection)

        whenever(settings.useStrictTrackingProtection).thenReturn(false)
        val defaultTermsOfUseDataProvider2 = DefaultTermsOfUseDataProvider(settings)
        assertFalse(defaultTermsOfUseDataProvider2.useStrictTrackingProtection)
    }

    @Test
    fun `shouldEnableGlobalPrivacyControl returns the same as the referenced Settings value`() {
        val settings = mock<Settings>()

        whenever(settings.shouldEnableGlobalPrivacyControl).thenReturn(true)
        val defaultTermsOfUseDataProvider1 = DefaultTermsOfUseDataProvider(settings)
        assertTrue(defaultTermsOfUseDataProvider1.shouldEnableGlobalPrivacyControl)

        whenever(settings.shouldEnableGlobalPrivacyControl).thenReturn(false)
        val defaultTermsOfUseDataProvider2 = DefaultTermsOfUseDataProvider(settings)
        assertFalse(defaultTermsOfUseDataProvider2.shouldEnableGlobalPrivacyControl)
    }

    @Test
    fun `isIncreasedDohProtectionEnabled returns true if the referenced Settings value is increased or max`() {
        Engine.DohSettingsMode.entries.forEach {
            val settings = mock<Settings>()
            whenever(settings.getDohSettingsMode()).thenReturn(it)
            val defaultTermsOfUseDataProvider = DefaultTermsOfUseDataProvider(settings)

            val result = defaultTermsOfUseDataProvider.isIncreasedDohProtectionEnabled()
            when (it) {
                Engine.DohSettingsMode.INCREASED,
                Engine.DohSettingsMode.MAX,
                    -> assertTrue(result)

                Engine.DohSettingsMode.DEFAULT,
                Engine.DohSettingsMode.OFF,
                    -> assertFalse(result)
            }
        }
    }

    @Test
    fun `enabledHttpsOnlyMode returns true if the referenced Settings value is increased or max`() {
        HttpsOnlyMode.entries.forEach {
            val settings = mock<Settings>()
            whenever(settings.getHttpsOnlyMode()).thenReturn(it)
            val defaultTermsOfUseDataProvider = DefaultTermsOfUseDataProvider(settings)

            val result = defaultTermsOfUseDataProvider.enabledHttpsOnlyMode()
            when (it) {
                HttpsOnlyMode.ENABLED_PRIVATE_ONLY,
                HttpsOnlyMode.ENABLED,
                    -> assertTrue(result)

                HttpsOnlyMode.DISABLED -> assertFalse(result)
            }
        }
    }

    @Test
    fun `showSponsoredShortcuts returns the same as the referenced Settings value`() {
        val settings = mock<Settings>()

        whenever(settings.showContileFeature).thenReturn(true)
        val defaultTermsOfUseDataProvider1 = DefaultTermsOfUseDataProvider(settings)
        assertTrue(defaultTermsOfUseDataProvider1.showSponsoredShortcuts)

        whenever(settings.showContileFeature).thenReturn(false)
        val defaultTermsOfUseDataProvider2 = DefaultTermsOfUseDataProvider(settings)
        assertFalse(defaultTermsOfUseDataProvider2.showSponsoredShortcuts)
    }

    @Test
    fun `showShortcutsFeature returns the same as the referenced Settings value`() {
        val settings = mock<Settings>()

        whenever(settings.showTopSitesFeature).thenReturn(true)
        val defaultTermsOfUseDataProvider1 = DefaultTermsOfUseDataProvider(settings)
        assertTrue(defaultTermsOfUseDataProvider1.showShortcutsFeature)

        whenever(settings.showTopSitesFeature).thenReturn(false)
        val defaultTermsOfUseDataProvider2 = DefaultTermsOfUseDataProvider(settings)
        assertFalse(defaultTermsOfUseDataProvider2.showShortcutsFeature)
    }

    @Test
    fun `showSponsoredStories returns the same as the referenced Settings value`() {
        val settings = mock<Settings>()

        whenever(settings.showPocketSponsoredStories).thenReturn(true)
        val defaultTermsOfUseDataProvider1 = DefaultTermsOfUseDataProvider(settings)
        assertTrue(defaultTermsOfUseDataProvider1.showSponsoredStories)

        whenever(settings.showPocketSponsoredStories).thenReturn(false)
        val defaultTermsOfUseDataProvider2 = DefaultTermsOfUseDataProvider(settings)
        assertFalse(defaultTermsOfUseDataProvider2.showSponsoredStories)
    }

    @Test
    fun `showRecommendationsFeature returns the same as the referenced Settings value`() {
        val settings = mock<Settings>()

        whenever(settings.showPocketRecommendationsFeature).thenReturn(true)
        val defaultTermsOfUseDataProvider1 = DefaultTermsOfUseDataProvider(settings)
        assertTrue(defaultTermsOfUseDataProvider1.showStoriesFeature)

        whenever(settings.showPocketRecommendationsFeature).thenReturn(false)
        val defaultTermsOfUseDataProvider2 = DefaultTermsOfUseDataProvider(settings)
        assertFalse(defaultTermsOfUseDataProvider2.showStoriesFeature)
    }
}
