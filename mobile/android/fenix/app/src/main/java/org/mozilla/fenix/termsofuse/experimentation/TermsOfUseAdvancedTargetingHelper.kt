/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.experimentation

import androidx.annotation.VisibleForTesting
import org.mozilla.fenix.termsofuse.experimentation.utils.TermsOfUseDataProvider
import org.mozilla.fenix.termsofuse.experimentation.utils.supportedSponsoredShortcutsLocales
import org.mozilla.fenix.termsofuse.experimentation.utils.supportedSponsoredStoriesLocales

/**
 * Helper class for Terms of Use advanced targeting options.
 *
 * @param termsOfUseDataProvider provides Terms of Use related data.
 * @param systemLanguageTag the language tag of the system locale.
 */
class TermsOfUseAdvancedTargetingHelper(
    private val termsOfUseDataProvider: TermsOfUseDataProvider,
    private val systemLanguageTag: String,
) {
    /**
     * Gets the users 'points' for Advanced Targeting.
     */
    fun getTouPoints() = privacySettingsPoints().plus(sponsoredContentPoints())

    @VisibleForTesting
    internal fun privacySettingsPoints() = with(termsOfUseDataProvider) {
        val enabledEtpStrictMode = useStrictTrackingProtection
        val enabledGpc = shouldEnableGlobalPrivacyControl
        val enabledIncreasedDohProtection = isIncreasedDohProtectionEnabled()
        val enabledHttpsOnlyMode = enabledHttpsOnlyMode()

        when {
            enabledEtpStrictMode ||
                    enabledGpc ||
                    enabledIncreasedDohProtection ||
                    enabledHttpsOnlyMode -> 1

            else -> 0
        }
    }

    @VisibleForTesting
    internal fun sponsoredContentPoints(
        hasEligibleUserOptedOutOfSponsoredShortcuts: Boolean = hasEligibleUserOptedOutOfSponsoredShortcuts(),
        hasEligibleUserOptedOutOfSponsoredStories: Boolean = hasEligibleUserOptedOutOfSponsoredStories(),
    ) =
        if (hasEligibleUserOptedOutOfSponsoredShortcuts || hasEligibleUserOptedOutOfSponsoredStories) {
            1
        } else {
            0
        }

    @VisibleForTesting
    internal fun hasEligibleUserOptedOutOfSponsoredShortcuts() = with(termsOfUseDataProvider) {
        regionSupportsSponsoredShortcuts() && (!showSponsoredShortcuts || !showShortcutsFeature)
    }

    @VisibleForTesting
    internal fun hasEligibleUserOptedOutOfSponsoredStories() = with(termsOfUseDataProvider) {
        regionSupportsSponsoredStories() && (!showSponsoredStories || !showStoriesFeature)
    }

    @VisibleForTesting
    internal fun regionSupportsSponsoredShortcuts() =
        supportedSponsoredShortcutsLocales.contains(systemLanguageTag)

    @VisibleForTesting
    internal fun regionSupportsSponsoredStories() =
        supportedSponsoredStoriesLocales.contains(systemLanguageTag)
}
