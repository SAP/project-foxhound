/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.emailmasks.middleware

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.settings.emailmasks.EmailMasksAction
import org.mozilla.fenix.settings.emailmasks.EmailMasksState
import org.mozilla.fenix.settings.emailmasks.EmailMasksSystemAction
import org.mozilla.fenix.settings.emailmasks.EmailMasksUserAction

/**
 * Middleware for handling persistence-related side effects for Email Masks settings screen.
 *
 * @param repository The [EmailMasksRepository] used to persist preferences.
 */
class EmailMasksPreferencesMiddleware(
    private val repository: EmailMasksRepository,
) : Middleware<EmailMasksState, EmailMasksAction> {
    /**
     * Refactor EmailMasksPreferencesMiddleware to use a repository instead of passing in a lambda.
     * https://bugzilla.mozilla.org/show_bug.cgi?id=2008596
     */
    override fun invoke(
        store: Store<EmailMasksState, EmailMasksAction>,
        next: (EmailMasksAction) -> Unit,
        action: EmailMasksAction,
    ) {
        next(action)

        when (action) {
            is EmailMasksUserAction.SuggestEmailMasksEnabled -> repository.setSuggestionEnabled(true)
            is EmailMasksUserAction.SuggestEmailMasksDisabled -> repository.setSuggestionEnabled(false)

            is EmailMasksSystemAction.LearnMoreTabOpened,
            is EmailMasksSystemAction.ManageTabOpened,
            is EmailMasksUserAction.LearnMoreClicked,
            is EmailMasksUserAction.ManageClicked,
                -> {
                // no-op
            }
        }
    }
}
