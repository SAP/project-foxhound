/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:OptIn(ExperimentalAndroidComponentsApi::class)

package mozilla.components.feature.ipprotection.store

import mozilla.components.ExperimentalAndroidComponentsApi
import mozilla.components.concept.engine.ipprotection.IPProtectionHandler
import mozilla.components.concept.engine.ipprotection.ServiceState
import mozilla.components.feature.ipprotection.store.state.AccountStatus
import mozilla.components.feature.ipprotection.store.state.Authorized
import mozilla.components.feature.ipprotection.store.state.IPProtectionState
import mozilla.components.feature.ipprotection.store.state.ProxyStatus
import mozilla.components.feature.ipprotection.store.state.Uninitialized

@Suppress("CognitiveComplexMethod", "LongMethod", "ForbiddenSuppress")
// FIXME(IPP) break this up into more smaller parts only if the changes are meaningful.
internal fun iPProtectionReducer(
    state: IPProtectionState,
    action: IPProtectionAction,
): IPProtectionState = when (action) {
    is IPProtectionAction.EligibilityChanged -> {
        state.copy(eligibilityStatus = action.eligibility)
    }

    is IPProtectionAction.EngineStateChanged -> {
        val newProxyStatus = action.info.asProxyStatus()

        // Clear `activate` once the engine settles so a re-request reads as a new transition.
        val newActivate = when (action.info.serviceState) {
            ServiceState.Uninitialized,
                -> {
                null
            }

            ServiceState.Unavailable,
            ServiceState.Unauthenticated,
            ServiceState.OptedOut,
                -> {
                false
            }

            ServiceState.Ready,
                -> when (newProxyStatus) {
                Authorized.Activating -> state.activate
                else -> null
            }
        }

        // Apart from the first enrollment where the user goes through the enrollment process,
        // we rely on the service state to be the source of truth for entitlement.
        // UNLESS the user is signed out: we could still intermittently get an EngineState
        // update with the service being READY, before EngineState updates itself with the new
        // account status.
        val newAccountStatus = if (action.info.serviceState == ServiceState.Ready &&
            state.accountState.status != AccountStatus.Uninitialized
        ) {
            AccountStatus.EnrolledAndEntitled
        } else {
            state.accountState.status
        }

        // We reset the shown status when it has been shown AND
        // the status is no longer Active or Activating.
        val newProxyActiveShown = if (state.proxyActiveShown) {
            newProxyStatus == Authorized.Active || newProxyStatus == Authorized.Activating
        } else {
            false
        }

        state.copy(
            remainingDataBytes = action.info.remaining,
            maxDataBytes = action.info.max,
            resetDate = action.info.resetTime,
            proxyStatus = newProxyStatus,
            serviceStatus = action.info.serviceState,
            accountState = state.accountState.copy(
                status = newAccountStatus,
            ),
            lastError = action.info.lastError,
            proxyActiveShown = newProxyActiveShown,
            activate = newActivate,
        )
    }

   is IPProtectionAction.AccountStateChanged -> {
        state.copy(accountState = state.accountState.copy(status = action.state))
    }

    is IPProtectionAction.Toggle -> {
        when (state.serviceStatus) {
            ServiceState.OptedOut,
            ServiceState.Unavailable,
            ServiceState.Uninitialized,
                -> {
                return state
            }

            ServiceState.Ready -> {
                return when (state.proxyStatus) {
                    Authorized.Idle -> {
                        state.copy(activate = true)
                    }

                    Authorized.ConnectionError,
                    Authorized.Active,
                    -> {
                        state.copy(activate = false)
                    }

                    Authorized.Activating,
                    Authorized.DataLimitReached,
                    Uninitialized,
                        -> state
                }
            }

            ServiceState.Unauthenticated -> {
                val status = state.accountState.status

                // We need to authenticate first because we haven't done so before or
                // our account is in a wonky state.
                if (status == AccountStatus.NeedsAuthentication ||
                    status == AccountStatus.Uninitialized ||
                    status == AccountStatus.WarmingUp
                ) {
                    return state.copy(
                        accountState = state.accountState.copy(
                            status = AccountStatus.RequestingAuthentication,
                        ),
                    )
                }

                // We have an account in good standing, but we haven't enrolled the service before,
                // so we need to authorize the service first to get the account ready to request
                // enrollment keys.
                if (status == AccountStatus.NeedsAuthorization) {
                    return state.copy(
                        accountState = state.accountState.copy(
                            status = AccountStatus.RequestingAuthorization,
                        ),
                    )
                }

                if (status == AccountStatus.Authenticated) {
                    throw IllegalStateException("VPN state machine is in a bad state")
                }
            }
        }

        state
    }

    is IPProtectionAction.ProxyActiveShown -> {
        state.copy(proxyActiveShown = true)
    }

    is IPProtectionAction.ToggleFailed -> {
        // Reset `activate` so the next Toggle reads as a fresh edge in observeToggle().
        state.copy(activate = null)
    }

    is IPProtectionAction.CheckAccount -> {
        if (state.accountState.status == AccountStatus.NeedsAuthorization) {
            // When we "try again" we signal to the IPProtectionHandler to attempt retrieving an access token.
            // If that request fails, we catch the exception and return back into a `NeedsAuthorization` state.
            state.copy(accountState = state.accountState.copy(status = AccountStatus.TryAgain))
        } else {
            state
        }
    }

    is InternalAction -> internalReducer(state, action)
}

internal fun internalReducer(
    state: IPProtectionState,
    action: InternalAction,
): IPProtectionState = when (action) {
    is InternalAction.AccountManagerStateChanged -> {
        // Only the AccountManager should only change the states that put the
        // account into a "ready-to-use" state. The remaining are part of
        // AccountStatus that represents the combined requirements for the
        // account and the IP protection service, and those are moved into
        // from other parts of the system.
        //
        // To avoid potential conflicts, we limit which states this action
        // can perform.
        when (action.status) {
            AccountStatus.RequestingAuthentication,
            AccountStatus.RequestingAuthorization,
            AccountStatus.TryAgain,
            AccountStatus.AwaitingAuthentication,
            AccountStatus.AwaitingAuthorization,
            AccountStatus.AwaitingEnrollment,
                -> state

            AccountStatus.WarmingUp,
            AccountStatus.NeedsAuthentication,
            AccountStatus.NeedsAuthorization,
            AccountStatus.Authenticated,
            AccountStatus.EnrolledAndEntitled,
                -> {
                state.copy(
                    accountState = state.accountState.copy(status = action.status),
                )
            }

            AccountStatus.AuthFailed -> {
                state.copy(
                    accountState = state.accountState.copy(
                        status = AccountStatus.NeedsAuthentication,
                    ),
                )
            }

            AccountStatus.Uninitialized -> state.clearProfileData(action)
        }
    }

    is InternalAction.EligibilityChanged -> state.copy(
        eligibilityStatus = action.eligibility,
    )

    is InternalAction.AccountReadyForEnrollment -> {
        state.copy(
            accountState = state.accountState.copy(
                status = AccountStatus.AwaitingEnrollment,
            ),
        )
    }

    is InternalAction.UpdateServiceState -> state.copy(
        serviceStatus = action.serviceState,
    )

    // Do nothing while we wait for our pending authentication to change.
    is InternalAction.AwaitingAuth -> state.copy(
        accountState = state.accountState.copy(status = action.status),
    )

    // The auth UI flow has finished; if the status is still "awaiting", we roll back into
    // the "requires auth" states. Otherwise, the status moved into enrollment phase, which
    // is handled elsewhere.
    is InternalAction.FinishingAuthFlow -> {
        val newAccountStatus = when (state.accountState.status) {
            AccountStatus.AwaitingAuthentication,
            AccountStatus.WarmingUp,
            AccountStatus.Uninitialized,
                -> {
                AccountStatus.NeedsAuthentication
            }

            AccountStatus.AwaitingAuthorization -> {
                AccountStatus.NeedsAuthorization
            }

            else -> state.accountState.status
        }
        return state.copy(
            accountState = state.accountState.copy(
                status = newAccountStatus,
            ),
        )
    }

    is InternalAction.FinishingEnrollment -> state.handleFinishingEnrollment(action)
}

private fun IPProtectionState.clearProfileData(action: InternalAction.AccountManagerStateChanged): IPProtectionState {
    return copy(
        remainingDataBytes = -1L,
        maxDataBytes = -1L,
        resetDate = null,
        proxyActiveShown = false,
        activate = false,
        accountState = accountState.copy(status = action.status),
    )
}

private fun IPProtectionState.handleFinishingEnrollment(action: InternalAction.FinishingEnrollment): IPProtectionState {
    return if (action.success) {
        copy(
            accountState = accountState.copy(status = AccountStatus.EnrolledAndEntitled),
            activate = true,
        )
    } else {
        copy(accountState = accountState.copy(status = AccountStatus.NeedsAuthorization))
    }
}

private fun IPProtectionHandler.StateInfo.asProxyStatus(): ProxyStatus {
    return when (proxyState) {
        IPProtectionHandler.StateInfo.PROXY_STATE_READY -> Authorized.Idle
        IPProtectionHandler.StateInfo.PROXY_STATE_ACTIVATING -> Authorized.Activating
        IPProtectionHandler.StateInfo.PROXY_STATE_ACTIVE -> Authorized.Active
        IPProtectionHandler.StateInfo.PROXY_STATE_PAUSED -> Authorized.DataLimitReached
        IPProtectionHandler.StateInfo.PROXY_STATE_ERROR -> Authorized.ConnectionError
        else -> Uninitialized
    }
}
