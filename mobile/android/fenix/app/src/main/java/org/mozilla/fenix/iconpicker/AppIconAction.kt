/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.iconpicker

import mozilla.components.lib.state.Action

/**
 * Actions related to the app icon selection screen.
 */
sealed interface AppIconAction : Action

/**
 * User-initiated actions.
 */
sealed interface UserAction : AppIconAction {
    /**
     * The user has clicked on an icon.
     *
     * @property appIcon the new selected icon.
     */
    data class Selected(val appIcon: AppIcon) : UserAction

    /**
     * The user has confirmed applying the new icon on the warning dialog screen.
     *
     * @property oldIcon the currently used app icon.
     * @property newIcon the new app icon to apply.
     */
    data class Confirmed(val oldIcon: AppIcon, val newIcon: AppIcon) : UserAction

    /**
     * The user has pressed the "Dismiss" button on the warning dialog.
     */
    data object Dismissed : UserAction
}

/**
 * System-initiated actions.
 */
sealed interface SystemAction : AppIconAction {
    /**
     * The warning dialog has been canceled through means other than dismiss button (back gesture,
     * tap outside of the dialog area, etc)
     */
    data object DialogDismissed : SystemAction

    /**
     * The system app icon has been successfully updated.
     *
     * @property newIcon the new icon.
     */
    data class Applied(val newIcon: AppIcon) : SystemAction

    /**
     * The app icon update failed (due to an exception thrown by a system call).
     *
     * @property oldIcon the currently used app icon.
     * @property newIcon the app icon that the system tried and failed to apply.
     */
    data class UpdateFailed(val oldIcon: AppIcon, val newIcon: AppIcon) : SystemAction

    /**
     * The app icon update error snackbar was shown.
     *
     * @property oldIcon the currently used app icon.
     * @property newIcon the app icon that the system tried and failed to apply.
     */
    data class SnackbarShown(val oldIcon: AppIcon, val newIcon: AppIcon) : SystemAction

    /**
     * The app icon update error snackbar was dismissed.
     */
    data object SnackbarDismissed : SystemAction
}
