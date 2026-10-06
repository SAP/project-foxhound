/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.prompts.emailmask

import mozilla.components.feature.prompts.concept.EmailMaskPromptView

/**
 * Delegate to display the email mask prompt.
 */
interface EmailMaskDelegate {

    /**
     * The [EmailMaskPromptView] used for [EmailMaskPromptViewListener] to display a simple prompt.
     */
    val emailMaskPromptViewListenerView: EmailMaskPromptView?
        get() = null

    /**
     * Whether to show the email mask CFR.
     */
    fun shouldShowEmailMaskCfr(): Boolean

    /**
     * Called when the email mask CFR is dismissed.
     */
    fun onEmailMaskCfrDismissed()

    /**
     * Invoked when user clicks on "Email masks".
     *
     * @param generatedFor The website for which the address is generated.
     */
    suspend fun onEmailMaskClick(generatedFor: String): String?
}
