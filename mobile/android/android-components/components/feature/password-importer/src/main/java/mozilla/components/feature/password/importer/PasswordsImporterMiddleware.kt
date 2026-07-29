/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.password.importer

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import mozilla.components.concept.passwords.file.PasswordsFileImporter
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import kotlin.time.Duration.Companion.seconds

/**
 * [Middleware] that handles side-effects for [PasswordsImporterAction]s.
 *
 * @param lifecycleScope [CoroutineScope] used to launch import work.
 */
class PasswordsImporterMiddleware(
    private val importer: PasswordsFileImporter,
    private val lifecycleScope: CoroutineScope,
) : Middleware<PasswordsImporterState, PasswordsImporterAction> {
    private var importJob: Job? = null

    override fun invoke(
        store: Store<PasswordsImporterState, PasswordsImporterAction>,
        next: (PasswordsImporterAction) -> Unit,
        action: PasswordsImporterAction,
    ) {
        next(action)
        when (action) {
            is PasswordsImporterAction.FileSelected -> {
                importJob = lifecycleScope.launch {
                    store.dispatch(PasswordsImporterAction.ImportStarted)

                    // We want to make sure we stay in the loading state for at least one second
                    // during an import to prevent the dialog from flashing before the user can
                    // comprehend what is currently happening.
                    val minimumWait = async { delay(1.seconds) }
                    val result = async { importer.importPasswordsFromUri(action.uri) }

                    awaitAll(minimumWait, result)

                    result.await()
                        .onFailure { store.dispatch(PasswordsImporterAction.ImportFailed) }
                        .onSuccess { store.dispatch(PasswordsImporterAction.ImportFinished(it.count)) }
                }
            }

            is PasswordsImporterAction.ImportCanceled -> {
                importJob?.cancel()
                importJob = null
            }

            PasswordsImporterAction.FileSelectionCanceled,
            PasswordsImporterAction.ImportStarted,
            PasswordsImporterAction.ViewAppeared,
            is PasswordsImporterAction.ImportFinished,
            PasswordsImporterAction.ImportFailed,
                -> Unit
        }
    }
}
