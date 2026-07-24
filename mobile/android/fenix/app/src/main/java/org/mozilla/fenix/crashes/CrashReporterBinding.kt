/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.crashes

import android.content.Context
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChangedBy
import mozilla.components.lib.crash.store.CrashState
import mozilla.components.lib.state.helpers.AbstractBinding
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppState

/**
 * A binding for observing the [CrashState] in the [AppStore] and displaying the crash reporter.
 *
 * @param context The [Context] used to open links via Intents.
 * @param store The [AppStore] used to observe the [CrashState].
 * @param onReporting a callback that is called when [CrashState] is [CrashState.Reporting].
 * @param mainDispatcher The [CoroutineDispatcher] on which the state observation and updates will occur.
 *                       Defaults to [Dispatchers.Main].
 */
class CrashReporterBinding(
    private val context: Context,
    store: AppStore,
    private val onReporting: (List<String>?, Context) -> Unit,
    mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
) : AbstractBinding<AppState>(store, mainDispatcher) {
    override suspend fun onState(flow: Flow<AppState>) {
        flow.distinctUntilChangedBy { state -> state.crashState }
            .collect { state ->
                if (state.crashState is CrashState.Reporting) {
                    onReporting(state.crashState.crashIDs, context)
                }
            }
    }
}
