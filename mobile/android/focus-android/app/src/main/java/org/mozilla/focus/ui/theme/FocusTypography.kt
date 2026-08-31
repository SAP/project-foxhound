/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.sp
import mozilla.components.ui.colors.PhotonColors
import org.mozilla.focus.R

val metropolis = FontFamily(
    Font(R.font.metropolis, FontWeight.Normal),
    Font(R.font.metropolis_bold, FontWeight.Bold),
    Font(R.font.metropolis_semibold, FontWeight.SemiBold),
)

/**
 * Custom Focus typography, other than baseline Material typography.
 * Custom text styles should be added with consideration,
 * only when an existing Material style is not suitable.
 */
data class FocusTypography(
    val materialTypography: Typography,
    val links: TextStyle,
    val dialogTitle: TextStyle,
    val dialogInput: TextStyle,
    val dialogContent: TextStyle,
    val onboardingTitle: TextStyle,
    val onboardingSubtitle: TextStyle,
    val onboardingDescription: TextStyle,
    val onboardingFeatureTitle: TextStyle,
    val onboardingFeatureDescription: TextStyle,
    val onboardingButton: TextStyle,
    val cfrTextStyle: TextStyle,
    val cfrCookieBannerTextStyle: TextStyle,
    val preferenceTitle: TextStyle,
    val preferenceSummary: TextStyle,
) {

    val displayLarge: TextStyle get() = materialTypography.displayLarge
    val displayMedium: TextStyle get() = materialTypography.displayMedium
    val displaySmall: TextStyle get() = materialTypography.displaySmall
    val headlineLarge: TextStyle get() = materialTypography.headlineLarge
    val headlineMedium: TextStyle get() = materialTypography.headlineMedium
    val headlineSmall: TextStyle get() = materialTypography.headlineSmall
    val titleLarge: TextStyle get() = materialTypography.titleLarge
    val titleMedium: TextStyle get() = materialTypography.titleMedium
    val titleSmall: TextStyle get() = materialTypography.titleSmall
    val bodyLarge: TextStyle get() = materialTypography.bodyLarge
    val bodyMedium: TextStyle get() = materialTypography.bodyMedium
    val bodySmall: TextStyle get() = materialTypography.bodySmall
    val labelLarge: TextStyle get() = materialTypography.labelLarge
    val labelMedium: TextStyle get() = materialTypography.labelMedium
    val labelSmall: TextStyle get() = materialTypography.labelSmall
}

val focusTypography: FocusTypography
    @Composable
    @ReadOnlyComposable
    get() = FocusTypography(
        materialTypography = Typography(
            bodyLarge = TextStyle(
                fontSize = 16.sp,
                lineHeight = 24.sp,
            ),
        ),
        links = TextStyle(
            fontSize = 16.sp,
            textDecoration = TextDecoration.Underline,
            lineHeight = 24.sp,
        ),
        dialogTitle = TextStyle(
            fontFamily = metropolis,
            fontWeight = FontWeight.SemiBold,
            fontSize = 20.sp,
        ),
        dialogInput = TextStyle(
            fontFamily = metropolis,
            fontSize = 20.sp,
            color = focusColors.onPrimary,
        ),
        dialogContent = TextStyle(
            fontFamily = metropolis,
            fontWeight = FontWeight.Normal,
            fontSize = 14.sp,
        ),
        onboardingTitle = TextStyle(
            fontFamily = metropolis,
            fontWeight = FontWeight.SemiBold,
            fontSize = focusDimensions.onboardingTitle,
            color = focusColors.onboardingSemiBoldText,
        ),
        onboardingSubtitle = TextStyle(
            fontFamily = metropolis,
            fontWeight = FontWeight.Normal,
            fontSize = focusDimensions.onboardingSubtitleOne,
            color = focusColors.onboardingSemiBoldText,
        ),
        onboardingDescription = TextStyle(
            fontFamily = metropolis,
            fontWeight = FontWeight.Normal,
            fontSize = focusDimensions.onboardingSubtitleTwo,
            color = focusColors.onboardingNormalText,
        ),
        onboardingFeatureTitle = TextStyle(
            fontFamily = metropolis,
            fontWeight = FontWeight.SemiBold,
            fontSize = 14.sp,
            color = focusColors.onboardingSemiBoldText,
        ),
        onboardingFeatureDescription = TextStyle(
            fontFamily = metropolis,
            fontWeight = FontWeight.Normal,
            fontSize = 14.sp,
            color = focusColors.onboardingNormalText,
        ),
        onboardingButton = TextStyle(
            fontFamily = metropolis,
            fontWeight = FontWeight.SemiBold,
            fontSize = 14.sp,
            color = PhotonColors.LightGrey05,
        ),
        cfrTextStyle = TextStyle(
            fontSize = 16.sp,
            letterSpacing = 0.5.sp,
            lineHeight = 24.sp,
        ),
        cfrCookieBannerTextStyle = TextStyle(
            fontSize = 14.sp,
            letterSpacing = 0.25.sp,
            lineHeight = 20.sp,
        ),
        preferenceTitle = TextStyle(
            fontSize = 16.sp,
            lineHeight = 21.sp, // from 16sp textSize + 5sp lineSpacingExtra
            color = focusColors.settingsTextColor,
        ),
        preferenceSummary = TextStyle(
            fontSize = 14.sp,
            letterSpacing = 0.42.sp, // from 14sp textSize * 0.03 letterSpacing
            color = focusColors.settingsTextSummaryColor,
        ),
    )
