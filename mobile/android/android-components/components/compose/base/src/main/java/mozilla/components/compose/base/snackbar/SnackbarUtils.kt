/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.snackbar

import android.annotation.SuppressLint
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val DEFAULT_SNACKBAR_TIMEOUT = 3000L
private const val DEFAULT_SNACKBAR_WITH_ACTION_TIMEOUT = 5000L
private const val ACCESSIBLE_SNACKBAR_TIMEOUT = 20000L

/**
 * Displays a Snackbar with an optional action for a custom timeout duration.
 *
 * @param message The message to be displayed in the Snackbar.
 * @param actionLabel The optional label for the Snackbar's action button (e.g., "Undo").
 * @param withDismissAction The boolean to show a dismiss action in the Snackbar.
 * @param timeout Timeout duration to show the Snackbar before dismissing it.
 * @param onActionPerformed Callback invoked when the action is clicked before dismissal.
 * @param onDismissPerformed Callback invoked when Snackbar is dismissed.
 */
@SuppressLint("DisallowedDirectShowSnackbarCall")
suspend fun SnackbarHostState.displaySnackbar(
    message: String,
    actionLabel: String? = null,
    withDismissAction: Boolean = false,
    timeout: SnackbarTimeout = if (actionLabel != null) SnackbarTimeout.Action else SnackbarTimeout.Default,
    onActionPerformed: suspend () -> Unit = {},
    onDismissPerformed: suspend () -> Unit = {},
) = withDismiss(timeout, onActionPerformed, onDismissPerformed) {
    showSnackbar(
        message = message,
        actionLabel = actionLabel,
        withDismissAction = withDismissAction,
        duration = SnackbarDuration.Indefinite,
    )
}

/**
 * Displays a Snackbar, given SnackbarVisuals, with an optional action for a timeout duration.
 *
 * @param visuals [SnackbarVisuals] that are used to create a Snackbar
 * @param timeout Timeout duration to show the Snackbar before dismissing it.
 * @param onActionPerformed Callback invoked when the action is clicked before dismissal.
 * @param onDismissPerformed Callback invoked when Snackbar is dismissed.
 */
@SuppressLint("DisallowedDirectShowSnackbarCall")
suspend fun SnackbarHostState.displaySnackbar(
    visuals: SnackbarVisuals,
    timeout: SnackbarTimeout = visuals.toSnackbarTimeout(),
    onActionPerformed: suspend () -> Unit = {},
    onDismissPerformed: suspend () -> Unit = {},
) = withDismiss(timeout, onActionPerformed, onDismissPerformed) {
    showSnackbar(visuals = visuals.copy(duration = SnackbarDuration.Indefinite))
}

/**
 * Helper function that displays a Snackbar via [displaySnackbar] and dismisses it after [timeout].
 *
 * @param timeout Timeout duration to show the Snackbar before dismissing it.
 * @param onActionPerformed Callback invoked when the action is clicked before dismissal.
 * @param onDismissPerformed Callback invoked when Snackbar is dismissed.
 * @param displaySnackbar A suspending block that displays the Snackbar and returns its [SnackbarResult].
 */
private suspend fun SnackbarHostState.withDismiss(
    timeout: SnackbarTimeout,
    onActionPerformed: suspend () -> Unit = {},
    onDismissPerformed: suspend () -> Unit = {},
    displaySnackbar: suspend SnackbarHostState.() -> SnackbarResult,
) {
    if (timeout is SnackbarTimeout.Indefinite) {
        val result = displaySnackbar()
        if (result == SnackbarResult.ActionPerformed) onActionPerformed()
        return
    }

    coroutineScope {
        val autoDismissJob = launch {
            delay(timeout.value)
            currentSnackbarData?.dismiss()
        }

        val result = displaySnackbar()

        autoDismissJob.cancel()

        if (result == SnackbarResult.ActionPerformed) {
            onActionPerformed()
        } else if (result == SnackbarResult.Dismissed) {
            onDismissPerformed()
        }
    }
}

/**
 * Represents the duration a Snackbar should remain visible before dismissal.
 *
 * @property value The actual timeout duration.
 */
sealed class SnackbarTimeout(open val value: Long) {
    /**
     * The standard timeout for most users if no Snackbar action is available.
     */
    data object Default : SnackbarTimeout(DEFAULT_SNACKBAR_TIMEOUT)

    /**
     * The standard timeout if a Snackbar action is available.
     */
    data object Action : SnackbarTimeout(DEFAULT_SNACKBAR_WITH_ACTION_TIMEOUT)

    /**
     * A longer timeout used when accessibility services are enabled.
     */
    data object Accessible : SnackbarTimeout(ACCESSIBLE_SNACKBAR_TIMEOUT)

    /**
     * Display the Snackbar indefinitely until explicitly dismissed or action is clicked.
     */
    data object Indefinite : SnackbarTimeout(Long.MAX_VALUE)

    /**
     * A custom timeout that defaults to at least [Default] if a shorter value is provided.
     *
     * @param value The requested timeout duration.
     */
    class Custom(value: Long) : SnackbarTimeout(
        if (value < Default.value) Default.value else value,
    )
}

/**
 * Given [SnackbarVisuals], converts its duration into a corresponding [SnackbarTimeout].
 *
 * @return A [SnackbarTimeout] representing the desired dismissal behavior.
 */
fun SnackbarVisuals.toSnackbarTimeout(): SnackbarTimeout = when {
    duration == SnackbarDuration.Short || duration == SnackbarDuration.Long ->
        if (actionLabel != null) SnackbarTimeout.Action else SnackbarTimeout.Default
    else -> SnackbarTimeout.Indefinite
}
