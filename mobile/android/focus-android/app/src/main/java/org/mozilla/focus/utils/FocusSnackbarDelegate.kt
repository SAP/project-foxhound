/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.utils

import android.view.View
import androidx.compose.ui.text.style.TextOverflow
import mozilla.components.ui.widgets.SnackbarDelegate

class FocusSnackbarDelegate(private val view: View) : SnackbarDelegate {

    override fun show(
        snackBarParentView: View,
        text: Int,
        subText: String?,
        subTextOverflow: TextOverflow?,
        duration: Int,
        isError: Boolean,
        action: Int,
        withDismissAction: Boolean,
        listener: ((View) -> Unit)?,
    ) = show(
        snackBarParentView = snackBarParentView,
        text = snackBarParentView.context.getString(text),
        subText = subText,
        duration = duration,
        action = if (action == 0) null else snackBarParentView.context.getString(action),
        withDismissAction = withDismissAction,
        listener = listener,
    )

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
        if (listener != null && action != null) {
            FocusSnackbar.make(
                view = view,
                duration = FocusSnackbar.LENGTH_LONG,
            )
                .setText(text)
                .setAction(action) { listener.invoke(view) }
                .show()
        } else {
            FocusSnackbar.make(
                view,
                duration = FocusSnackbar.LENGTH_SHORT,
            )
                .setText(text)
                .show()
        }
    }
}
