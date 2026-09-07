/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.crash.store

/**
 * Actions for running the crash reporter.
 */
sealed class CrashAction {
    /**
     * [CrashAction] to initialize the crash reporter.
     */
    data object Initialize : CrashAction()

    /**
     * [CrashAction] to check if we have a stored deferred value.
     *
     * @param crashIds An list of crash IDs that are being requested for pull.
     */
    data class CheckDeferred(val crashIds: List<String> = listOf()) : CrashAction()

    /**
     * [CrashAction] to restore a stored deferred value.
     */
    data class RestoreDeferred(
        val now: TimeInMillis,
        val until: TimeInMillis,
        val crashIds: List<String> = listOf(),
    ) : CrashAction()

    /**
     * [CrashAction] to check if we have any unsent crashes.
     */
    data class CheckForCrashes(val crashIds: List<String> = listOf()) : CrashAction()

    /**
     * [CrashAction] to return the result of [CheckForCrashes].
     */
    data class FinishCheckingForCrashes(
        val hasUnsentCrashes: Boolean,
        val crashIds: List<String> = listOf(),
    ) : CrashAction()

    /**
     * [CrashAction] to defer sending crashes until some point in the future.
     */
    data class Defer(val now: TimeInMillis) : CrashAction()

    /**
     * [CrashAction] show the user a prompt to send unsent crashes.
     */
    data class ShowPrompt(val crashIDs: List<String> = listOf()) : CrashAction()

    /**
     * [CrashAction] to update the state when the prompt is now displayed.
     */
    data object PromptShown : CrashAction()

    /**
     * [CrashAction] to send when a user taps the cancel button.
     */
    data object CancelTapped : CrashAction()

    /**
     * [CrashAction] to record a setting and a pref that the user does not want
     * to see the Remote Settings crash dialog.
     */
    data object CancelForEverTapped : CrashAction()

    /**
     * [CrashAction] to send when a user taps the send report button.
     */
    data class ReportTapped(val automaticallySendChecked: Boolean, val crashIDs: List<String>) : CrashAction()
}
