/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.iconpicker

import mozilla.components.lib.state.State

/**
 * Represents the state of the app icon picker screen.
 *
 * @property currentAppIcon The icon currently being used by the application.
 * @property userSelectedAppIcon The icon the user has selected in the picker, if any.
 * @property groupedIconOptions A map of all available app icons.
 * @property snackbarState The current snackbar state.
 * @property warningDialogState The current warning dialog state.
 */
data class AppIconState(
    val currentAppIcon: AppIcon = AppIcon.AppDefault,
    val userSelectedAppIcon: AppIcon? = null,
    val groupedIconOptions: Map<IconGroupTitle, List<AppIcon>> = mapOf(),
    val snackbarState: AppIconSnackbarState = AppIconSnackbarState.None,
    val warningDialogState: AppIconWarningDialog = AppIconWarningDialog.None,
) : State

/**
 * The state of the snackbar to display.
 */
sealed class AppIconSnackbarState {
    /**
     * There is no snackbar to display.
     */
    data object None : AppIconSnackbarState()

    /**
     * Display a snackbar of the app icon update failure.
     *
     * @property oldIcon the currently used app icon.
     * @property newIcon the app icon that the system tried and failed to apply.
     */
    data class ApplyingNewIconError(val oldIcon: AppIcon, val newIcon: AppIcon) : AppIconSnackbarState()
}

/**
 * The state of the app reset warning dialog
 */
sealed class AppIconWarningDialog {
    /**
     * No dialog to display.
     */
    data object None : AppIconWarningDialog()

    /**
     * The dialog is visible.
     */
    data class Presenting(val newIcon: AppIcon) : AppIconWarningDialog()
}
