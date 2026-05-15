/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.iconpicker

/**
 * Function for reducing a new app icon state based on the received action.
 */
internal fun appIconReducer(state: AppIconState, action: AppIconAction) = when (action) {
    is UserAction -> state.handleUserAction(action)
    is SystemAction -> state.handleSystemAction(action)
}

private fun AppIconState.handleUserAction(action: UserAction): AppIconState {
    return when (action) {
        is UserAction.Selected -> this.copy(
            userSelectedAppIcon = action.appIcon,
            warningDialogState = AppIconWarningDialog.Presenting(newIcon = action.appIcon),
        )

        is UserAction.Confirmed -> this
        is UserAction.Dismissed -> this.copy(
            userSelectedAppIcon = null,
            warningDialogState = AppIconWarningDialog.None,
        )
    }
}

private fun AppIconState.handleSystemAction(action: SystemAction): AppIconState {
    return when (action) {
        is SystemAction.Applied -> this.copy(
            currentAppIcon = action.newIcon,
            userSelectedAppIcon = null,
            warningDialogState = AppIconWarningDialog.None,
        )
        is SystemAction.DialogDismissed -> this.copy(
            userSelectedAppIcon = null,
            warningDialogState = AppIconWarningDialog.None,
        )
        is SystemAction.SnackbarDismissed -> this.copy(snackbarState = AppIconSnackbarState.None)
        is SystemAction.UpdateFailed -> this.copy(
            userSelectedAppIcon = null,
            snackbarState = AppIconSnackbarState.ApplyingNewIconError(
                oldIcon = action.oldIcon,
                newIcon = action.newIcon,
            ),
            warningDialogState = AppIconWarningDialog.None,
        )
        is SystemAction.SnackbarShown -> this
    }
}
