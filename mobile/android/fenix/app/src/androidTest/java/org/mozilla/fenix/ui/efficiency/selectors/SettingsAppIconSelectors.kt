/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.R
import org.mozilla.fenix.helpers.DataGenerationHelper.getStringResource
import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object SettingsAppIconSelectors {
    val FEATURED_SECTION = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT,
        value = getStringResource(R.string.alternative_app_icon_group_featured),
        description = "Featured app icon section header",
        groups = listOf("requiredForPage", "appIconItems"),
    )
    val RETRO_2004 = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_retro_2004),
        description = "Retro 2004 app icon option",
        groups = listOf("appIconItems"),
    )
    val PIXELATED = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_pixelated),
        description = "Pixelated app icon option",
        groups = listOf("appIconItems"),
    )
    val CUDDLING = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_cuddling),
        description = "Cuddling app icon option",
        groups = listOf("appIconItems"),
    )
    val PRIDE = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_pride),
        description = "Pride app icon option",
        groups = listOf("appIconItems"),
    )
    val FLAMING = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_flaming),
        description = "Flaming app icon option",
        groups = listOf("appIconItems"),
    )
    val MINIMAL = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_minimal),
        description = "Minimal app icon option",
        groups = listOf("appIconItems"),
    )
    val MOMO = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_momo),
        description = "Momo app icon option",
        groups = listOf("appIconItems"),
    )
    val MOMO_SUBTITLE = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_momo_subtitle),
        description = "Momo app icon subtitle",
        groups = listOf("appIconItems"),
    )
    val COOL = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_cool),
        description = "Cool app icon option",
        groups = listOf("appIconItems"),
    )
    val SOLID_COLORS_SECTION = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT,
        value = getStringResource(R.string.alternative_app_icon_group_solid_colors),
        description = "Solid colors app icon section header",
        groups = listOf("appIconItems"),
    )
    val DEFAULT_ICON = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_default),
        description = "Default solid color app icon option",
        groups = listOf("appIconItems"),
    )
    val LIGHT_ICON = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_light),
        description = "Light solid color app icon option",
        groups = listOf("appIconItems"),
    )
    val DARK_ICON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_dark),
        description = "Dark solid color app icon option",
        groups = listOf("appIconItems"),
    )
    val RED_ICON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_red),
        description = "Red solid color app icon option",
        groups = listOf("appIconGradientsItems", "requiresScroll"),
    )
    val GREEN_ICON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_green),
        description = "Green solid color app icon option",
        groups = listOf("appIconGradientsItems", "requiresScroll"),
    )
    val BLUE_ICON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_blue),
        description = "Blue solid color app icon option",
        groups = listOf("appIconGradientsItems", "requiresScroll"),
    )
    val PURPLE_ICON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_purple),
        description = "Purple solid color app icon option",
        groups = listOf("appIconGradientsItems", "requiresScroll"),
    )
    val DARK_PURPLE_ICON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_purple_dark),
        description = "Dark Purple solid color app icon option",
        groups = listOf("appIconGradientsItems", "requiresScroll"),
    )
    val SUNRISE = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_gradient_sunrise),
        description = "Sunrise gradient app icon option",
        groups = listOf("appIconGradientsItems", "requiresScroll"),
    )
    val GOLDEN_HOUR = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_gradient_golden_hour),
        description = "Golden Hour gradient app icon option",
        groups = listOf("appIconGradientsItems", "requiresScroll"),
    )
    val SUNSET = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_gradient_sunset),
        description = "Sunset gradient app icon option",
        groups = listOf("appIconGradientsItems", "requiresScroll"),
    )
    val BLUE_HOUR = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_gradient_blue_hour),
        description = "Blue Hour gradient app icon option",
        groups = listOf("appIconGradientsItems", "requiresScroll"),
    )
    val TWILIGHT = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_gradient_twilight),
        description = "Twilight gradient app icon option",
        groups = listOf("appIconGradientsItems", "requiresScroll"),
    )
    val GRADIENTS_SECTION = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.alternative_app_icon_group_gradients),
        description = "Gradients app icon section header",
        groups = listOf("appIconGradientsItems", "requiresScroll"),
    )
    val MIDNIGHT = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_gradient_midnight),
        description = "Midnight gradient app icon option",
        groups = listOf("appIconGradientsItems", "requiresScroll"),
    )
    val NORTHERN_LIGHTS = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.alternative_app_icon_option_gradient_northern_lights),
        description = "Northern Lights gradient app icon option",
        groups = listOf("appIconGradientsItems", "requiresScroll"),
    )

    val CHANGE_ICON_DIALOG_TITLE = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.restart_warning_dialog_title),
        description = "Change app icon dialog title",
        groups = listOf("changeIconDialog"),
    )
    val CHANGE_ICON_DIALOG_BODY = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.restart_warning_dialog_body_2),
        description = "Change app icon dialog body",
        groups = listOf("changeIconDialog"),
    )
    val CHANGE_ICON_DIALOG_CANCEL_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.restart_warning_dialog_button_negative),
        description = "Change app icon dialog Cancel button",
        groups = listOf("changeIconDialog"),
    )
    val CHANGE_ICON_DIALOG_CHANGE_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.restart_warning_dialog_button_positive_2),
        description = "Change app icon dialog Change button",
        groups = listOf("changeIconDialog"),
    )

    val all = listOf(
        FEATURED_SECTION,
        RETRO_2004,
        PIXELATED,
        CUDDLING,
        PRIDE,
        FLAMING,
        MINIMAL,
        MOMO,
        MOMO_SUBTITLE,
        COOL,
        SOLID_COLORS_SECTION,
        DEFAULT_ICON,
        LIGHT_ICON,
        DARK_ICON,
        RED_ICON,
        GREEN_ICON,
        BLUE_ICON,
        PURPLE_ICON,
        DARK_PURPLE_ICON,
        SUNRISE,
        GOLDEN_HOUR,
        SUNSET,
        BLUE_HOUR,
        TWILIGHT,
        GRADIENTS_SECTION,
        MIDNIGHT,
        NORTHERN_LIGHTS,
    )
}
