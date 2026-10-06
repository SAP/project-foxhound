/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.ui.widgets

import android.view.View
import androidx.compose.ui.text.style.TextOverflow
import com.google.android.material.snackbar.Snackbar

/**
 * Delegate to display a snackbar.
 */
interface SnackbarDelegate {
    /**
     * Displays a snackbar.
     *
     * @param snackBarParentView The view to find a parent from for displaying the Snackbar.
     * @param text The text to show. Can be formatted text.
     * @param subText The optional sub-text to show.
     * @property subTextOverflow Defines how visual overflow of the [subText] should be handled.
     * @param duration How long to display the message.
     * @param isError Whether the snackbar should be styled as an error.
     * @param action String resource to display for the action.
     * @param withDismissAction Whether to display a dismiss button.
     * @param listener callback to be invoked when the action is clicked.
     */
    fun show(
        snackBarParentView: View,
        text: Int,
        subText: String? = null,
        subTextOverflow: TextOverflow? = null,
        duration: Int,
        isError: Boolean = false,
        action: Int = 0,
        withDismissAction: Boolean = false,
        listener: ((v: View) -> Unit)? = null,
    )

    /**
     * Displays a snackbar.
     *
     * @param snackBarParentView The view to find a parent from for displaying the Snackbar.
     * @param text The text to show.
     * @param subText The optional sub-text to show.
     * @property subTextOverflow Defines how visual overflow of the [subText] should be handled.
     * @param duration How long to display the message.
     * @param isError Whether the snackbar should be styled as an error.
     * @param action Text of the optional action.
     * The [listener] must also be provided to show an action button.
     * @param withDismissAction Whether to display a dismiss button.
     * @param listener callback to be invoked when the action is clicked.
     * An [action] must also be provided to show an action button.
     */
    fun show(
        snackBarParentView: View,
        text: String,
        subText: String? = null,
        subTextOverflow: TextOverflow? = null,
        duration: Int,
        isError: Boolean = false,
        action: String? = null,
        withDismissAction: Boolean = false,
        listener: ((v: View) -> Unit)? = null,
    )
}

/**
 * Default implementation for [SnackbarDelegate]. Will display a standard default Snackbar.
 */
class DefaultSnackbarDelegate : SnackbarDelegate {
    override fun show(
        snackBarParentView: View,
        text: String,
        subText: String?,
        subTextOverflow: TextOverflow?,
        duration: Int,
        isError: Boolean,
        action: String?,
        withDismissAction: Boolean,
        listener: ((v: View) -> Unit)?,
    ) {
        val snackbar = Snackbar.make(
            snackBarParentView,
            text,
            duration,
        )

        if (action != null && listener != null) {
            snackbar.setAction(action) { view -> listener.invoke(view) }
        }

        snackbar.show()
    }

    override fun show(
        snackBarParentView: View,
        text: Int,
        subText: String?,
        subTextOverflow: TextOverflow?,
        duration: Int,
        isError: Boolean,
        action: Int,
        withDismissAction: Boolean,
        listener: ((v: View) -> Unit)?,
    ) = show(
        snackBarParentView = snackBarParentView,
        text = snackBarParentView.context.getString(text),
        subText = subText,
        subTextOverflow = subTextOverflow,
        duration = duration,
        isError = isError,
        action = if (action == 0) null else snackBarParentView.context.getString(action),
        listener = listener,
    )
}
