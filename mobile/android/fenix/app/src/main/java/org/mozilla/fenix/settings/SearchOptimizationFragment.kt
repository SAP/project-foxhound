/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings

import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.LinearLayout
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.preference.Preference
import androidx.preference.PreferenceFragmentCompat
import androidx.preference.SwitchPreferenceCompat
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import mozilla.components.compose.base.button.FilledButton
import org.mozilla.fenix.R
import org.mozilla.fenix.e2e.SystemInsetsPaddedFragment
import org.mozilla.fenix.ext.requireComponents
import org.mozilla.fenix.ext.showToolbar
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.utils.SecretSettingsPrefDefaults

/**
 * Settings related to the Search Optimization feature
 */
class SearchOptimizationFragment : PreferenceFragmentCompat(), SystemInsetsPaddedFragment {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): ViewGroup {
        val context = inflater.context
        val preferencesView = checkNotNull(super.onCreateView(inflater, container, savedInstanceState)) {
            "PreferenceFragmentCompat returned null from onCreateView"
        }

        return LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )

            // View for the list of preferences.
            addView(
                preferencesView,
                LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f),
            )

            // View for the bottom aligned reset button.
            addView(
                ComposeView(context).apply {
                    setViewCompositionStrategy(
                        ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed,
                    )
                    setContent {
                        FirefoxTheme {
                            FilledButton(
                                text = stringResource(R.string.preferences_debug_settings_reset_defaults),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 24.dp),
                                onClick = ::showResetConfirmationDialog,
                            )
                        }
                    }
                },
                LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                ),
            )
        }
    }

    private fun showResetConfirmationDialog() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.preferences_debug_settings_reset_defaults)
            .setPositiveButton(R.string.preferences_debug_settings_reset_defaults_confirm) { _, _ ->
                SecretSettingsPrefDefaults(requireComponents.settings).resetAll(preferenceScreen)
                reloadPreferenceFragment()
            }
            .setNegativeButton(R.string.preferences_debug_settings_reset_defaults_cancel) { dialog, _ ->
                dialog.cancel()
            }
            .show()
    }

    private fun reloadPreferenceFragment() {
        setPreferencesFromResource(R.xml.search_optimization_preferences, null)
        onCreatePreferences(null, null)
    }

    override fun onResume() {
        super.onResume()
        showToolbar(getString(R.string.preferences_debug_settings_search_optimization))
    }

    override fun onCreatePreferences(savedInstanceState: Bundle?, rootKey: String?) {
        setPreferencesFromResource(R.xml.search_optimization_preferences, rootKey)

        val settings = requireComponents.settings
        val isFeatureEnabled = settings.isSearchOptimizationEnabled
        val childPreferences = listOf(
            ChildPreferenceConfig(
                preference = R.string.pref_key_search_optimization_stocks,
                isChecked = settings.shouldShowSearchOptimizationStockCard,
                onEnable = { settings.shouldShowSearchOptimizationStockCard = true },
                onDisable = { settings.shouldShowSearchOptimizationStockCard = false },
            ),
            ChildPreferenceConfig(
                preference = R.string.pref_key_search_optimization_sports,
                isChecked = settings.shouldShowSearchOptimizationSportCard,
                onEnable = { settings.shouldShowSearchOptimizationSportCard = true },
                onDisable = { settings.shouldShowSearchOptimizationSportCard = false },
            ),
            ChildPreferenceConfig(
                preference = R.string.pref_key_search_optimization_flights,
                isChecked = settings.shouldShowSearchOptimizationFlightCard,
                onEnable = { settings.shouldShowSearchOptimizationFlightCard = true },
                onDisable = { settings.shouldShowSearchOptimizationFlightCard = false },
            ),
        )

        requirePreference<SwitchPreferenceCompat>(R.string.pref_key_search_optimization_feature).apply {
            isChecked = isFeatureEnabled
            onPreferenceChangeListener = Preference.OnPreferenceChangeListener { _, newValue ->
                (newValue as? Boolean)?.let { newOption ->
                    settings.isSearchOptimizationEnabled = newOption
                    childPreferences.forEachIndexed { index, config ->
                        updateChildPreference(
                            index = index,
                            preference = config.preference,
                            isFeatureEnabled = newOption,
                            onEnable = config.onEnable,
                            onDisable = config.onDisable,
                        )
                    }
                }
                true
            }
        }

        childPreferences.forEach { config ->
            setupChildPreference(config.preference, isFeatureEnabled, config.isChecked)
        }
    }

    private fun updateChildPreference(
        index: Int,
        preference: Int,
        isFeatureEnabled: Boolean,
        onEnable: () -> Unit,
        onDisable: () -> Unit,
    ) {
        requirePreference<SwitchPreferenceCompat>(preference).apply {
            isEnabled = isFeatureEnabled
            summary = when (isFeatureEnabled) {
                true -> null
                false -> getString(R.string.preferences_debug_settings_search_optimization_card_summary)
            }
            // The first option is selected by default when the feature is enabled
            if (index == 0 && isFeatureEnabled && !isChecked) {
                isChecked = true
                onEnable()
            }
            if (!isFeatureEnabled && isChecked) {
                isChecked = false
                onDisable()
            }
        }
    }

    private fun setupChildPreference(
        preference: Int,
        isFeatureEnabled: Boolean,
        isChecked: Boolean,
    ) {
        requirePreference<SwitchPreferenceCompat>(preference).apply {
            isEnabled = isFeatureEnabled
            this.isChecked = isChecked
            summary = when (isFeatureEnabled) {
                true -> null
                false -> getString(R.string.preferences_debug_settings_search_optimization_card_summary)
            }
            onPreferenceChangeListener = SharedPreferenceUpdater()
        }
    }

    private data class ChildPreferenceConfig(
        val preference: Int,
        val isChecked: Boolean,
        val onEnable: () -> Unit,
        val onDisable: () -> Unit,
    )
}
