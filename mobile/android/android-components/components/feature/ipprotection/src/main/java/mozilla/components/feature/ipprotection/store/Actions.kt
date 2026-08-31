/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:OptIn(ExperimentalAndroidComponentsApi::class)

package mozilla.components.feature.ipprotection.store

import mozilla.components.ExperimentalAndroidComponentsApi
import mozilla.components.concept.engine.ipprotection.IPProtectionHandler
import mozilla.components.concept.engine.ipprotection.ServiceState
import mozilla.components.feature.ipprotection.store.state.AccountStatus
import mozilla.components.feature.ipprotection.store.state.EligibilityStatus
import mozilla.components.lib.state.Action

/**
 * Actions that can be dispatched to [IPProtectionStore].
 */
sealed class IPProtectionAction : Action {
    /**
     * Reports a change in whether the user qualifies for IP Protection.
     */
    data class EligibilityChanged(val eligibility: EligibilityStatus) : IPProtectionAction()

    /**
     * Reports a fresh snapshot from the GeckoView IP protection toolkit.
     */
    data class EngineStateChanged(val info: IPProtectionHandler.StateInfo) : IPProtectionAction()

    /**
     * Reports a change in whether the user is signed in to a Firefox Account.
     */
    data class AccountStateChanged(val state: AccountStatus) : IPProtectionAction()

    /**
     * Turns the IP Protection proxy either on/off - if the service requires an access token,
     * the account auth-flow is instantiated.
     */
    object Toggle : IPProtectionAction()

    /**
     * Reports that the proxy-active status has been shown to the user.
     */
    data object ProxyActiveShown : IPProtectionAction()

    /**
     * Reports that the most recent activate or deactivate request failed.
     */
    object ToggleFailed : IPProtectionAction()

    /**
     * Checks if an account has already been entitled. If so, this will lead to a token exchange that gives us a new
     * refresh token with increased scopes. If not, we do nothing.
     */
    object CheckAccount : IPProtectionAction()
}

/**
 * Internal actions that can be dispatched to [IPProtectionStore].
 */
internal sealed class InternalAction : IPProtectionAction() {
    /**
     * Reports a change in whether the user is signed in to a Firefox Account.
     */
    data class AccountManagerStateChanged(val status: AccountStatus) : InternalAction()

    /**
     * Reports that the account is ready to be used.
     */
    object AccountReadyForEnrollment : InternalAction()

    /**
     * Reports that the enrollment of the user has finished. They are now either entitled to use
     * IP protection feature or it errored out and they should try again.
     *
     * @property success Whether enrollment was successful or not.
     */
    data class FinishingEnrollment(val success: Boolean) : InternalAction()

    /**
     * Reports that the authentication flow has finished. It could have finished automatically via
     * successful authentication/authorization, or it could have been interrupted (canceled).
     */
    object FinishingAuthFlow : InternalAction()

    /**
     * Reports a change in whether the user qualifies for IP Protection.
     */
    data class EligibilityChanged(val eligibility: EligibilityStatus) : InternalAction()

    /**
     * Reports a change in new service state that happen from IP Protection.
     */
    data class UpdateServiceState(val serviceState: ServiceState) : InternalAction()

    /**
     * Puts the auth flow into an intermediary state while an incomplete authentication is occurring.
     */
    data class AwaitingAuth(val status: AccountStatus) : InternalAction()
}
