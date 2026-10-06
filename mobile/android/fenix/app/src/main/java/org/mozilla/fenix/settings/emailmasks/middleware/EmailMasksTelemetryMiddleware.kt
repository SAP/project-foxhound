/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.emailmasks.middleware

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import mozilla.telemetry.glean.private.NoExtras
import org.mozilla.fenix.GleanMetrics.EmailMask
import org.mozilla.fenix.settings.emailmasks.EmailMasksAction
import org.mozilla.fenix.settings.emailmasks.EmailMasksState
import org.mozilla.fenix.settings.emailmasks.EmailMasksSystemAction
import org.mozilla.fenix.settings.emailmasks.EmailMasksUserAction

internal class EmailMasksTelemetryMiddleware :
    Middleware<EmailMasksState, EmailMasksAction> {

    override fun invoke(
        store: Store<EmailMasksState, EmailMasksAction>,
        next: (EmailMasksAction) -> Unit,
        action: EmailMasksAction,
    ) {
        next(action)

        when (action) {
            EmailMasksUserAction.SuggestEmailMasksEnabled -> {
                EmailMask.settingChanged.record(
                    EmailMask.SettingChangedExtra(
                        setting = "email_mask_suggestions",
                        enabled = true,
                    ),
                )
            }

            EmailMasksUserAction.SuggestEmailMasksDisabled -> {
                EmailMask.settingChanged.record(
                    EmailMask.SettingChangedExtra(
                        setting = "email_mask_suggestions",
                        enabled = false,
                    ),
                )
            }

            EmailMasksUserAction.LearnMoreClicked -> {
                EmailMask.learnMoreTapped.record(NoExtras())
            }

            EmailMasksUserAction.ManageClicked -> {
                EmailMask.manageTapped.record(NoExtras())
            }

            is EmailMasksSystemAction.ManageTabOpened,
            is EmailMasksSystemAction.LearnMoreTabOpened,
                -> Unit
        }
    }
}
