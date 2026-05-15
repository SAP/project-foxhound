/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.iconpicker

import androidx.annotation.ColorRes
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import org.mozilla.fenix.R
import mozilla.components.ui.colors.R as colorsR

/**
 * Enum that represents app launcher icons available for the user to set as an alternative launcher
 * icon. It is based off <activity-alias> entries declared in the AndroidManifest, with addition
 * of title and subtitle for representing the icon name in the UI.
 *
 * The aliasSuffix is the ending part of the <activity-alias>.
 * They are used to construct full component names for switching the launcher icon at runtime.
 *
 * Example:
 * - "AppSolidLight" → android:name="${applicationId}.AppSolidLight"
 *
 * @property aliasSuffix A suffix portion of the `android:name` attribute in the manifest.
 * @property iconForegroundId The foreground drawable resource used in icon previews.
 * @property iconBackground The background layer used in icon previews, which can be a solid color or drawable.
 * @property titleId A string resource describing the icon in the icon picker screen.
 * @property subtitleId An optional string resource used as a secondary label.
 */
enum class AppIcon(
    val aliasSuffix: String,
    @param:DrawableRes val iconForegroundId: Int = R.drawable.ic_firefox,
    val iconBackground: IconBackground = IconBackground.Color(colorResId = colorsR.color.photonWhite),
    @param:StringRes val titleId: Int,
    @param:StringRes val subtitleId: Int? = null,
) {
    AppDefault(
        aliasSuffix = "App",
        iconBackground = IconBackground.Color(colorResId = R.color.ic_launcher_background),
        titleId = R.string.alternative_app_icon_option_default,
    ),
    AppSolidLight(
        aliasSuffix = "AppSolidLight",
        titleId = R.string.alternative_app_icon_option_light,
    ),
    AppSolidDark(
        aliasSuffix = "AppSolidDark",
        iconBackground = IconBackground.Color(colorResId = colorsR.color.photonBlack),
        titleId = R.string.alternative_app_icon_option_dark,
    ),
    AppSolidRed(
        aliasSuffix = "AppSolidRed",
        iconBackground = IconBackground.Drawable(R.drawable.ic_launcher_solid_red_background),
        titleId = R.string.alternative_app_icon_option_red,
    ),
    AppSolidGreen(
        aliasSuffix = "AppSolidGreen",
        iconBackground = IconBackground.Drawable(R.drawable.ic_launcher_solid_green_background),
        titleId = R.string.alternative_app_icon_option_green,
    ),
    AppSolidBlue(
        aliasSuffix = "AppSolidBlue",
        iconBackground = IconBackground.Drawable(R.drawable.ic_launcher_solid_blue_background),
        titleId = R.string.alternative_app_icon_option_blue,
    ),
    AppSolidPurple(
        aliasSuffix = "AppSolidPurple",
        iconBackground = IconBackground.Drawable(R.drawable.ic_launcher_solid_purple_background),
        titleId = R.string.alternative_app_icon_option_purple,
    ),
    AppSolidPurpleDark(
        aliasSuffix = "AppSolidPurpleDark",
        iconBackground = IconBackground.Drawable(R.drawable.ic_launcher_solid_purple_dark_background),
        titleId = R.string.alternative_app_icon_option_purple_dark,
    ),
    AppGradientSunrise(
        aliasSuffix = "AppGradientSunrise",
        iconBackground = IconBackground.Drawable(R.drawable.ic_launcher_gradient_sunrise_background),
        titleId = R.string.alternative_app_icon_option_gradient_sunrise,
    ),
    AppGradientGoldenHour(
        aliasSuffix = "AppGradientGoldenHour",
        iconBackground = IconBackground.Drawable(R.drawable.ic_launcher_gradient_golden_hour_background),
        titleId = R.string.alternative_app_icon_option_gradient_golden_hour,
    ),
    AppGradientSunset(
        aliasSuffix = "AppGradientSunset",
        iconBackground = IconBackground.Drawable(R.drawable.ic_launcher_gradient_sunset_background),
        titleId = R.string.alternative_app_icon_option_gradient_sunset,
    ),
    AppGradientBlueHour(
        aliasSuffix = "AppGradientBlueHour",
        iconBackground = IconBackground.Drawable(R.drawable.ic_launcher_gradient_blue_hour_background),
        titleId = R.string.alternative_app_icon_option_gradient_blue_hour,
    ),
    AppGradientTwilight(
        aliasSuffix = "AppGradientTwilight",
        iconBackground = IconBackground.Drawable(R.drawable.ic_launcher_gradient_twilight_background),
        titleId = R.string.alternative_app_icon_option_gradient_twilight,
    ),
    AppGradientMidnight(
        aliasSuffix = "AppGradientMidnight",
        iconBackground = IconBackground.Drawable(R.drawable.ic_launcher_gradient_midnight_background),
        titleId = R.string.alternative_app_icon_option_gradient_midnight,
    ),
    AppGradientNorthernLights(
        aliasSuffix = "AppGradientNorthernLights",
        iconBackground = IconBackground.Drawable(R.drawable.ic_launcher_gradient_northern_lights_background),
        titleId = R.string.alternative_app_icon_option_gradient_northern_lights,
    ),
    AppRetro2004(
        aliasSuffix = "AppRetro2004",
        iconForegroundId = R.drawable.ic_retro_2004,
        titleId = R.string.alternative_app_icon_option_retro_2004,
    ),
    AppPixelated(
        aliasSuffix = "AppPixelated",
        iconForegroundId = R.drawable.ic_pixelated,
        titleId = R.string.alternative_app_icon_option_pixelated,
    ),
    AppCuddling(
        aliasSuffix = "AppCuddling",
        iconBackground = IconBackground.Drawable(drawableResId = R.drawable.ic_launcher_background_cuddling),
        iconForegroundId = R.drawable.ic_cuddling,
        titleId = R.string.alternative_app_icon_option_cuddling,
    ),
    AppPride(
        aliasSuffix = "AppPride",
        iconForegroundId = R.drawable.ic_pride,
        titleId = R.string.alternative_app_icon_option_pride,
    ),
    AppFlaming(
        aliasSuffix = "AppFlaming",
        iconBackground = IconBackground.Color(colorResId = colorsR.color.photonBlack),
        iconForegroundId = R.drawable.ic_flaming,
        titleId = R.string.alternative_app_icon_option_flaming,
    ),
    AppMinimal(
        aliasSuffix = "AppMinimal",
        iconForegroundId = R.drawable.ic_minimal,
        titleId = R.string.alternative_app_icon_option_minimal,
    ),
    AppMomo(
        aliasSuffix = "AppMomo",
        iconForegroundId = R.drawable.ic_momo,
        titleId = R.string.alternative_app_icon_option_momo,
        subtitleId = R.string.alternative_app_icon_option_momo_subtitle,
    ),
    AppCool(
        aliasSuffix = "AppCool",
        iconBackground = IconBackground.Drawable(drawableResId = R.drawable.ic_launcher_background_cool),
        iconForegroundId = R.drawable.ic_cool,
        titleId = R.string.alternative_app_icon_option_cool,
    ),
    ;

    /**
     * [AppIcon] helper object
     */
    companion object {
        /**
         * Returns the [AppIcon] associated with the given string.
         *
         * @param aliasSuffix The suffix from android:name in the manifest (e.g. "AppSolidLight").
         * Full definition example from the manifest: android:name="${applicationId}.AppSolidLight"
         */
        fun fromString(aliasSuffix: String): AppIcon =
            entries.find { it.aliasSuffix == aliasSuffix } ?: AppDefault
    }
}

/**
 * Represents the background layer of an app icon mipmap assigned to a `<activity-alias>`.
 *
 * It allows passing both `@DrawableRes` and `@ColorRes`, as mipmap files support both
 * `drawable` and `color` parameters for `<background android:drawable>`
 */
sealed class IconBackground {
    /**
     * A solid color background.
     *
     * @property colorResId The color resource ID to use.
     */
    data class Color(
        @param:ColorRes val colorResId: Int,
    ) : IconBackground()

    /**
     * A drawable background.
     *
     * @property drawableResId The drawable resource ID to use.
     */
    data class Drawable(
        @param:DrawableRes val drawableResId: Int,
    ) : IconBackground()
}
