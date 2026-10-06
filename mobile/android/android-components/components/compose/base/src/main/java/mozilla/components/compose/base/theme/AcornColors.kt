/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:Suppress("MagicNumber")

package mozilla.components.compose.base.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import mozilla.components.ui.colors.NovaColors
import mozilla.components.ui.colors.PhotonColors

/**
 * A custom Color Palette for Mozilla Firefox for Android (Fenix).
 */
@Suppress("LongParameterList")
@Stable
class AcornColors(
    layerGradientStart: Color,
    layerGradientEnd: Color,
    formDefault: Color,
    textOnColorPrimary: Color,
    iconOnColor: Color,
    information: Color,
    onInformation: Color,
    informationContainer: Color,
    onInformationContainer: Color,
    success: Color,
    onSuccess: Color,
    warning: Color,
    onWarning: Color,
    warningContainer: Color,
    onWarningContainer: Color,
    surfaceDimVariant: Color,
    autofillText: Color,
    selectedText: Color,
    iconPrivate: Color,
) {
    // Tooltip
    var layerGradientStart by mutableStateOf(layerGradientStart)
        private set

    // Tooltip
    var layerGradientEnd by mutableStateOf(layerGradientEnd)
        private set

    // Checkbox default, Radio button default
    var formDefault by mutableStateOf(formDefault)
        private set

    // Text

    // Text Inverted/On Color
    var textOnColorPrimary by mutableStateOf(textOnColorPrimary)
        private set

    // Icon

    // Icon inverted (on color)
    var iconOnColor by mutableStateOf(iconOnColor)
        private set

    /*
     * M3 color scheme extensions that do not have a mapped value from Acorn
     */

    /**
     * Attention-grabbing color against surface for fills, icons, and text,
     * indicating neutral information.
     */
    internal var information by mutableStateOf(information)
        private set

    /**
     * Text and icons against information.
     */
    internal var onInformation by mutableStateOf(onInformation)
        private set

    /**
     * Less prominent fill color against surface, for neutral information.
     */
    internal var informationContainer by mutableStateOf(informationContainer)
        private set

    /**
     * Text and icons against information container.
     */
    internal var onInformationContainer by mutableStateOf(onInformationContainer)
        private set

    /**
     * Attention-grabbing color against surface for fills, icons, and text,
     * indicating successful information
     */
    internal var success by mutableStateOf(success)
        private set

    /**
     * Text and icons against success.
     */
    internal var onSuccess by mutableStateOf(onSuccess)
        private set

    /**
     * Attention-grabbing color against surface for fills, icons, and text, indicating
     * warning information.
     */
    internal var warning by mutableStateOf(warning)
        private set

    /**
     * Text and icons against warning.
     */
    internal var onWarning by mutableStateOf(onWarning)
        private set

    /**
     * Less prominent fill color against surface, for warning information.
     */
    internal var warningContainer by mutableStateOf(warningContainer)
        private set

    /**
     * Text and icons against warning container.
     */
    internal var onWarningContainer by mutableStateOf(onWarningContainer)
        private set

    /**
     * Slightly dimmer surface color in light theme.
     */
    internal var surfaceDimVariant by mutableStateOf(surfaceDimVariant)
        private set

    /**
     * Highlighted autofill text color.
     */
    internal var autofillText by mutableStateOf(autofillText)
        private set

    /**
     * Highlighted selected text color.
     */
    internal var selectedText by mutableStateOf(selectedText)
        private set

    /**
     * Private mode icon.
     */
    internal var iconPrivate by mutableStateOf(iconPrivate)
        private set

    /**
     * Updates the existing colors with the provided [AcornColors].
     */
    fun update(other: AcornColors) {
        layerGradientStart = other.layerGradientStart
        layerGradientEnd = other.layerGradientEnd
        formDefault = other.formDefault
        textOnColorPrimary = other.textOnColorPrimary
        iconOnColor = other.iconOnColor
        information = other.information
        onInformation = other.onInformation
        informationContainer = other.informationContainer
        onInformationContainer = other.onInformationContainer
        success = other.success
        onSuccess = other.onSuccess
        warning = other.warning
        onWarning = other.onWarning
        warningContainer = other.warningContainer
        onWarningContainer = other.onWarningContainer
        surfaceDimVariant = other.surfaceDimVariant
        autofillText = other.autofillText
        selectedText = other.selectedText
        iconPrivate = other.iconPrivate
    }

    /**
     * Return a copy of this [AcornColors] and optionally overriding any of the provided values.
     */
    fun copy(
        layerGradientStart: Color = this.layerGradientStart,
        layerGradientEnd: Color = this.layerGradientEnd,
        formDefault: Color = this.formDefault,
        textOnColorPrimary: Color = this.textOnColorPrimary,
        iconOnColor: Color = this.iconOnColor,
        information: Color = this.information,
        onInformation: Color = this.onInformation,
        informationContainer: Color = this.informationContainer,
        onInformationContainer: Color = this.onInformationContainer,
        success: Color = this.success,
        onSuccess: Color = this.onSuccess,
        warning: Color = this.warning,
        onWarning: Color = this.onWarning,
        warningContainer: Color = this.warningContainer,
        onWarningContainer: Color = this.onWarningContainer,
        surfaceDimVariant: Color = this.surfaceDimVariant,
        autofillText: Color = this.autofillText,
        selectedText: Color = this.selectedText,
        iconPrivate: Color = this.iconPrivate,
    ): AcornColors = AcornColors(
        layerGradientStart = layerGradientStart,
        layerGradientEnd = layerGradientEnd,
        formDefault = formDefault,
        textOnColorPrimary = textOnColorPrimary,
        iconOnColor = iconOnColor,
        information = information,
        onInformation = onInformation,
        informationContainer = informationContainer,
        onInformationContainer = onInformationContainer,
        success = success,
        onSuccess = onSuccess,
        warning = warning,
        onWarning = onWarning,
        warningContainer = warningContainer,
        onWarningContainer = onWarningContainer,
        surfaceDimVariant = surfaceDimVariant,
        autofillText = autofillText,
        selectedText = selectedText,
        iconPrivate = iconPrivate,
    )
}

val darkColorPalette = AcornColors(
    layerGradientStart = PhotonColors.Violet70,
    layerGradientEnd = PhotonColors.Violet60,
    formDefault = PhotonColors.LightGrey05,
    textOnColorPrimary = PhotonColors.LightGrey05,
    iconOnColor = PhotonColors.LightGrey05,
    information = NovaColors.Blue30,
    onInformation = NovaColors.Gray80,
    informationContainer = NovaColors.Blue70,
    onInformationContainer = NovaColors.VioletDesaturated0,
    success = NovaColors.Green30,
    onSuccess = NovaColors.Gray80,
    warning = NovaColors.Yellow30,
    onWarning = NovaColors.Gray80,
    warningContainer = NovaColors.Yellow70,
    onWarningContainer = NovaColors.VioletDesaturated0,
    surfaceDimVariant = NovaColors.Gray80,
    autofillText = NovaColors.VioletDesaturated30A55,
    selectedText = NovaColors.Gray45A80,
    iconPrivate = NovaColors.Violet50,
)

val lightColorPalette = AcornColors(
    layerGradientStart = PhotonColors.Violet70,
    layerGradientEnd = PhotonColors.Violet60,
    formDefault = PhotonColors.DarkGrey90,
    textOnColorPrimary = PhotonColors.LightGrey05,
    iconOnColor = PhotonColors.LightGrey05,
    information = NovaColors.Blue50,
    onInformation = NovaColors.White,
    informationContainer = NovaColors.Blue10,
    onInformationContainer = NovaColors.VioletDesaturated90,
    success = NovaColors.Green50,
    onSuccess = NovaColors.White,
    warning = NovaColors.Yellow50,
    onWarning = NovaColors.White,
    warningContainer = NovaColors.Yellow10,
    onWarningContainer = NovaColors.VioletDesaturated90,
    surfaceDimVariant = NovaColors.Gray10,
    autofillText = NovaColors.VioletDesaturated30,
    selectedText = NovaColors.Gray35,
    iconPrivate = NovaColors.Violet50,
)

val privateColorPalette = darkColorPalette.copy(
    surfaceDimVariant = Color(0xFF11042B),
    selectedText = NovaColors.Gray45A81,
)

/**
 * Returns a dark Material color scheme mapped from Acorn.
 */
fun acornDarkColorScheme(): ColorScheme = darkColorScheme(
    primary = NovaColors.Violet20,
    onPrimary = NovaColors.Gray80,
    primaryContainer = NovaColors.Violet60,
    onPrimaryContainer = NovaColors.VioletDesaturated0,
    inversePrimary = NovaColors.Violet70,
    secondary = NovaColors.Gray20,
    onSecondary = NovaColors.Gray80,
    secondaryContainer = NovaColors.VioletDesaturated70,
    onSecondaryContainer = NovaColors.VioletDesaturated0,
    tertiary = NovaColors.Violet30,
    onTertiary = NovaColors.Gray80,
    tertiaryContainer = NovaColors.VioletDesaturated90,
    onTertiaryContainer = NovaColors.VioletDesaturated0,
    background = NovaColors.Gray75,
    onBackground = NovaColors.VioletDesaturated0,
    surface = NovaColors.Gray75,
    onSurface = NovaColors.VioletDesaturated0,
    surfaceVariant = NovaColors.Gray65,
    onSurfaceVariant = NovaColors.VioletDesaturated0A70,
    surfaceTint = NovaColors.Gray50,
    inverseSurface = NovaColors.Gray30,
    inverseOnSurface = NovaColors.Gray80,
    error = NovaColors.Red30,
    onError = NovaColors.Gray80,
    errorContainer = NovaColors.Red70,
    onErrorContainer = NovaColors.VioletDesaturated0,
    outline = NovaColors.Gray45,
    outlineVariant = NovaColors.Gray65,
    scrim = NovaColors.BlackA50,
    surfaceBright = NovaColors.Gray65,
    surfaceDim = NovaColors.Gray85,
    surfaceContainer = NovaColors.Gray75,
    surfaceContainerHigh = NovaColors.Gray70,
    surfaceContainerHighest = NovaColors.Gray65,
    surfaceContainerLow = NovaColors.Gray80,
    surfaceContainerLowest = NovaColors.Gray85,
)

/**
 * Returns a light Material color scheme mapped from Acorn.
 */
fun acornLightColorScheme(): ColorScheme = lightColorScheme(
    primary = NovaColors.Violet70,
    onPrimary = NovaColors.White,
    primaryContainer = NovaColors.Violet20,
    onPrimaryContainer = NovaColors.VioletDesaturated90,
    inversePrimary = NovaColors.Violet20,
    secondary = NovaColors.Gray50,
    onSecondary = NovaColors.White,
    secondaryContainer = NovaColors.VioletDesaturated10,
    onSecondaryContainer = NovaColors.VioletDesaturated90,
    tertiary = NovaColors.Violet50,
    onTertiary = NovaColors.White,
    tertiaryContainer = NovaColors.Violet0,
    onTertiaryContainer = NovaColors.VioletDesaturated90,
    background = NovaColors.Gray5,
    onBackground = NovaColors.VioletDesaturated90,
    surface = NovaColors.Gray5,
    onSurface = NovaColors.VioletDesaturated90,
    surfaceVariant = NovaColors.Gray15,
    onSurfaceVariant = NovaColors.VioletDesaturated90A70,
    surfaceTint = NovaColors.Gray30,
    inverseSurface = NovaColors.Gray70,
    inverseOnSurface = NovaColors.White,
    error = NovaColors.Red50,
    onError = NovaColors.White,
    errorContainer = NovaColors.Red10,
    onErrorContainer = NovaColors.VioletDesaturated90,
    outline = NovaColors.Gray45,
    outlineVariant = NovaColors.Gray15,
    scrim = NovaColors.BlackA50,
    surfaceBright = NovaColors.White,
    surfaceDim = NovaColors.Gray15,
    surfaceContainer = NovaColors.Gray5,
    surfaceContainerHigh = NovaColors.Gray10,
    surfaceContainerHighest = NovaColors.Gray15,
    surfaceContainerLow = NovaColors.Gray0,
    surfaceContainerLowest = NovaColors.White,
)

/**
 * Returns a private Material color scheme mapped from Acorn.
 */
fun acornPrivateColorScheme(): ColorScheme = darkColorScheme(
    primary = NovaColors.Violet20,
    onPrimary = NovaColors.Gray80,
    primaryContainer = NovaColors.Violet60,
    onPrimaryContainer = NovaColors.VioletDesaturated0,
    inversePrimary = NovaColors.Violet70,
    secondary = NovaColors.Gray20,
    onSecondary = NovaColors.Gray80,
    secondaryContainer = NovaColors.Violet70,
    onSecondaryContainer = NovaColors.VioletDesaturated0,
    tertiary = NovaColors.Violet30,
    onTertiary = NovaColors.Gray80,
    tertiaryContainer = NovaColors.VioletDesaturated90,
    onTertiaryContainer = NovaColors.VioletDesaturated0,
    background = NovaColors.VioletDesaturated90,
    onBackground = NovaColors.VioletDesaturated0,
    surface = NovaColors.VioletDesaturated90,
    onSurface = NovaColors.VioletDesaturated0,
    surfaceVariant = NovaColors.VioletDesaturated80,
    onSurfaceVariant = NovaColors.VioletDesaturated0A70,
    surfaceTint = NovaColors.VioletDesaturated60,
    inverseSurface = NovaColors.Gray30,
    inverseOnSurface = NovaColors.Gray80,
    error = NovaColors.Red30,
    onError = NovaColors.Gray80,
    errorContainer = NovaColors.Red70,
    onErrorContainer = NovaColors.VioletDesaturated0,
    outline = NovaColors.Gray45,
    outlineVariant = NovaColors.VioletDesaturated80,
    scrim = NovaColors.BlackA50,
    surfaceBright = NovaColors.VioletDesaturated80,
    surfaceDim = Color(0xFF0D0321),
    surfaceContainer = NovaColors.VioletDesaturated90,
    surfaceContainerHigh = Color(0xFF20163A),
    surfaceContainerHighest = NovaColors.VioletDesaturated80,
    surfaceContainerLow = Color(0xFF11042B),
    surfaceContainerLowest = Color(0xFF0D0321),
)

// M3 color scheme extensions

/**
 * @see AcornColors.information
 */
val ColorScheme.information: Color
    @Composable
    @ReadOnlyComposable
    get() = AcornTheme.colors.information

/**
 * @see AcornColors.onInformation
 */
val ColorScheme.onInformation: Color
    @Composable
    @ReadOnlyComposable
    get() = AcornTheme.colors.onInformation

/**
 * @see AcornColors.informationContainer
 */
val ColorScheme.informationContainer: Color
    @Composable
    @ReadOnlyComposable
    get() = AcornTheme.colors.informationContainer

/**
 * @see AcornColors.onInformationContainer
 */
val ColorScheme.onInformationContainer: Color
    @Composable
    @ReadOnlyComposable
    get() = AcornTheme.colors.onInformationContainer

/**
 * @see AcornColors.success
 */
val ColorScheme.success: Color
    @Composable
    @ReadOnlyComposable
    get() = AcornTheme.colors.success

/**
 * @see AcornColors.onSuccess
 */
val ColorScheme.onSuccess: Color
    @Composable
    @ReadOnlyComposable
    get() = AcornTheme.colors.onSuccess

/**
 * @see AcornColors.warning
 */
val ColorScheme.warning: Color
    @Composable
    @ReadOnlyComposable
    get() = AcornTheme.colors.warning

/**
 * @see AcornColors.onWarning
 */
val ColorScheme.onWarning: Color
    @Composable
    @ReadOnlyComposable
    get() = AcornTheme.colors.onWarning

/**
 * @see AcornColors.warningContainer
 */
val ColorScheme.warningContainer: Color
    @Composable
    @ReadOnlyComposable
    get() = AcornTheme.colors.warningContainer

/**
 * @see AcornColors.onWarningContainer
 */
val ColorScheme.onWarningContainer: Color
    @Composable
    @ReadOnlyComposable
    get() = AcornTheme.colors.onWarningContainer

/**
 * @see AcornColors.surfaceDimVariant
 */
val ColorScheme.surfaceDimVariant: Color
    @Composable
    @ReadOnlyComposable
    get() = AcornTheme.colors.surfaceDimVariant

/**
 * @see AcornColors.autofillText
 */
val ColorScheme.autofillText: Color
    @Composable
    @ReadOnlyComposable
    get() = AcornTheme.colors.autofillText

/**
 * @see AcornColors.selectedText
 */
val ColorScheme.selectedText: Color
    @Composable
    @ReadOnlyComposable
    get() = AcornTheme.colors.selectedText

/**
 * @see AcornColors.iconPrivate
 */
val ColorScheme.iconPrivate: Color
    @Composable
    @ReadOnlyComposable
    get() = AcornTheme.colors.iconPrivate
