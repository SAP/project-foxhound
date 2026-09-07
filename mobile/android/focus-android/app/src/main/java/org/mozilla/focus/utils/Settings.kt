/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.utils

import android.content.Context
import android.content.SharedPreferences
import android.content.res.Configuration
import androidx.annotation.VisibleForTesting
import androidx.core.content.edit
import androidx.preference.PreferenceManager
import mozilla.components.concept.engine.Engine
import mozilla.components.concept.engine.mediaquery.PreferredColorScheme
import mozilla.components.support.ktx.android.content.PreferencesHolder
import mozilla.components.support.ktx.android.content.booleanPreference
import org.mozilla.focus.R
import org.mozilla.focus.components.EngineProvider.NO_VALUE
import org.mozilla.focus.cookiebanner.CookieBannerOption
import org.mozilla.focus.nimbus.FocusNimbus
import org.mozilla.focus.searchsuggestions.SearchSuggestionsPreferences
import org.mozilla.focus.telemetry.GleanMetricsService

/**
 * A simple wrapper for SharedPreferences that makes reading preference a little bit easier.
 * This class is designed to have a lot of (simple) functions
 */
@Suppress("TooManyFunctions", "LargeClass")
class Settings(
    private val context: Context,
) : PreferencesHolder {

    @Deprecated("This is no longer used. Read search engines from BrowserStore instead")
    val defaultSearchEngineName: String
        get() = preferences.getString(getPreferenceKey(R.string.pref_key_search_engine), "")!!

    /**
     * Determines whether the user has chosen to open supported links in external applications.
     * Defaults to false.
     */
    val openLinksInExternalApp: Boolean
        get() = preferences.getBoolean(
            getPreferenceKey(R.string.pref_key_open_links_in_external_app),
            false,
        )

    /**
     * Determines whether the call-for-reinforcement (CFR) message for the cookie banner
     * should be displayed. Defaults to true.
     */
    var shouldShowCookieBannerCfr: Boolean
        get() = preferences.getBoolean(
            getPreferenceKey(R.string.pref_cfr_visibility_for_cookie_banner),
            true,
        )
        set(value) {
            preferences.edit {
                putBoolean(
                    getPreferenceKey(R.string.pref_cfr_visibility_for_cookie_banner),
                    value,
                )
            }
        }

    /**
     * Determines whether the call-for-reinforcement (CFR) message for tracking protection
     * should be displayed. Defaults to true.
     */
    var shouldShowCfrForTrackingProtection: Boolean
        get() = preferences.getBoolean(getPreferenceKey(R.string.pref_cfr_visibility_for_tracking_protection), true)
        set(value) {
            preferences.edit {
                putBoolean(getPreferenceKey(R.string.pref_cfr_visibility_for_tracking_protection), value)
            }
        }

    /**
     * Determines whether the call-for-reinforcement (CFR) message for "start browsing"
     * should be displayed. Defaults to true.
     */
    var shouldShowStartBrowsingCfr: Boolean
        get() = preferences.getBoolean(getPreferenceKey(R.string.pref_cfr_visibility_for_start_browsing), true)
        set(value) {
            preferences.edit {
                putBoolean(getPreferenceKey(R.string.pref_cfr_visibility_for_start_browsing), value)
            }
        }

    /**
     * Determines if this is the first time the user is running the app.
     * Defaults to true.
     */
    var isFirstRun: Boolean
        get() = preferences.getBoolean(getPreferenceKey(R.string.firstrun_shown), true)
        set(value) {
            preferences.edit {
                putBoolean(getPreferenceKey(R.string.firstrun_shown), value)
            }
        }

    /**
     * Determines whether the tooltip for the privacy and security settings should be shown.
     * Defaults to true.
     */
    var shouldShowPrivacySecuritySettingsToolTip: Boolean
        get() = preferences.getBoolean(getPreferenceKey(R.string.pref_tool_tip_privacy_security_settings), true)
        set(value) {
            preferences.edit {
                putBoolean(getPreferenceKey(R.string.pref_tool_tip_privacy_security_settings), value)
            }
        }

    /**
     * Indicates whether or not to use remote server search configuration.
     * The default value is controlled by a Nimbus feature flag.
     */
    var useRemoteSearchConfiguration by booleanPreference(
        key = getPreferenceKey(R.string.pref_key_use_remote_search_configuration),
        default = FocusNimbus.features.remoteSearchConfiguration.value().enabled,
    )

    /**
     * Checks if remote debugging via USB is enabled.
     * Defaults to false.
     */
    fun shouldEnableRemoteDebugging(): Boolean =
        preferences.getBoolean(
            getPreferenceKey(R.string.pref_key_remote_debugging),
            false,
        )

    /**
     * Checks if search suggestions are enabled.
     * Defaults to false.
     */
    fun shouldShowSearchSuggestions(): Boolean =
        preferences.getBoolean(
            getPreferenceKey(R.string.pref_key_show_search_suggestions),
            false,
        )

    /**
     * Checks if web fonts should be blocked for performance.
     * Defaults to false.
     */
    fun shouldBlockWebFonts(): Boolean =
        preferences.getBoolean(
            getPreferenceKey(R.string.pref_key_performance_block_webfonts),
            false,
        )

    /**
     * Checks if JavaScript should be blocked.
     * Defaults to false.
     */
    fun shouldBlockJavaScript(): Boolean =
        preferences.getBoolean(
            getPreferenceKey(R.string.pref_key_performance_block_javascript),
            false,
        )

    /**
     * Gets or sets the raw string value for the cookie blocking preference.
     * It is recommended to use a typed version of this where possible.
     */
    var shouldBlockCookiesValue: String
        get() = preferences.getString(
            getPreferenceKey(R.string.pref_key_performance_enable_cookies),
            NO_VALUE,
        ) ?: NO_VALUE
        set(value) {
            preferences.edit {
                putString(
                    getPreferenceKey(R.string.pref_key_performance_enable_cookies),
                    value,
                )
            }
        }

    /**
     * Checks if the app should be secured using biometric authentication (fingerprint, face, etc.).
     * Defaults to false.
     */
    fun shouldUseBiometrics(): Boolean =
        preferences.getBoolean(getPreferenceKey(R.string.pref_key_biometric), false)

    /**
     * Checks if the app should be in "secure mode", preventing screenshots and hiding content
     * in the recent apps switcher. Defaults to false.
     */
    fun shouldUseSecureMode(): Boolean =
        preferences.getBoolean(getPreferenceKey(R.string.pref_key_secure), false)

    /**
     * Persists the name of the default search engine.
     */
    fun setDefaultSearchEngineByName(name: String) {
        preferences.edit {
            putString(getPreferenceKey(R.string.pref_key_search_engine), name)
        }
    }

    /**
     * Checks if URL autocomplete should use the shipped (pre-installed) domain list.
     * Defaults to true.
     */
    fun shouldAutocompleteFromShippedDomainList() =
        preferences.getBoolean(
            getPreferenceKey(R.string.pref_key_autocomplete_preinstalled),
            true,
        )

    /**
     * Checks if URL autocomplete should use the custom (user-added) domain list.
     * Defaults to true.
     */
    fun shouldAutocompleteFromCustomDomainList() =
        preferences.getBoolean(
            getPreferenceKey(R.string.pref_key_autocomplete_custom),
            true,
        )

    /**
     * Checks if ad trackers should be blocked.
     * Defaults to true.
     */
    fun shouldBlockAdTrackers() =
        preferences.getBoolean(
            getPreferenceKey(R.string.pref_key_privacy_block_ads),
            true,
        )

    /**
     * Determines whether safe browsing should be enabled based on the user's preference.
     * Defaults to true.
     */
    fun shouldUseSafeBrowsing() =
        preferences.getBoolean(
            getPreferenceKey(R.string.pref_key_safe_browsing),
            true,
        )

    /**
     * Checks if analytic trackers should be blocked.
     * Defaults to true.
     */
    fun shouldBlockAnalyticTrackers() =
        preferences.getBoolean(
            getPreferenceKey(R.string.pref_key_privacy_block_analytics),
            true,
        )

    /**
     * Checks if social media trackers should be blocked.
     * Defaults to true.
     */
    fun shouldBlockSocialTrackers() =
        preferences.getBoolean(
            getPreferenceKey(R.string.pref_key_privacy_block_social),
            true,
        )

    /**
     * Checks if "other" trackers (e.g., content trackers) should be blocked.
     * Defaults to false.
     */
    fun shouldBlockOtherTrackers() =
        preferences.getBoolean(
            getPreferenceKey(R.string.pref_key_privacy_block_other3),
            false,
        )

    /**
     * Checks if the user has ever manually toggled the search suggestions setting.
     */
    fun userHasToggledSearchSuggestions(): Boolean =
        preferences.getBoolean(SearchSuggestionsPreferences.TOGGLED_SUGGESTIONS_PREF, false)

    /**
     * Checks if the user has dismissed the "no suggestions" message in the search bar.
     */
    fun userHasDismissedNoSuggestionsMessage(): Boolean =
        preferences.getBoolean(SearchSuggestionsPreferences.DISMISSED_NO_SUGGESTIONS_PREF, false)

    /**
     * Gets the total number of times the application has been launched.
     */
    fun getAppLaunchCount() = preferences.getInt(
        getPreferenceKey(R.string.app_launch_count),
        0,
    )

    /**
     * Gets the total number of trackers that have been blocked since installation.
     */
    fun getTotalBlockedTrackersCount() = preferences.getInt(
        getPreferenceKey(R.string.pref_key_privacy_total_trackers_blocked_count),
        0,
    )

    /**
     * Reflects the user's explicit choice to use the light theme.
     */
    var lightThemeSelected by booleanPreference(
        getPreferenceKey(R.string.pref_key_light_theme),
        false,
    )

    /**
     * Reflects the user's explicit choice to use the dark theme.
     */
    var darkThemeSelected by booleanPreference(
        getPreferenceKey(R.string.pref_key_dark_theme),
        false,
    )

    /**
     * Reflects the user's explicit choice to use the system's default theme setting.
     */
    var useDefaultThemeSelected by booleanPreference(
        getPreferenceKey(R.string.pref_key_default_theme),
        false,
    )

    /**
     * Sets Preferred Color scheme based on Dark/Light Theme Settings or Current Configuration
     */
    fun getPreferredColorScheme(): PreferredColorScheme {
        val inDark =
            (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
                Configuration.UI_MODE_NIGHT_YES
        return when {
            darkThemeSelected -> PreferredColorScheme.Dark
            lightThemeSelected -> PreferredColorScheme.Light
            inDark -> PreferredColorScheme.Dark
            else -> PreferredColorScheme.Light
        }
    }

    /**
     * Determines if the Nimbus preview channel should be used for experiments.
     * Requires a restart to take effect.
     */
    var shouldUseNimbusPreview: Boolean
        get() = preferences.getBoolean(getPreferenceKey(R.string.pref_key_use_nimbus_preview), false)
        set(value) {
            preferences.edit(commit = true) {
                putBoolean(getPreferenceKey(R.string.pref_key_use_nimbus_preview), value)
            }
        }

    /**
     * Determines if the production server for remote settings should be used.
     * Requires a restart to take effect.
     */
    var useProductionRemoteSettingsServer: Boolean
        get() = preferences.getBoolean(getPreferenceKey(R.string.pref_key_remote_server_prod), true)
        set(value) {
            preferences.edit(commit = true) {
                putBoolean(getPreferenceKey(R.string.pref_key_remote_server_prod), value)
            }
        }

    /**
     * Increments the counter for how many times a search widget has been installed.
     */
    fun addSearchWidgetInstalled(count: Int) {
        val key = getPreferenceKey(R.string.pref_key_search_widget_installed)
        val newValue = preferences.getInt(key, 0) + count
        preferences.edit {
            putInt(key, newValue)
        }
    }

    /**
     * Checks if a search widget has been installed at least once.
     */
    val searchWidgetInstalled: Boolean
        get() = 0 < preferences.getInt(
            getPreferenceKey(R.string.pref_key_search_widget_installed),
            0,
        )

    /**
     * This is used for promote search widget dialog to appear only at the first data clearing and
     * at the 5th one.
     */
    fun addClearBrowsingSessions(count: Int) {
        val key = getPreferenceKey(R.string.pref_key_clear_browsing_sessions)
        val newValue = preferences.getInt(key, 0) + count
        preferences.edit {
            putInt(key, newValue)
        }
    }

    /**
     * Gets the number of times the user has cleared their browsing session.
     */
    fun getClearBrowsingSessions() = preferences.getInt(
        getPreferenceKey(R.string.pref_key_clear_browsing_sessions),
        0,
    )

    /**
     * Gets the current HTTPS-Only Mode setting for the browser engine.
     */
    fun getHttpsOnlyMode(): Engine.HttpsOnlyMode {
        return if (preferences.getBoolean(getPreferenceKey(R.string.pref_key_https_only), true)) {
            Engine.HttpsOnlyMode.ENABLED
        } else {
            Engine.HttpsOnlyMode.DISABLED
        }
    }

    /**
     * This is needed for GUI Testing. If the value is not set in the sharePref
     * the default value will be the one from Nimbus.
     */
    @VisibleForTesting
    var isCookieBannerEnable: Boolean
        get() = preferences.getBoolean(
            getPreferenceKey(R.string.pref_key_cookie_banner_enabled),
            FocusNimbus.features.cookieBanner.value().isCookieHandlingEnabled,
        )
        set(value) {
            preferences.edit {
                putBoolean(getPreferenceKey(R.string.pref_key_cookie_banner_enabled), value)
            }
        }

    /**
     * Saves the user's selected option for handling cookie banners.
     */
    fun saveCurrentCookieBannerOptionInSharePref(
        cookieBannerOption: CookieBannerOption,
    ) {
        preferences.edit {
            putString(
                context.getString(R.string.pref_key_cookie_banner_settings),
                context.getString(cookieBannerOption.prefKeyId),
            )
        }
    }

    /**
     * Retrieves the user's currently selected option for handling cookie banners.
     */
    fun getCurrentCookieBannerOptionFromSharePref(): CookieBannerOption {
        val optionValue = preferences.getString(
            context.getString(R.string.pref_key_cookie_banner_settings),
            context.getString(CookieBannerOption.CookieBannerRejectAll().prefKeyId),
        )
        return when (optionValue) {
            context.getString(CookieBannerOption.CookieBannerDisabled().prefKeyId) ->
                CookieBannerOption.CookieBannerDisabled()
            context.getString(CookieBannerOption.CookieBannerRejectAll().prefKeyId) ->
                CookieBannerOption.CookieBannerRejectAll()
            else -> CookieBannerOption.CookieBannerDisabled()
        }
    }

    /**
     * Determines whether the daily usage ping for telemetry is enabled.
     */
    var isDailyUsagePingEnabled by booleanPreference(
        getPreferenceKey(R.string.pref_key_daily_usage_ping),
        default = GleanMetricsService.shouldTelemetryBeEnabledByDefault(context),
        persistDefaultIfNotExists = true,
    )

    private fun getPreferenceKey(resourceId: Int): String =
        context.getString(resourceId)

    override val preferences: SharedPreferences
        get() = PreferenceManager.getDefaultSharedPreferences(context)
}
