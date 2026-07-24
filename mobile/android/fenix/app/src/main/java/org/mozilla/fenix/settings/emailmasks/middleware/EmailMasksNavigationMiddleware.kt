/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.emailmasks.middleware

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.settings.SupportUtils
import org.mozilla.fenix.settings.SupportUtils.getGenericSumoURLForTopic
import org.mozilla.fenix.settings.emailmasks.EmailMasksAction
import org.mozilla.fenix.settings.emailmasks.EmailMasksState
import org.mozilla.fenix.settings.emailmasks.EmailMasksSystemAction
import org.mozilla.fenix.settings.emailmasks.EmailMasksUserAction

/**
 * Middleware for handling navigation-related side effects for Email Masks settings screen.
 *
 * @param openTab Function for opening a given URL in a new tab.
 * @param urlProvider Provides URLs for hyperlinks shown on the Email Masks settings screen.
 */
class EmailMasksNavigationMiddleware(
    private val openTab: (String) -> Unit,
    private val urlProvider: EmailMasksUrlProvider = DefaultEmailMasksUrlProvider(),
) : Middleware<EmailMasksState, EmailMasksAction> {

    override fun invoke(
        store: Store<EmailMasksState, EmailMasksAction>,
        next: (EmailMasksAction) -> Unit,
        action: EmailMasksAction,
    ) {
        next(action)

        when (action) {
            is EmailMasksUserAction.ManageClicked -> openTab(urlProvider.manageUrl())
            is EmailMasksUserAction.LearnMoreClicked -> openTab(urlProvider.learnMoreUrl())

            is EmailMasksUserAction.SuggestEmailMasksDisabled,
            is EmailMasksUserAction.SuggestEmailMasksEnabled,
            is EmailMasksSystemAction.ManageTabOpened,
            is EmailMasksSystemAction.LearnMoreTabOpened,
                -> {
                // no-op
            }
        }
    }
}

/**
 * Provides URLs for hyperlinks shown on the Email Masks settings screen.
 */
interface EmailMasksUrlProvider {
    /**
     * URL for managing Email Masks.
     */
    fun manageUrl(): String

    /**
     * URL for learning more about Email Masks.
     */
    fun learnMoreUrl(): String
}

private class DefaultEmailMasksUrlProvider : EmailMasksUrlProvider {
    override fun manageUrl(): String = SupportUtils.RELAY_MANAGE_URL
    override fun learnMoreUrl(): String = getGenericSumoURLForTopic(SupportUtils.SumoTopic.RELAY)
}
