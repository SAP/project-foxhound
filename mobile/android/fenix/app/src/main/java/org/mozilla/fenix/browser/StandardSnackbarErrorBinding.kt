/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser

import android.view.ViewGroup
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.map
import mozilla.components.lib.state.helpers.AbstractBinding
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.compose.core.Action
import org.mozilla.fenix.compose.snackbar.Snackbar
import org.mozilla.fenix.compose.snackbar.SnackbarFactory
import org.mozilla.fenix.compose.snackbar.SnackbarState

/**
 * A binding that shows standard snackbar errors.
 *
 * @param snackbarParent [ViewGroup] in which to find a suitable parent for displaying the snackbar.
 * @param appStore The [AppStore] containing information about when to show a snackbar styled for errors.
 * @param snackbarFactory The [SnackbarFactory] used to create the snackbar.
 * @param dismissLabel The label for the dismiss action on the snackbar.
 * @param mainDispatcher The [CoroutineDispatcher] on which the state observation and updates will occur.
 *                       Defaults to [Dispatchers.Main].
 */
class StandardSnackbarErrorBinding(
    private val snackbarParent: ViewGroup,
    private val appStore: AppStore,
    private val snackbarFactory: SnackbarFactory,
    private val dismissLabel: String,
    mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
) : AbstractBinding<AppState>(appStore, mainDispatcher) {

    override suspend fun onState(flow: Flow<AppState>) {
        flow.map { state -> state.standardSnackbarError }
            .distinctUntilChanged()
            .filterNotNull()
            .collect { standardSnackbarError ->
                createErrorSnackbar(standardSnackbarError).show()
            }
    }

    /**
     * Creates a snackbar for displaying an error message.
     *
     * @param error The [StandardSnackbarError] containing the error message to display.
     * @return A [Snackbar] configured to display the error.
     */
    private fun createErrorSnackbar(error: StandardSnackbarError): Snackbar {
        val snackbarState = SnackbarState(
            message = error.message,
            duration = SnackbarState.Duration.Preset.Indefinite,
            type = SnackbarState.Type.Warning,
            action = Action(
                label = dismissLabel,
                onClick = {
                    appStore.dispatch(
                        AppAction.UpdateStandardSnackbarErrorAction(standardSnackbarError = null),
                    )
                },
            ),
        )
        return snackbarFactory.make(snackbarParent, snackbarState)
    }
}

/**
 * Standard Snackbar Error data class.
 *
 * @property message that will appear on the snackbar.
 */
data class StandardSnackbarError(
    val message: String,
)
