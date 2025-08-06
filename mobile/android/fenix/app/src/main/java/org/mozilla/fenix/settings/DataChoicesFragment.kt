/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import androidx.annotation.VisibleForTesting
import androidx.navigation.findNavController
import androidx.preference.Preference
import androidx.preference.PreferenceFragmentCompat
import androidx.preference.SwitchPreference
import org.mozilla.fenix.Config
import org.mozilla.fenix.R
import org.mozilla.fenix.components.metrics.MetricServiceType
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.ext.getPreferenceKey
import org.mozilla.fenix.ext.nav
import org.mozilla.fenix.ext.requireComponents
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.ext.showToolbar
import kotlin.system.exitProcess

/**
 * Lets the user toggle telemetry on/off.
 */
class DataChoicesFragment : PreferenceFragmentCompat() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val context = requireContext()
        preferenceManager.sharedPreferences?.registerOnSharedPreferenceChangeListener(this) { _, key ->
            if (key == getPreferenceKey(R.string.pref_key_telemetry)) {
                if (context.settings().isTelemetryEnabled) {
                    context.components.analytics.metrics.start(MetricServiceType.Data)
                } else {
                    context.components.analytics.metrics.stop(MetricServiceType.Data)
                    if (context.settings().isExperimentationEnabled) {
                        context.settings().isExperimentationEnabled = false
                        requireComponents.nimbus.sdk.globalUserParticipation = false
                        if (SHOULD_EXIT_APP_AFTER_TURNING_OFF_STUDIES) {
                            Toast.makeText(
                                context,
                                getString(R.string.quit_application),
                                Toast.LENGTH_LONG,
                            ).show()
                            Handler(Looper.getMainLooper()).postDelayed(
                                { quitTheApp() },
                                EXIT_DELAY,
                            )
                        }
                    }
                }
                updateStudiesSection()
                // Reset experiment identifiers on both opt-in and opt-out; it's likely
                // that in future we will need to pass in the new telemetry client_id
                // to this method when the user opts back in.
                context.components.nimbus.sdk.resetTelemetryIdentifiers()
            } else if (key == getPreferenceKey(R.string.pref_key_marketing_telemetry)) {
                if (context.settings().isMarketingTelemetryEnabled) {
                    context.components.analytics.metrics.start(MetricServiceType.Marketing)
                } else {
                    context.components.analytics.metrics.stop(MetricServiceType.Marketing)
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        showToolbar(getString(R.string.preferences_data_collection))
        updateStudiesSection()
    }

    override fun onCreatePreferences(savedInstanceState: Bundle?, rootKey: String?) {
        setPreferencesFromResource(R.xml.data_choices_preferences, rootKey)

        requirePreference<SwitchPreference>(R.string.pref_key_telemetry).apply {
            isChecked = context.settings().isTelemetryEnabled

            val appName = context.getString(R.string.app_name)
            summary = context.getString(R.string.preferences_usage_data_description, appName)

            onPreferenceChangeListener = SharedPreferenceUpdater()
        }

        requirePreference<SwitchPreference>(R.string.pref_key_marketing_telemetry).apply {
            isChecked = (context.settings().isMarketingTelemetryEnabled) && (!Config.channel.isMozillaOnline)
            onPreferenceChangeListener = SharedPreferenceUpdater()
            isVisible = false
        }

        requirePreference<SwitchPreference>(R.string.pref_key_crash_reporting_always_report).apply {
            isChecked = context.settings().crashReportAlwaysSend
            onPreferenceChangeListener = SharedPreferenceUpdater()
        }
    }

    private fun updateStudiesSection() {
        val studiesPreference = requirePreference<Preference>(R.string.pref_key_studies_section)
        val settings = requireContext().settings()
        val stringId = if (settings.isExperimentationEnabled) {
            R.string.studies_on
        } else {
            R.string.studies_off
        }
        studiesPreference.isEnabled = settings.isTelemetryEnabled
        studiesPreference.summary = getString(stringId)

        studiesPreference.setOnPreferenceClickListener {
            val action = DataChoicesFragmentDirections.actionDataChoicesFragmentToStudiesFragment()
            view?.findNavController()?.nav(R.id.dataChoicesFragment, action)
            true
        }
    }

    @VisibleForTesting
    internal fun quitTheApp() {
        exitProcess(0)
    }

    companion object {
        private const val EXIT_DELAY = 2000L

        @VisibleForTesting
        var SHOULD_EXIT_APP_AFTER_TURNING_OFF_STUDIES = true
    }
}
