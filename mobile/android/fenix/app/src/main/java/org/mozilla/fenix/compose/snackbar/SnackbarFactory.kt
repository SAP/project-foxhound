/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.compose.snackbar

import android.view.View

/**
 * A factory for creating [Snackbar] instances.
 * This interface can be implemented to customize the creation of Snackbars,
 * for example, to use a different Snackbar implementation or to add custom logic
 * during Snackbar creation.
 */
fun interface SnackbarFactory {
    /**
     * Creates a [Snackbar] instance.
     *
     * @param snackBarParentView The parent view for the Snackbar.
     * @param snackbarState The state of the Snackbar, containing information like the message, action, and duration.
     * @return A [Snackbar] instance.
     */
    fun make(
        snackBarParentView: View,
        snackbarState: SnackbarState,
    ): Snackbar
}

/**
 * Default implementation of [SnackbarFactory].
 */
class DefaultSnackbarFactory : SnackbarFactory {
    /**
     * Creates a [Snackbar] instance.
     *
     * @param snackBarParentView The parent view for the Snackbar.
     * @param snackbarState The state of the Snackbar, containing the message, action, and duration.
     * @return A new [Snackbar] instance.
     */
    override fun make(
        snackBarParentView: View,
        snackbarState: SnackbarState,
    ): Snackbar {
        return Snackbar.make(
            snackBarParentView = snackBarParentView,
            snackbarState = snackbarState,
        )
    }
}
