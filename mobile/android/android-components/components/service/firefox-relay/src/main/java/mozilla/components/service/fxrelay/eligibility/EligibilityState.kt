/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxrelay.eligibility

import mozilla.components.lib.state.Action
import mozilla.components.lib.state.State
import mozilla.components.service.fxrelay.EmailMask

/**
 * Sentinel value indicating that the Relay entitlement cache
 * has never been established (i.e., eligibility has never been checked).
 */
internal const val NO_ENTITLEMENT_CHECK_YET_MS = 0L

/**
 * Relay eligibility states.
 */
sealed interface EligibilityState

/**
 * The user is not eligible to use Firefox Relay.
 */
sealed interface Ineligible : EligibilityState {
    /**
     * The user is not logged into FxA and cannot access any Firefox Relay features.
     */
    data object FirefoxAccountNotLoggedIn : Ineligible

    /**
     * The user is logged into FxA but does not have a Relay-enabled FxA account.
     */
    data object NoRelay : Ineligible
}

/**
 * The user is eligible to use Firefox Relay.
 */
sealed interface Eligible : EligibilityState {
    /**
     * The user has access to the free tier of Firefox Relay.
     *
     * @property totalMasksUsed The number of free Relay email masks the user has.
     */
    data class Free(val totalMasksUsed: Int) : Eligible

    /**
     * The user has an active Firefox Relay Premium subscription, with
     * access to unlimited Relay masks.
     */
    data object Premium : Eligible
}

/**
 * State stored by the feature to drive UI and decisions.
 */
data class RelayState(
    val eligibilityState: EligibilityState = Ineligible.FirefoxAccountNotLoggedIn,
    val lastEntitlementCheckMs: Long = NO_ENTITLEMENT_CHECK_YET_MS,
    val lastUsed: EmailMask? = null,
) : State

/**
 * Actions that can trigger Relay state transitions.
 */
sealed interface RelayEligibilityAction : Action {
    /**
     * Re-evaluate eligibility after the app enters the foreground.
     */
    data class AccountLoginStatusChanged(val isLoggedIn: Boolean) : RelayEligibilityAction

    /**
     * Fired when the user's Firefox Account profile information has been updated.
     */
    data object AccountProfileUpdated : RelayEligibilityAction

    /**
     * Eligibility cache TTL has expired and should be refreshed.
     *
     * @param nowMs Current system time in milliseconds when TTL expired.
     */
    data class TtlExpired(val nowMs: Long) : RelayEligibilityAction

    /**
     * The last used email mask provided to the embedder for form autofill.
     *
     * @param emailMask the email address.
     */
    data class UpdateLastUsed(val emailMask: EmailMask?) : RelayEligibilityAction

    /**
     * Result of a Relay status fetch.
     *
     * @param fetchSucceeded Whether the fetch succeeded.
     * @param relayPlanTier The user’s plan, or NONE if unavailable.
     * @param totalMasksUsed The number of free Relay email masks the user has.
     * @param lastCheckedMs Stores the timestamp for when the last check was performed.
     */
    data class RelayStatusResult(
        val fetchSucceeded: Boolean,
        val relayPlanTier: RelayPlanTier?,
        val totalMasksUsed: Int,
        val lastCheckedMs: Long,
    ) : RelayEligibilityAction
}

/**
 * Relay subscription plan tier.
 */
enum class RelayPlanTier { NONE, FREE, PREMIUM }
