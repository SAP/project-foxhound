/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.trackingprotection

import android.os.Bundle
import android.view.View
import androidx.annotation.VisibleForTesting
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.navArgs
import org.mozilla.fenix.R
import org.mozilla.fenix.databinding.FragmentTrackingProtectionBlockingBinding
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.ext.showToolbar
import org.mozilla.fenix.utils.Settings

/**
 * A screen that displays a read-only list of the types of trackers and scripts
 * that are being blocked by a specific tracking protection mode (Standard, Strict, or Custom).
 *
 * This fragment receives the [TrackingProtectionMode] as a navigation argument and adjusts the
 * visibility of the tracker categories based on the selected mode and its current settings.
 * For example, in "Standard" mode, it shows a default set of blocked categories, while in
 * "Custom" mode, it reflects the user's specific choices.
 */
class TrackingProtectionBlockingFragment : Fragment(R.layout.fragment_tracking_protection_blocking) {

    private val args: TrackingProtectionBlockingFragmentArgs by navArgs()

    internal var settingsProvider: () -> Settings = { requireContext().settings() }
    private val settings: Settings by lazy { settingsProvider() }

    @VisibleForTesting
    internal lateinit var binding: FragmentTrackingProtectionBlockingBinding

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding = FragmentTrackingProtectionBlockingBinding.bind(view)

        setTotalCookieProtectionText()

        updateCategoryVisibility(args.protectionMode, settings)
    }

    /**
     * Sets the title and description for the "Cookies" category based on whether the
     * "Total Cookie Protection" feature is enabled.
     */
    @VisibleForTesting
    internal fun setTotalCookieProtectionText() {
        binding.categoryCookies.apply {
            trackingProtectionCategoryTitle.text = getText(R.string.etp_cookies_title_2)
            trackingProtectionCategoryItemDescription.text = getText(R.string.etp_cookies_description_2)
        }
    }

    /**
     * Updates the visibility of the tracker category views on the screen based on the selected
     * tracking protection mode and its current configuration.
     *
     * - In **Standard** mode, all categories are shown except for "Tracking content".
     * - In **Strict** mode, all categories are shown.
     * - In **Custom** mode, the visibility of each category is determined by user preferences.
     *
     * @param protectionMode The current tracking protection mode (`STANDARD`, `STRICT`, or `CUSTOM`).
     * @param settings The app's settings object, used to check individual blocking preferences for `CUSTOM` mode.
     */
    private fun updateCategoryVisibility(protectionMode: TrackingProtectionMode, settings: Settings) {
        when (protectionMode) {
            TrackingProtectionMode.STANDARD -> {
                binding.categoryTrackingContent.isVisible = false
            }

            TrackingProtectionMode.STRICT -> {
                // All categories are visible by default
            }

            TrackingProtectionMode.CUSTOM -> {
                binding.categoryFingerprinters.isVisible =
                    settings.blockFingerprintersInCustomTrackingProtection
                binding.categoryCryptominers.isVisible =
                    settings.blockCryptominersInCustomTrackingProtection
                binding.categoryCookies.isVisible =
                    settings.blockCookiesInCustomTrackingProtection
                binding.categoryTrackingContent.isVisible =
                    settings.blockTrackingContentInCustomTrackingProtection
                binding.categoryRedirectTrackers.isVisible =
                    settings.blockRedirectTrackersInCustomTrackingProtection
                binding.categorySuspectedFingerprinters.isVisible =
                    settings.blockSuspectedFingerprintersInCustomTrackingProtection
            }
        }
    }

    override fun onResume() {
        super.onResume()
        showToolbar(getString(args.protectionMode.titleRes))
    }
}
