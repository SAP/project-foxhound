/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.ui.graphics.Color

/**
 * Custom Focus colors, other than baseline Material color theme.
 * Colors here should be added with consideration, only when an existing Material baseline color is not suitable.
 */
data class FocusColors(
    val material: ColorScheme,
    val dialogActiveControls: Color,
    val topSiteBackground: Color,
    val topSiteFaviconText: Color,
    val topSiteTitle: Color,
    val menuBackground: Color,
    val menuText: Color,
    val aboutPageText: Color,
    val aboutPageLink: Color,
    val radioButtonSelected: Color,
    val toolbarColor: Color,
    val privacySecuritySettingsToolTip: Color,
    val onboardingButtonBackground: Color,
    val onboardingKeyFeatureImageTint: Color,
    val onboardingSemiBoldText: Color,
    val onboardingNormalText: Color,
    val settingsTextColor: Color,
    val settingsTextSummaryColor: Color,
    val closeIcon: Color,
    val dialogTextColor: Color,
) {
    val primary: Color get() = material.primary
    val onPrimary: Color get() = material.onPrimary
    val primaryContainer: Color get() = material.primaryContainer
    val onPrimaryContainer: Color get() = material.onPrimaryContainer
    val inversePrimary: Color get() = material.inversePrimary
    val secondary: Color get() = material.secondary
    val onSecondary: Color get() = material.onSecondary
    val secondaryContainer: Color get() = material.secondaryContainer
    val onSecondaryContainer: Color get() = material.onSecondaryContainer
    val tertiary: Color get() = material.tertiary
    val onTertiary: Color get() = material.onTertiary
    val tertiaryContainer: Color get() = material.tertiaryContainer
    val onTertiaryContainer: Color get() = material.onTertiaryContainer
    val background: Color get() = material.background
    val onBackground: Color get() = material.onBackground
    val surface: Color get() = material.surface
    val onSurface: Color get() = material.onSurface
    val surfaceVariant: Color get() = material.surfaceVariant
    val onSurfaceVariant: Color get() = material.onSurfaceVariant
    val surfaceTint: Color get() = material.surfaceTint
    val inverseSurface: Color get() = material.inverseSurface
    val inverseOnSurface: Color get() = material.inverseOnSurface
    val error: Color get() = material.error
    val onError: Color get() = material.onError
    val errorContainer: Color get() = material.errorContainer
    val onErrorContainer: Color get() = material.onErrorContainer
    val outline: Color get() = material.outline
    val outlineVariant: Color get() = material.outlineVariant
    val scrim: Color get() = material.scrim
}
