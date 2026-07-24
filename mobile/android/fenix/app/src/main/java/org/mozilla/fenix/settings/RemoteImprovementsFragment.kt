/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings

import android.os.Bundle
import androidx.preference.Preference
import androidx.preference.PreferenceFragmentCompat
import androidx.preference.SwitchPreference
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.ext.showToolbar

/**
 * Lets the user customize remote improvements (rollouts) settings.
 */
class RemoteImprovementsFragment : PreferenceFragmentCompat() {

    override fun onCreatePreferences(savedInstanceState: Bundle?, rootKey: String?) {
        setPreferencesFromResource(R.xml.remote_improvements_preferences, rootKey)

        requirePreference<SwitchPreference>(R.string.pref_key_rollouts).apply {
            isChecked = context.settings().isRolloutsEnabled
            onPreferenceChangeListener = Preference.OnPreferenceChangeListener { _, newValue ->
                val enabled = newValue as? Boolean ?: false
                context.settings().isRolloutsEnabled = enabled
                context.components.nimbus.sdk.rolloutParticipation = enabled
                true
            }
        }

        requirePreference<Preference>(R.string.pref_key_rollouts_learn_more).apply {
            onPreferenceClickListener = Preference.OnPreferenceClickListener {
                SupportUtils.launchSandboxCustomTab(
                    context = requireContext(),
                    url = SupportUtils.getSumoURLForTopic(
                        context = requireContext(),
                        topic = SupportUtils.SumoTopic.REMOTE_IMPROVEMENTS,
                    ),
                )
                true
            }
        }
    }

    override fun onResume() {
        super.onResume()
        showToolbar(getString(R.string.preferences_remote_improvements))
    }
}
