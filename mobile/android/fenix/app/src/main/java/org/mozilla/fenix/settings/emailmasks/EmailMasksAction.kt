/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.emailmasks

import mozilla.components.lib.state.Action

/**
 * Marker interface for all Email Masks actions.
 */
sealed interface EmailMasksAction : Action

/**
 * User-initiated actions from the Email Masks settings UI.
 */
sealed interface EmailMasksUserAction : EmailMasksAction {

    /**
     * User enabled the email mask suggestion.
     */
    object SuggestEmailMasksEnabled : EmailMasksUserAction

    /**
     * User disabled the email mask suggestion.
     */
    object SuggestEmailMasksDisabled : EmailMasksUserAction

    /**
     * User clicked "Manage email masks".
     */
    object ManageClicked : EmailMasksUserAction

    /**
     * User clicked "Learn more".
     */
    object LearnMoreClicked : EmailMasksUserAction
}

/**
 * System-driven actions for the Email Masks settings UI.
 */
sealed interface EmailMasksSystemAction : EmailMasksAction {

    /**
     * The manage page has been opened.
     */
    data object ManageTabOpened : EmailMasksSystemAction

    /**
     * The learn more page has been opened.
     */
    data object LearnMoreTabOpened : EmailMasksSystemAction
}
