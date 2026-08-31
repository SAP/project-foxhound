/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.labs.middleware

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.GleanMetrics.FirefoxLabs
import org.mozilla.fenix.settings.labs.store.DialogState
import org.mozilla.fenix.settings.labs.store.LabsAction
import org.mozilla.fenix.settings.labs.store.LabsState

/**
 * Middleware that records Firefox Labs telemetry for the [LabsAction]s dispatched to the Labs
 * store.
 */
class LabsTelemetryMiddleware : Middleware<LabsState, LabsAction> {

    override fun invoke(
        store: Store<LabsState, LabsAction>,
        next: (LabsAction) -> Unit,
        action: LabsAction,
    ) {
        when (action) {
            is LabsAction.UpdateLabsItems -> {
                if (action.items.isEmpty()) {
                    FirefoxLabs.emptyStateShown.record()
                }
            }
            is LabsAction.ToggleLabsItem -> {
                if (store.state.dialogState is DialogState.ToggleLabsItem) {
                    FirefoxLabs.toggledDialog.record(
                        FirefoxLabs.ToggledDialogExtra(
                            slugId = action.item.slug,
                            didUserConfirm = true,
                        ),
                    )
                }
            }
            is LabsAction.RestoreDefaults -> {
                FirefoxLabs.restoreDefaultsDialog.record(
                    FirefoxLabs.RestoreDefaultsDialogExtra(
                        itemsChangedCount = store.state.labsItems.count { it.enrolled },
                        didUserConfirm = true,
                    ),
                )
            }
            is LabsAction.ShowToggleLabsItemDialog -> {
                FirefoxLabs.toggleButtonPressed.record(
                    FirefoxLabs.ToggleButtonPressedExtra(
                        slugId = action.item.slug,
                        enabled = !action.item.enrolled,
                    ),
                )
            }
            is LabsAction.ShowRestoreDefaultsDialog -> {
                FirefoxLabs.restoreDefaultsButtonPressed.record()
            }
            is LabsAction.CloseDialog -> {
                // Inspect dialogState before next() so we see the dialog that is being closed.
                when (val dialog = store.state.dialogState) {
                    is DialogState.ToggleLabsItem -> {
                        FirefoxLabs.toggledDialog.record(
                            FirefoxLabs.ToggledDialogExtra(
                                slugId = dialog.item.slug,
                                didUserConfirm = false,
                            ),
                        )
                    }
                    is DialogState.RestoreDefaults -> {
                        FirefoxLabs.restoreDefaultsDialog.record(
                            FirefoxLabs.RestoreDefaultsDialogExtra(
                                itemsChangedCount = 0,
                                didUserConfirm = false,
                            ),
                        )
                    }
                    else -> Unit
                }
            }
            is LabsAction.ShareFeedbackClicked -> {
                FirefoxLabs.shareFeedbackOpened.record(
                    FirefoxLabs.ShareFeedbackOpenedExtra(
                        slugId = action.item.slug,
                    ),
                )
            }
            else -> Unit
        }

        next(action)
    }
}
