/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.iconpicker

import org.junit.Assert.assertEquals
import org.junit.Test

class AppIconReducerTest {
   @Test
   fun `GIVEN Selected user action WHEN reducer is called THEN state is updated with the selected icon and the warning is displayed`() {
       val initialState = AppIconState()
       val newIcon = AppIcon.AppRetro2004

       assertEquals(null, initialState.userSelectedAppIcon)

       val result = appIconReducer(initialState, UserAction.Selected(newIcon))

       assert(result.warningDialogState is AppIconWarningDialog.Presenting)
       assertEquals(newIcon, result.userSelectedAppIcon)
   }

    @Test
    fun `GIVEN Selected user action WHEN reducer is called THEN the current icon is not changed`() {
        val initialState = AppIconState()
        val newIcon = AppIcon.AppRetro2004

        assertEquals(AppIcon.AppDefault, initialState.currentAppIcon)

        val result = appIconReducer(initialState, UserAction.Selected(newIcon))

        assertEquals(AppIcon.AppDefault, result.currentAppIcon)
    }

    @Test
    fun `GIVEN Dismissed user action WHEN reducer is called THEN state resets the warning state to none and the user selected icon to null`() {
        val initialState = AppIconState(
            userSelectedAppIcon = AppIcon.AppRetro2004,
            warningDialogState = AppIconWarningDialog.Presenting(AppIcon.AppRetro2004),
        )

        assertEquals(AppIcon.AppRetro2004, initialState.userSelectedAppIcon)

        val result = appIconReducer(initialState, UserAction.Dismissed)

        assertEquals(AppIconWarningDialog.None, result.warningDialogState)
        assertEquals(null, result.userSelectedAppIcon)
    }

    @Test
    fun `GIVEN Dismissed user action WHEN reducer is called THEN the current icon is not changed`() {
        val initialState = AppIconState()

        assertEquals(AppIcon.AppDefault, initialState.currentAppIcon)

        val result = appIconReducer(initialState, UserAction.Dismissed)

        assertEquals(AppIcon.AppDefault, result.currentAppIcon)
    }

    @Test
    fun `GIVEN DialogDismissed system action WHEN reducer is called THEN the warning dialog is hidden and the user selected icon is reset to null`() {
        val initialState = AppIconState(
            userSelectedAppIcon = AppIcon.AppRetro2004,
            warningDialogState = AppIconWarningDialog.Presenting(AppIcon.AppRetro2004),
        )

        assertEquals(AppIcon.AppRetro2004, initialState.userSelectedAppIcon)

        val result = appIconReducer(initialState, SystemAction.DialogDismissed)

        assertEquals(AppIconWarningDialog.None, result.warningDialogState)
        assertEquals(null, result.userSelectedAppIcon)
    }

    @Test
    fun `GIVEN Applied system action WHEN reducer is called THEN the new icon becomes the new current and the user selected icon resets to null and the dialog is hidden`() {
        val newIcon = AppIcon.AppRetro2004
        val currentIcon = AppIcon.AppDefault
        val dialogState = AppIconWarningDialog.Presenting(newIcon)
        val initialState = AppIconState(
            currentAppIcon = currentIcon,
            userSelectedAppIcon = newIcon,
            warningDialogState = dialogState,
        )

        assertEquals(currentIcon, initialState.currentAppIcon)
        assertEquals(newIcon, initialState.userSelectedAppIcon)
        assertEquals(dialogState, initialState.warningDialogState)

        val result = appIconReducer(initialState, SystemAction.Applied(newIcon = newIcon))

        assertEquals(newIcon, result.currentAppIcon)
        assertEquals(null, result.userSelectedAppIcon)
        assertEquals(AppIconWarningDialog.None, result.warningDialogState)
    }

    @Test
    fun `GIVEN UpdateFailed system action WHEN reducer is called THEN the user selected icon resets to null and the dialog is hidden and the snackbar is shown`() {
        val newIcon = AppIcon.AppRetro2004
        val currentIcon = AppIcon.AppDefault
        val dialogState = AppIconWarningDialog.Presenting(newIcon)
        val initialState = AppIconState(
            currentAppIcon = currentIcon,
            userSelectedAppIcon = newIcon,
            warningDialogState = dialogState,
        )

        assertEquals(newIcon, initialState.userSelectedAppIcon)
        assertEquals(dialogState, initialState.warningDialogState)
        assertEquals(AppIconSnackbarState.None, initialState.snackbarState)

        val result = appIconReducer(
            initialState,
            SystemAction.UpdateFailed(oldIcon = currentIcon, newIcon = newIcon),
        )

        assertEquals(null, result.userSelectedAppIcon)
        assertEquals(AppIconWarningDialog.None, result.warningDialogState)
        assertEquals(
            AppIconSnackbarState.ApplyingNewIconError(
                oldIcon = currentIcon,
                newIcon = newIcon,
            ),
            result.snackbarState,
        )
    }

    @Test
    fun `GIVEN SnackbarDismissed system action WHEN reducer is called THEN the snackbar is hidden`() {
        val currentIcon = AppIcon.AppDefault
        val newIcon = AppIcon.AppRetro2004
        val initialState = AppIconState(
            currentAppIcon = currentIcon,
            snackbarState = AppIconSnackbarState.ApplyingNewIconError(
                oldIcon = currentIcon,
                newIcon = newIcon,
            ),
        )

        assertEquals(
            AppIconSnackbarState.ApplyingNewIconError(
                oldIcon = currentIcon,
                newIcon = newIcon,
            ),
            initialState.snackbarState,
        )

        val result = appIconReducer(initialState, SystemAction.SnackbarDismissed)

        assertEquals(AppIconSnackbarState.None, result.snackbarState)
    }
}
