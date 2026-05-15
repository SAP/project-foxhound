/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.store

import org.mozilla.fenix.termsofuse.TOU_VERSION
import org.mozilla.fenix.utils.Settings
import org.mozilla.fenix.utils.Settings.Companion.FIVE_DAYS_MS
import org.mozilla.fenix.utils.Settings.Companion.THIRTY_SECONDS_MS

/**
 * Repository for preferences related to the terms of use bottom sheet.
 */
interface TermsOfUsePromptRepository {
    /**
     * Determines whether the Terms of Use prompt can be shown.
     *
     * @return `true` if the following conditions are met:
     *
     * - The user has not accepted the Terms of Use.
     * - The terms of use prompt feature flag is enabled.
     * - The prompt has not already been displayed the maximum number of times.
     */
    fun canShowTermsOfUsePrompt(): Boolean

    /**
     * Determines whether the user postponed accepting the Terms of Use and is within the cooldown
     * period.
     *
     * **Do not show the Terms of Use prompt if `true`.**
     *
     * @return `true` if the user postponed accepting the Terms of Use and is within the cooldown period.
     */
    fun userPostponedAndWithinCooldownPeriod(currentTimeMillis: Long): Boolean

    /**
     * Updates the Terms of Use related preferences when the user accepts the ToU.
     *
     *  @param nowMillis the current time in milliseconds.
     */
    fun updateHasAcceptedTermsOfUsePreference(nowMillis: Long = System.currentTimeMillis())

    /**
     * Updates the 'has postponed accepting terms of use' preference to true.
     */
    fun updateHasPostponedAcceptingTermsOfUsePreference()

    /**
     * Updates the 'last terms of use prompt time in millis' preference to the current time.
     *
     * @param currentTimeInMillis the current time in milliseconds.
     */
    fun updateLastTermsOfUsePromptTimeInMillis(currentTimeInMillis: Long = System.currentTimeMillis())

    /**
     * Increments the number of times the Terms of Use prompt has been displayed by 1.
     */
    fun incrementTermsOfUsePromptDisplayedCount()

    /**
     * A boolean to track if we are currently showing the terms of use bottom sheet prompt.
     * This is used when determining if we can show the prompt. We don't want to recreate
     * it if it is already showing.
     */
    var isShowingPrompt: Boolean
}

/**
 * Default implementation of [TermsOfUsePromptRepository].
 *
 * @param settings the preferences settings
 */
class DefaultTermsOfUsePromptRepository(
    private val settings: Settings,
) : TermsOfUsePromptRepository {

    override var isShowingPrompt = false

    override fun canShowTermsOfUsePrompt(): Boolean =
        !settings.hasAcceptedTermsOfService &&
                settings.isTermsOfUsePromptEnabled &&
                !hasExceededMaxDisplayCount() &&
                !isShowingPrompt

    override fun userPostponedAndWithinCooldownPeriod(currentTimeMillis: Long): Boolean {
        val durationSinceLastPrompt = currentTimeMillis - settings.lastTermsOfUsePromptTimeInMillis
        val durationBetweenPrompts = if (settings.isDebugTermsOfServiceTriggerTimeEnabled) {
            THIRTY_SECONDS_MS
        } else {
            FIVE_DAYS_MS
        }

        return settings.hasPostponedAcceptingTermsOfUse && (durationSinceLastPrompt < durationBetweenPrompts)
    }

    private fun hasExceededMaxDisplayCount(): Boolean =
        settings.termsOfUsePromptDisplayedCount >= settings.getTermsOfUseMaxDisplayCount()

    override fun updateHasAcceptedTermsOfUsePreference(nowMillis: Long) {
        settings.hasAcceptedTermsOfService = true
        settings.termsOfUseAcceptedVersion = TOU_VERSION
        settings.termsOfUseAcceptedTimeInMillis = nowMillis
    }

    override fun updateHasPostponedAcceptingTermsOfUsePreference() {
        settings.hasPostponedAcceptingTermsOfUse = true
    }

    override fun updateLastTermsOfUsePromptTimeInMillis(currentTimeInMillis: Long) {
        settings.lastTermsOfUsePromptTimeInMillis = currentTimeInMillis
    }

    override fun incrementTermsOfUsePromptDisplayedCount() {
        settings.termsOfUsePromptDisplayedCount++
    }
}
