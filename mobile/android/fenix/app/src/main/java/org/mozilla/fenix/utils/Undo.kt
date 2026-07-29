/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.utils

import android.content.Context
import android.view.View
import androidx.compose.material3.SnackbarHostState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import mozilla.components.compose.base.snackbar.SnackbarTimeout
import mozilla.components.compose.base.snackbar.displaySnackbar
import org.mozilla.fenix.compose.core.Action
import org.mozilla.fenix.compose.snackbar.Snackbar
import org.mozilla.fenix.compose.snackbar.SnackbarState
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Get the recommended time an "undo" action should be available until it can automatically be
 * dismissed. The delay may be different based on the accessibility settings of the device.
 *
 * @return The undo delay as a [Long] in milliseconds.
 */
fun Settings.getUndoDelay(): Long {
    return if (accessibilityServicesEnabled) {
        SnackbarTimeout.Accessible.value
    } else {
        SnackbarTimeout.Action.value
    }
}

/**
 * Get the recommended [SnackbarTimeout] a Snackbar should be displayed for.
 * The timeout may be different based on the accessibility settings of the device.
 *
 * @return The undo delay as a [SnackbarTimeout].
 */
fun Settings.getSnackbarTimeout(hasAction: Boolean = false): SnackbarTimeout {
    return if (accessibilityServicesEnabled) {
        SnackbarTimeout.Accessible
    } else if (hasAction) {
        SnackbarTimeout.Action
    } else {
        SnackbarTimeout.Default
    }
}

/**
 * Runs [operation] after giving user time (see [Settings.getUndoDelay]) to cancel it.
 * In case of cancellation, [onCancel] is executed.
 *
 * Execution of suspend blocks happens on [Dispatchers.Main].
 *
 * @param view A [View] used to determine a parent for the [Snackbar].
 * @param settings [Settings] used to determine delay.
 * @param message A message displayed as part of [Snackbar].
 * @param undoActionTitle Label for the action associated with the [Snackbar].
 * @param onCancel A suspend block to execute in case of cancellation.
 * @param operation A suspend block to execute if user doesn't cancel via the displayed [Snackbar].
 * @param anchorView A [View] to which [Snackbar] should be anchored.
 * @param elevation The elevation of the [Snackbar].
 */
fun CoroutineScope.allowUndo(
    view: View,
    settings: Settings,
    message: String,
    undoActionTitle: String,
    onCancel: suspend () -> Unit = {},
    operation: suspend (context: Context) -> Unit,
    anchorView: View? = null,
    elevation: Float? = null,
) {
    // By using an AtomicBoolean, we achieve memory effects of reading and
    // writing a volatile variable.
    val requestedUndo = AtomicBoolean(false)

    @Suppress("ComplexCondition")
    fun showUndoSnackbar() {
        val snackbar = Snackbar
            .make(
                snackBarParentView = view,
                snackbarState = SnackbarState(
                    message = message,
                    duration = SnackbarState.Duration.Preset.Indefinite,
                    action = Action(
                        label = undoActionTitle,
                        onClick = {
                            requestedUndo.set(true)
                            launch {
                                onCancel.invoke()
                            }
                        },
                    ),
                    onDismiss = {
                        launch {
                            if (!requestedUndo.get()) {
                                operation.invoke(view.context)
                            }
                        }
                    },
                ),
            )
            .setAnchorView(anchorView)

        elevation?.also {
            snackbar.view.elevation = it
        }

        snackbar.show()

        // Wait a bit, and if user didn't request cancellation, proceed with
        // requested operation and hide the snackbar.
        launch {
            delay(settings.getUndoDelay())

            if (!requestedUndo.get()) {
                snackbar.dismiss()
                operation.invoke(view.context)
            }
        }
    }

    showUndoSnackbar()
}

/**
 * Compose variant of [allowUndo] that displays an undo snackbar via [SnackbarHostState].
 *
 * @param snackbarHostState The [SnackbarHostState] to display the snackbar in.
 * @param message A message displayed as part of the snackbar.
 * @param undoActionTitle Label for the undo action.
 * @param onCancel A suspend block to execute when the user taps the undo action.
 * @param operation A suspend block to execute if user doesn't cancel via the displayed [Snackbar].
 * @param undoDelay The delay before auto-dismissing.
 */
fun CoroutineScope.allowUndo(
    snackbarHostState: SnackbarHostState,
    message: String,
    undoActionTitle: String,
    onCancel: suspend () -> Unit = {},
    operation: suspend () -> Unit,
    undoDelay: Long,
) {
    launch {
        snackbarHostState.displaySnackbar(
            message = message,
            actionLabel = undoActionTitle,
            timeout = SnackbarTimeout.Custom(undoDelay),
            onActionPerformed = onCancel,
            onDismissPerformed = operation,
        )
    }
}
