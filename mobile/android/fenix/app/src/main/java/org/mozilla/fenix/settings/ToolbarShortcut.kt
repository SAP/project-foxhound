/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings

import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import org.mozilla.fenix.R
import mozilla.components.ui.icons.R as iconsR

/**
 * Keys used to persist and map the selected toolbar shortcut option.
 * These string values are stored in preferences and also used to resolve the UI/action.
 */
enum class ShortcutType(val value: String) {
    NEW_TAB("new_tab"),
    SHARE("share"),
    BOOKMARK("bookmark"),
    TRANSLATE("translate"),
    HOMEPAGE("homepage"),
    BACK("back"),
    ;

    companion object {
        /**
         * Returns the [ShortcutType] for the given string [value], or null if no matching type is found.
         */
        fun fromValue(value: String): ShortcutType? =
            entries.find { it.value == value }
    }
}

internal enum class ShortcutAvailability {
    SIMPLE,
    EXPANDED,
}

internal data class ShortcutOption(
    val key: ShortcutType,
    @param:DrawableRes val icon: Int,
    @param:StringRes val label: Int,
    val availability: Set<ShortcutAvailability>,
)

internal val allShortcutOptions: List<ShortcutOption> = listOf(
    ShortcutOption(
        ShortcutType.NEW_TAB,
        iconsR.drawable.mozac_ic_plus_24,
        R.string.toolbar_customize_shortcut_new_tab,
        setOf(ShortcutAvailability.SIMPLE),
    ),
    ShortcutOption(
        ShortcutType.SHARE,
        iconsR.drawable.mozac_ic_share_android_24,
        R.string.toolbar_customize_shortcut_share,
        setOf(ShortcutAvailability.SIMPLE),
    ),
    ShortcutOption(
        ShortcutType.BOOKMARK,
        iconsR.drawable.mozac_ic_bookmark_24,
        R.string.toolbar_customize_shortcut_add_bookmark,
        setOf(ShortcutAvailability.SIMPLE, ShortcutAvailability.EXPANDED),
    ),
    ShortcutOption(
        ShortcutType.TRANSLATE,
        iconsR.drawable.mozac_ic_translate_24,
        R.string.toolbar_customize_shortcut_translate,
        setOf(ShortcutAvailability.SIMPLE, ShortcutAvailability.EXPANDED),
    ),
    ShortcutOption(
        ShortcutType.HOMEPAGE,
        iconsR.drawable.mozac_ic_home_24,
        R.string.toolbar_customize_shortcut_homepage,
        setOf(ShortcutAvailability.SIMPLE, ShortcutAvailability.EXPANDED),
    ),
    ShortcutOption(
        ShortcutType.BACK,
        iconsR.drawable.mozac_ic_back_24,
        R.string.toolbar_customize_shortcut_back,
        setOf(ShortcutAvailability.SIMPLE, ShortcutAvailability.EXPANDED),
    ),
)

internal val expandedShortcutOptions: List<ShortcutOption> =
    allShortcutOptions.filter { ShortcutAvailability.EXPANDED in it.availability }

internal val simpleShortcutOptions: List<ShortcutOption> =
    allShortcutOptions.filter { ShortcutAvailability.SIMPLE in it.availability }
