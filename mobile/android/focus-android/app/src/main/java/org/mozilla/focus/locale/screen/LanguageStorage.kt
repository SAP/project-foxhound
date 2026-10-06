/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.locale.screen

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import androidx.preference.PreferenceManager
import org.mozilla.focus.R
import org.mozilla.focus.generated.LocalesList

/**
 * A storage class responsible for managing the application's language settings.
 * It provides access to the list of available languages, the currently selected language,
 * and methods for persisting the user's language choice in SharedPreferences.
 *
 * @param context The application context, used to access resources and SharedPreferences.
 */
class LanguageStorage(private val context: Context) {
    private val sharedPref: SharedPreferences =
        PreferenceManager.getDefaultSharedPreferences(context)

    private val localePrefKey: String by lazy {
        context.resources.getString(R.string.pref_key_locale)
    }

    /**
     * A map of available languages, keyed by their language tag.
     *
     * This map is lazily initialized and includes:
     * 1. The "System default" language.
     * 2. All bundled locales from [LocalesList.BUNDLED_LOCALES], sorted alphabetically
     *    by their native display names.
     *
     * This provides efficient look-up of a [Language] object by its tag.
     */
    private val languagesByTag: Map<String, Language> by lazy {
        buildMap {
            put(systemDefaultLanguage.tag, systemDefaultLanguage)
            LocalesList.BUNDLED_LOCALES
                .map { LocaleDescriptor(it) }
                .sorted()
                .forEach { descriptor ->
                    val language = Language(
                        displayName = descriptor.getNativeName(),
                        tag = descriptor.getTag(),
                        index = size,
                    )
                    put(language.tag, language)
                }
        }
    }

    internal val languages: List<Language> by lazy {
        languagesByTag.values.toList()
    }

    private val systemDefaultLanguage: Language by lazy {
        Language(
            context.getString(R.string.preference_language_systemdefault),
            LOCALE_SYSTEM_DEFAULT,
            0,
        )
    }

    /**
     * The language currently selected by the user. If no language has been explicitly
     * selected, this will default to the "System default" language.
     *
     * The value is retrieved from SharedPreferences using the `pref_key_locale`.
     * If the stored language tag doesn't match any available language, it also
     * falls back to the system default.
     */
    internal val selectedLanguage: Language
        get() {
            val savedLanguageTag =
                sharedPref.getString(localePrefKey, LOCALE_SYSTEM_DEFAULT) ?: LOCALE_SYSTEM_DEFAULT

            return languagesByTag[savedLanguageTag] ?: systemDefaultLanguage
        }

    /**
     * Saves the current selected language tag
     *
     * @param languageTag the tag of the language
     */
    fun saveCurrentLanguageInSharePref(languageTag: String) {
        sharedPref.edit {
            putString(localePrefKey, languageTag)
        }
    }

    companion object {
        const val LOCALE_SYSTEM_DEFAULT = "LOCALE_SYSTEM_DEFAULT"
    }
}
