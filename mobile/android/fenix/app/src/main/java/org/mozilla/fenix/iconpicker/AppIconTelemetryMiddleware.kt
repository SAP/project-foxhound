/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.iconpicker

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.GleanMetrics.AppIconSelection

/**
 * A middleware for handling the app icon selector feature telemetry.
 */
class AppIconTelemetryMiddleware : Middleware<AppIconState, AppIconAction> {
    override fun invoke(
        store: Store<AppIconState, AppIconAction>,
        next: (AppIconAction) -> Unit,
        action: AppIconAction,
    ) {
        next(action)

        when (action) {
            is UserAction.Confirmed -> {
                AppIconSelection.appIconSelectionConfirmed.record(
                    extra = AppIconSelection.AppIconSelectionConfirmedExtra(
                        oldIcon = action.oldIcon.aliasSuffix,
                        newIcon = action.newIcon.aliasSuffix,
                    ),
                )
            }
            is SystemAction.SnackbarShown -> {
                AppIconSelection.errorSnackbarShown.record(
                    extra = AppIconSelection.ErrorSnackbarShownExtra(
                        oldIcon = action.oldIcon.aliasSuffix,
                        newIcon = action.newIcon.aliasSuffix,
                    ),
                )
            }
            is UserAction.Dismissed,
            is UserAction.Selected,
            is SystemAction.Applied,
            is SystemAction.DialogDismissed,
            is SystemAction.SnackbarDismissed,
            is SystemAction.UpdateFailed,
                -> {
                // no-op
            }
        }
    }
}
