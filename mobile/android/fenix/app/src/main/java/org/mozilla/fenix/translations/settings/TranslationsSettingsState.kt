/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.translations.settings

import androidx.compose.runtime.Immutable
import org.mozilla.fenix.translations.TranslationSwitchItem

/**
 * Translations settings state
 *
 * @property showAutomaticTranslations Show the entry point for the user to change automatic language settings.
 * @property showNeverTranslate Show the entry point for the user to change never translate settings.
 * @property showDownloads Show the entry point for the user to manage downloaded languages.
 * @property translationsEnabled Whether translations are enabled.
 * @property switchItems The list of setting items to show
 */
@Immutable
data class TranslationsSettingsState(
    val showAutomaticTranslations: Boolean,
    val showNeverTranslate: Boolean,
    val showDownloads: Boolean,
    val translationsEnabled: Boolean,
    val switchItems: List<TranslationSwitchItem>,
)
