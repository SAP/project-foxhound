/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings

import android.content.DialogInterface
import android.os.Bundle
import android.text.SpannableStringBuilder
import androidx.annotation.VisibleForTesting
import androidx.appcompat.app.AlertDialog
import androidx.core.text.HtmlCompat
import androidx.navigation.findNavController
import androidx.navigation.fragment.navArgs
import androidx.preference.CheckBoxPreference
import androidx.preference.DropDownPreference
import androidx.preference.Preference
import androidx.preference.PreferenceFragmentCompat
import androidx.preference.SwitchPreference
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import org.mozilla.fenix.BrowserDirection
import org.mozilla.fenix.GleanMetrics.TrackingProtection
import org.mozilla.fenix.HomeActivity
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.ext.nav
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.ext.showToolbar
import org.mozilla.fenix.trackingprotection.TrackingProtectionMode
import org.mozilla.fenix.utils.view.addToRadioGroup

/**
 * Displays the toggle for tracking protection, options for tracking protection policy and a button
 * to open info about the tracking protection [org.mozilla.fenix.settings.TrackingProtectionFragment].
 */
class TrackingProtectionFragment : PreferenceFragmentCompat() {
    private val args by navArgs<TrackingProtectionFragmentArgs>()

    private val exceptionsClickListener = Preference.OnPreferenceClickListener {
        val directions =
            TrackingProtectionFragmentDirections.actionTrackingProtectionFragmentToExceptionsFragment()
        requireView().findNavController().navigate(directions)
        true
    }

    @VisibleForTesting
    internal lateinit var customCookies: CheckBoxPreference

    @VisibleForTesting
    internal lateinit var customCookiesSelect: DropDownPreference

    @VisibleForTesting
    internal lateinit var customTracking: CheckBoxPreference

    @VisibleForTesting
    internal lateinit var customTrackingSelect: DropDownPreference

    @VisibleForTesting
    internal lateinit var customCryptominers: CheckBoxPreference

    @VisibleForTesting
    internal lateinit var customFingerprinters: CheckBoxPreference

    @VisibleForTesting
    internal lateinit var customRedirectTrackers: CheckBoxPreference

    @VisibleForTesting
    internal lateinit var customSuspectedFingerprinters: CheckBoxPreference

    @VisibleForTesting
    internal lateinit var customSuspectedFingerprintersSelect: DropDownPreference

    @VisibleForTesting
    internal lateinit var customAllowListBaselineTrackingProtection: CheckBoxPreference

    @VisibleForTesting
    internal lateinit var customAllowListConvenienceTrackingProtection: CheckBoxPreference

    @VisibleForTesting
    internal lateinit var strictAllowListBaselineTrackingProtection: CheckBoxPreference

    @VisibleForTesting
    internal lateinit var strictAllowListConvenienceTrackingProtection: CheckBoxPreference

    @VisibleForTesting
    internal lateinit var strictAllowListTrackingProtectionSubheader: Preference

    @VisibleForTesting
    internal lateinit var customAllowListTrackingProtectionSubheader: Preference

    @VisibleForTesting
    lateinit var alertDialog: AlertDialog

    override fun onCreatePreferences(savedInstanceState: Bundle?, rootKey: String?) {
        setPreferencesFromResource(R.xml.tracking_protection_preferences, rootKey)
        val radioStrict = bindStrict()
        val radioStandard = bindTrackingProtectionRadio(TrackingProtectionMode.STANDARD)
        val radioCustom = bindCustom()
        addToRadioGroup(radioStrict, radioStandard, radioCustom)
        updateStrictOptionsVisibility()
        updateCustomOptionsVisibility()
    }

    override fun onResume() {
        super.onResume()
        showToolbar(getString(R.string.preference_enhanced_tracking_protection))

        // Tracking Protection Switch
        val preferenceTP =
            requirePreference<FenixSwitchPreference>(R.string.pref_key_tracking_protection)

        preferenceTP.isChecked = requireContext().settings().shouldUseTrackingProtection
        preferenceTP.setOnPreferenceChangeListener<Boolean> { preference, trackingProtectionOn ->
            preference.context.settings().shouldUseTrackingProtection =
                trackingProtectionOn
            with(preference.context.components) {
                val policy = core.trackingProtectionPolicyFactory.createTrackingProtectionPolicy()
                useCases.settingsUseCases.updateTrackingProtection(policy)
                useCases.sessionUseCases.reload()
            }
            true
        }

        val learnMorePreference = requirePreference<Preference>(R.string.pref_key_etp_learn_more)
        learnMorePreference.setOnPreferenceClickListener {
            (activity as HomeActivity).openToBrowserAndLoad(
                searchTermOrURL = SupportUtils.getGenericSumoURLForTopic
                    (SupportUtils.SumoTopic.TRACKING_PROTECTION),
                newTab = true,
                from = BrowserDirection.FromTrackingProtection,
            )
            true
        }
        learnMorePreference.summary = getString(
            R.string.preference_enhanced_tracking_protection_explanation_2,
            getString(R.string.app_name),
        )

        val preferenceExceptions =
            requirePreference<Preference>(R.string.pref_key_tracking_protection_exceptions)
        preferenceExceptions.onPreferenceClickListener = exceptionsClickListener

        requirePreference<SwitchPreference>(R.string.pref_key_privacy_enable_global_privacy_control).apply {
            onPreferenceChangeListener = object : SharedPreferenceUpdater() {
                override fun onPreferenceChange(preference: Preference, newValue: Any?): Boolean {
                    context.components.core.engine.settings.globalPrivacyControlEnabled = newValue as Boolean
                    context.components.useCases.sessionUseCases.reload.invoke()
                    return super.onPreferenceChange(preference, newValue)
                }
            }
        }

        args.preferenceToScrollTo?.let {
            scrollToPreference(it)
        }
    }

    private fun bindTrackingProtectionRadio(
        mode: TrackingProtectionMode,
    ): RadioButtonInfoPreference {
        val radio = requirePreference<RadioButtonInfoPreference>(mode.preferenceKey)
        radio.contentDescription = getString(mode.contentDescriptionRes)

        radio.onClickListener {
            updateStrictOptionsVisibility()
            updateCustomOptionsVisibility()
            updateTrackingProtectionPolicy()
            TrackingProtection.etpSettingChanged.record(TrackingProtection.EtpSettingChangedExtra(mode.name))
        }

        radio.onInfoClickListener {
            nav(
                R.id.trackingProtectionFragment,
                TrackingProtectionFragmentDirections
                    .actionTrackingProtectionFragmentToTrackingProtectionBlockingFragment(mode),
            )
        }

        return radio
    }

    private fun bindStrict(): RadioButtonInfoPreference {
        val radio = bindTrackingProtectionRadio(TrackingProtectionMode.STRICT)

        strictAllowListBaselineTrackingProtection =
            requirePreference(R.string.pref_key_tracking_protection_strict_allow_list_baseline)

        strictAllowListConvenienceTrackingProtection =
            requirePreference(R.string.pref_key_tracking_protection_strict_allow_list_convenience)

        strictAllowListTrackingProtectionSubheader =
            requirePreference(R.string.pref_key_tracking_protection_strict_allow_list_subheader)

        val learnMore =
            getString(R.string.preference_enhanced_tracking_protection_allow_list_learn_more)
        strictAllowListTrackingProtectionSubheader.summary = getLink(learnMore)
        strictAllowListTrackingProtectionSubheader.setOnPreferenceClickListener {
            openSumoArticle()
            true
        }

        strictAllowListBaselineTrackingProtection.onPreferenceChangeListener = object : SharedPreferenceUpdater() {
            override fun onPreferenceChange(preference: Preference, newValue: Any?): Boolean {
                // If user is unchecking the baseline protection, show dialog and prevent immediate update
                if (!(newValue as Boolean)) {
                    showDisableBaselineDialog(isStrictTrackingMode = true)
                    return false
                }
                // If user is checking the baseline protection, allow it and update policy
                return super.onPreferenceChange(preference, newValue).also {
                    updateTrackingProtectionPolicy()
                }
            }
        }

        strictAllowListConvenienceTrackingProtection.onPreferenceChangeListener = object : SharedPreferenceUpdater() {
            override fun onPreferenceChange(preference: Preference, newValue: Any?): Boolean {
                return super.onPreferenceChange(preference, newValue).also {
                    updateTrackingProtectionPolicy()
                }
            }
        }

        updateStrictOptionsVisibility()

        return radio
    }

    private fun bindCustom(): RadioButtonInfoPreference {
        val radio = bindTrackingProtectionRadio(TrackingProtectionMode.CUSTOM)

        customCookies =
            requirePreference(R.string.pref_key_tracking_protection_custom_cookies)

        customCookiesSelect =
            requirePreference(R.string.pref_key_tracking_protection_custom_cookies_select)

        customTracking =
            requirePreference(R.string.pref_key_tracking_protection_custom_tracking_content)

        customTrackingSelect =
            requirePreference(R.string.pref_key_tracking_protection_custom_tracking_content_select)

        customCryptominers =
            requirePreference(R.string.pref_key_tracking_protection_custom_cryptominers)

        customFingerprinters =
            requirePreference(R.string.pref_key_tracking_protection_custom_fingerprinters)

        customRedirectTrackers =
            requirePreference(R.string.pref_key_tracking_protection_redirect_trackers)

        customSuspectedFingerprinters =
            requirePreference(R.string.pref_key_tracking_protection_suspected_fingerprinters)

        customSuspectedFingerprintersSelect =
            requirePreference(R.string.pref_key_tracking_protection_suspected_fingerprinters_select)

        customAllowListBaselineTrackingProtection =
            requirePreference(R.string.pref_key_tracking_protection_custom_allow_list_baseline)

        customAllowListConvenienceTrackingProtection =
            requirePreference(R.string.pref_key_tracking_protection_custom_allow_list_convenience)

        customAllowListTrackingProtectionSubheader =
            requirePreference(R.string.pref_key_tracking_protection_custom_allow_list_subheader)

        val learnMore =
            getString(R.string.preference_enhanced_tracking_protection_allow_list_learn_more)
        customAllowListTrackingProtectionSubheader.summary = getLink(learnMore)
        customAllowListTrackingProtectionSubheader.setOnPreferenceClickListener {
            openSumoArticle()
            true
        }

        customCookies.onPreferenceChangeListener = object : SharedPreferenceUpdater() {
            override fun onPreferenceChange(preference: Preference, newValue: Any?): Boolean {
                customCookiesSelect.isVisible = !customCookies.isChecked
                return super.onPreferenceChange(preference, newValue).also {
                    updateTrackingProtectionPolicy()
                }
            }
        }

        customTracking.onPreferenceChangeListener = object : SharedPreferenceUpdater() {
            override fun onPreferenceChange(preference: Preference, newValue: Any?): Boolean {
                customTrackingSelect.isVisible = !customTracking.isChecked
                return super.onPreferenceChange(preference, newValue).also {
                    updateTrackingProtectionPolicy()
                }
            }
        }

        customCookiesSelect.onPreferenceChangeListener = object : StringSharedPreferenceUpdater() {
            override fun onPreferenceChange(preference: Preference, newValue: Any?): Boolean {
                return super.onPreferenceChange(preference, newValue).also {
                    updateTrackingProtectionPolicy()
                }
            }
        }

        customTrackingSelect.onPreferenceChangeListener = object : StringSharedPreferenceUpdater() {
            override fun onPreferenceChange(preference: Preference, newValue: Any?): Boolean {
                return super.onPreferenceChange(preference, newValue).also {
                    updateTrackingProtectionPolicy()
                }
            }
        }

        customCryptominers.onPreferenceChangeListener = object : SharedPreferenceUpdater() {
            override fun onPreferenceChange(preference: Preference, newValue: Any?): Boolean {
                return super.onPreferenceChange(preference, newValue).also {
                    updateTrackingProtectionPolicy()
                }
            }
        }

        customFingerprinters.onPreferenceChangeListener = object : SharedPreferenceUpdater() {
            override fun onPreferenceChange(preference: Preference, newValue: Any?): Boolean {
                return super.onPreferenceChange(preference, newValue).also {
                    updateTrackingProtectionPolicy()
                }
            }
        }

        customRedirectTrackers.onPreferenceChangeListener = object : SharedPreferenceUpdater() {
            override fun onPreferenceChange(preference: Preference, newValue: Any?): Boolean {
                return super.onPreferenceChange(preference, newValue).also {
                    updateTrackingProtectionPolicy()
                }
            }
        }

        customSuspectedFingerprinters.onPreferenceChangeListener = object : SharedPreferenceUpdater() {
            override fun onPreferenceChange(preference: Preference, newValue: Any?): Boolean {
                customSuspectedFingerprintersSelect.isVisible = !customSuspectedFingerprinters.isChecked
                return super.onPreferenceChange(preference, newValue).also {
                    updateTrackingProtectionPolicy()
                }
            }
        }

        customSuspectedFingerprintersSelect.onPreferenceChangeListener = object : StringSharedPreferenceUpdater() {
            override fun onPreferenceChange(preference: Preference, newValue: Any?): Boolean {
                return super.onPreferenceChange(preference, newValue).also {
                    updateTrackingProtectionPolicy()
                }
            }
        }

        customAllowListBaselineTrackingProtection.onPreferenceChangeListener = object : SharedPreferenceUpdater() {
            override fun onPreferenceChange(preference: Preference, newValue: Any?): Boolean {
                if (!(newValue as Boolean)) {
                    showDisableBaselineDialog(isStrictTrackingMode = false)
                    return false
                }
                return super.onPreferenceChange(preference, newValue).also {
                    updateTrackingProtectionPolicy()
                }
            }
        }

        customAllowListConvenienceTrackingProtection.onPreferenceChangeListener = object : SharedPreferenceUpdater() {
            override fun onPreferenceChange(preference: Preference, newValue: Any?): Boolean {
                return super.onPreferenceChange(preference, newValue).also {
                    updateTrackingProtectionPolicy()
                }
            }
        }

        updateCustomOptionsVisibility()

        return radio
    }

    @VisibleForTesting()
    internal fun updateTrackingProtectionPolicy() {
        context?.components?.let {
            val policy = it.core.trackingProtectionPolicyFactory
                .createTrackingProtectionPolicy()
            it.useCases.settingsUseCases.updateTrackingProtection.invoke(policy)
            updateFingerprintingProtection()
            it.useCases.sessionUseCases.reload.invoke()
        }
    }

    private fun updateStrictOptionsVisibility() {
        val isStrictSelected = requireContext().settings().useStrictTrackingProtection
        strictAllowListBaselineTrackingProtection.isVisible = isStrictSelected
        strictAllowListConvenienceTrackingProtection.isVisible = isStrictSelected
        strictAllowListTrackingProtectionSubheader.isVisible = isStrictSelected
    }

    private fun updateCustomOptionsVisibility() {
        val isCustomSelected = requireContext().settings().useCustomTrackingProtection
        customCookies.isVisible = isCustomSelected
        customCookiesSelect.isVisible = isCustomSelected && customCookies.isChecked
        customTracking.isVisible = isCustomSelected
        customTrackingSelect.isVisible = isCustomSelected && customTracking.isChecked
        customCryptominers.isVisible = isCustomSelected
        customFingerprinters.isVisible = isCustomSelected
        customRedirectTrackers.isVisible = isCustomSelected
        customSuspectedFingerprinters.isVisible = isCustomSelected
        customSuspectedFingerprintersSelect.isVisible = isCustomSelected && customSuspectedFingerprinters.isChecked
        customAllowListBaselineTrackingProtection.isVisible = isCustomSelected
        customAllowListConvenienceTrackingProtection.isVisible = isCustomSelected
        customAllowListTrackingProtectionSubheader.isVisible = isCustomSelected
    }

    private fun updateFingerprintingProtection() {
        val isStandardSelected = requireContext().settings().useStandardTrackingProtection
        val isStrictSelected = requireContext().settings().useStrictTrackingProtection
        val isCustomSelected = requireContext().settings().useCustomTrackingProtection

        context?.components?.let {
            if (isCustomSelected) {
                if (it.settings.blockSuspectedFingerprintersInCustomTrackingProtection) {
                    it.core.engine.settings.fingerprintingProtection = it.settings.blockSuspectedFingerprinters
                    it.core.engine.settings.fingerprintingProtectionPrivateBrowsing = it.settings
                        .blockSuspectedFingerprintersPrivateBrowsing
                } else {
                    it.core.engine.settings.fingerprintingProtection = false
                    it.core.engine.settings.fingerprintingProtectionPrivateBrowsing = false
                }
            } else if (isStrictSelected) {
                it.core.engine.settings.fingerprintingProtection = true
                it.core.engine.settings.fingerprintingProtectionPrivateBrowsing = true
            } else if (isStandardSelected) {
                it.core.engine.settings.fingerprintingProtection = false
                it.core.engine.settings.fingerprintingProtectionPrivateBrowsing = true
            }
        }
    }

    private fun getLink(text: String): SpannableStringBuilder {
        val rawTextWithLink = HtmlCompat.fromHtml(
            "<a href=\"\">$text</a>",
            HtmlCompat.FROM_HTML_MODE_COMPACT,
        )
        return SpannableStringBuilder(rawTextWithLink)
    }

    private fun openSumoArticle() {
        (activity as HomeActivity).openToBrowserAndLoad(
            searchTermOrURL = SupportUtils.getGenericSumoURLForTopic(
                SupportUtils.SumoTopic.TRACKING_PROTECTION,
            ),
            newTab = true,
            from = BrowserDirection.FromTrackingProtection,
        )
    }

    /**
     * Shows a confirmation dialog when the user attempts to disable baseline tracking exceptions.
     *
     * @param isStrictTrackingMode `true` if the user is in strict tracking protection mode,
     * `false` if in custom mode.
     */
    private fun showDisableBaselineDialog(isStrictTrackingMode: Boolean) {
        alertDialog = MaterialAlertDialogBuilder(requireContext()).apply {
            setTitle(R.string.preference_enhanced_tracking_protection_allow_list_dialog_title)
            setMessage(
                getString(
                R.string.preference_enhanced_tracking_protection_allow_list_dialog_message,
                getString(R.string.app_name),
            ),
            )
            // We set positive to "cancel" and negative to "confirm" because we want to encourage
            // users to keep the option on.
            setPositiveButton(R.string.preference_enhanced_tracking_protection_allow_list_dialog_cancel) { dialog, _ ->
                onDialogCancel(isStrictTrackingMode, dialog)
            }
            setNegativeButton(R.string.preference_enhanced_tracking_protection_allow_list_dialog_confirm) { dialog, _ ->
                onDialogConfirm(isStrictTrackingMode, dialog)
            }
            setCancelable(false)
        }.create()
        alertDialog.show()
    }

    /**
     * Handles the user's confirmation to disable baseline tracking exception.
     *
     * @param isStrictTrackingMode `true` if disabling strict baseline exceptions,
     * `false` if disabling custom baseline exceptions
     * @param dialog the dialog interface to dismiss after processing
     */
    @VisibleForTesting()
    internal fun onDialogConfirm(isStrictTrackingMode: Boolean, dialog: DialogInterface) {
        if (isStrictTrackingMode) {
            strictAllowListBaselineTrackingProtection.isChecked = false
            requireContext().settings().strictAllowListBaselineTrackingProtection = false
        } else {
            customAllowListBaselineTrackingProtection.isChecked = false
            requireContext().settings().customAllowListBaselineTrackingProtection = false
        }
        updateTrackingProtectionPolicy()
        dialog.dismiss()
    }

    /**
     * Handles the user's cancellation of the baseline exception disable dialog.
     *
     * @param isStrictTrackingMode `true` if re-enabling strict baseline exceptions,
     * `false` if re-enabling custom baseline exceptions
     * @param dialog the dialog interface to dismiss after processing
     */
    @VisibleForTesting()
    internal fun onDialogCancel(isStrictTrackingMode: Boolean, dialog: DialogInterface) {
        if (isStrictTrackingMode) {
            strictAllowListBaselineTrackingProtection.isChecked = true
            requireContext().settings().strictAllowListBaselineTrackingProtection = true
        } else {
            customAllowListBaselineTrackingProtection.isChecked = true
            requireContext().settings().customAllowListBaselineTrackingProtection = true
        }
        updateTrackingProtectionPolicy()
        dialog.dismiss()
    }
}
