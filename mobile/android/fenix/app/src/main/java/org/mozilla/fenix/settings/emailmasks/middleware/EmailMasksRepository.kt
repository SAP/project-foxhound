/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.emailmasks.middleware

import org.mozilla.fenix.utils.Settings

/**
 * The repository for managing Email Masks preferences.
 */
interface EmailMasksRepository {
    /**
     * Returns whether email mask suggestions are enabled.
     *
     * @return `true` if email mask suggestions are enabled, otherwise `false`.
     */
    fun isSuggestionEnabled(): Boolean

    /**
     * Updates the state of the email mask suggestion toggle.
     */
    fun setSuggestionEnabled(enabled: Boolean)

    /**
     * Checks if the Email Mask Continuous Feature Recommendation (CFR) should be displayed.
     *
     * @return Returns `true` if the user should see the CFR prompt.
     */
    fun shouldShowCfr(): Boolean

    /**
     * Dismisses the Email Mask Continuous Feature Recommendation (CFR) and ensures it won't be shown again.
     */
    fun dismissCfr()
}

/**
 * The default implementation of [EmailMasksRepository].
 */
class DefaultEmailMasksRepository(
    private val settings: Settings,
) : EmailMasksRepository {

    override fun isSuggestionEnabled(): Boolean = settings.isEmailMaskSuggestionEnabled

    override fun setSuggestionEnabled(enabled: Boolean) {
        settings.isEmailMaskSuggestionEnabled = enabled
    }

    override fun shouldShowCfr(): Boolean = settings.shouldShowEmailMaskCfr

    override fun dismissCfr() {
        settings.shouldShowEmailMaskCfr = false
    }
}
