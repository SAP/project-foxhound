/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.crash.store

import android.text.format.DateUtils

private const val FIVE_DAYS_IN_MILLIS = DateUtils.DAY_IN_MILLIS * 5

/**
 * The [CrashState] reducer.
 */
fun crashReducer(
    state: CrashState,
    action: CrashAction,
): CrashState {
    return when (action) {
        CrashAction.Initialize,
        is CrashAction.CheckDeferred,
        is CrashAction.CheckForCrashes,
        is CrashAction.FinishCheckingForCrashes,
        -> state
        is CrashAction.RestoreDeferred -> if (action.now > action.until) {
            CrashState.Ready
        } else {
            CrashState.Deferred(until = action.until)
        }
        is CrashAction.Defer -> CrashState.Deferred(action.now + FIVE_DAYS_IN_MILLIS)
        is CrashAction.ShowPrompt -> CrashState.Reporting(action.crashIDs)
        is CrashAction.PromptShown -> CrashState.Idle
        CrashAction.CancelTapped,
        CrashAction.CancelForEverTapped,
        is CrashAction.ReportTapped,
        -> CrashState.Done
    }
}
