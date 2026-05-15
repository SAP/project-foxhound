/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.logins.ui

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import mozilla.telemetry.glean.private.NoExtras
import org.mozilla.fenix.GleanMetrics.Logins

internal class LoginsTelemetryMiddleware : Middleware<LoginsState, LoginsAction> {

    override fun invoke(
        store: Store<LoginsState, LoginsAction>,
        next: (LoginsAction) -> Unit,
        action: LoginsAction,
    ) {
        next(action)
        when (action) {
            is LoginClicked -> {
                Logins.managementLoginsTapped.record(NoExtras())
                Logins.openIndividualLogin.record(NoExtras())
            }
            AddLoginAction.InitAdd -> {
                Logins.managementAddTapped.record(NoExtras())
            }
            AddLoginAction.AddLoginSaveClicked -> {
                Logins.saved.add()
            }
            is DetailLoginAction.CopyPasswordClicked -> {
                Logins.copyLogin.record(NoExtras())
            }
            is DetailLoginAction.CopyUsernameClicked -> {
                Logins.copyLogin.record(NoExtras())
            }
            is DetailLoginAction.PasswordVisibilityChanged -> {
                if (action.isPasswordVisible) {
                    Logins.viewPasswordLogin.record(NoExtras())
                }
            }
            is DetailLoginMenuAction.EditLoginMenuItemClicked -> {
                Logins.openLoginEditor.record(NoExtras())
            }
            is EditLoginAction.PasswordVisibilityChanged -> {
                if (action.isPasswordVisible) {
                    Logins.viewPasswordLogin.record(NoExtras())
                }
            }
            is EditLoginAction.SaveEditClicked -> {
                Logins.saveEditedLogin.record(NoExtras())
                Logins.modified.add()
            }
            LoginDeletionDialogAction.DeleteTapped -> {
                Logins.deleteSavedLogin.record(NoExtras())
                Logins.deleted.add()
            }
            is AddLoginAction.HostChanged,
            is AddLoginAction.PasswordChanged,
            is AddLoginAction.UsernameChanged,
            AddLoginBackClicked,
            is DetailLoginAction.GoToSiteClicked,
            is DetailLoginMenuAction.DeleteLoginMenuItemClicked,
            is EditLoginAction.PasswordChanged,
            is EditLoginAction.UsernameChanged,
            EditLoginBackClicked,
            LearnMoreAboutSync,
            LoginDeletionDialogAction.CancelTapped,
            LoginsDetailBackClicked,
            LoginsListAppeared,
            LoginsListBackClicked,
            LoginsListSortMenuAction.OrderByLastUsedClicked,
            LoginsListSortMenuAction.OrderByNameClicked,
            is LoginsLoaded,
            is SearchLogins,
                -> Unit
        }
    }
}
