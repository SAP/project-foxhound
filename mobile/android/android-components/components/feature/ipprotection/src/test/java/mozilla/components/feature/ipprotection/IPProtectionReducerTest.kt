/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.ipprotection

import mozilla.components.ExperimentalAndroidComponentsApi
import mozilla.components.concept.engine.ipprotection.IPProtectionHandler.StateInfo
import mozilla.components.concept.engine.ipprotection.IPProtectionHandler.StateInfo.Companion.PROXY_STATE_ACTIVATING
import mozilla.components.concept.engine.ipprotection.IPProtectionHandler.StateInfo.Companion.PROXY_STATE_ACTIVE
import mozilla.components.concept.engine.ipprotection.IPProtectionHandler.StateInfo.Companion.PROXY_STATE_ERROR
import mozilla.components.concept.engine.ipprotection.IPProtectionHandler.StateInfo.Companion.PROXY_STATE_PAUSED
import mozilla.components.concept.engine.ipprotection.IPProtectionHandler.StateInfo.Companion.PROXY_STATE_READY
import mozilla.components.concept.engine.ipprotection.ServiceState
import mozilla.components.feature.ipprotection.store.IPProtectionAction
import mozilla.components.feature.ipprotection.store.InternalAction
import mozilla.components.feature.ipprotection.store.iPProtectionReducer
import mozilla.components.feature.ipprotection.store.state.AccountState
import mozilla.components.feature.ipprotection.store.state.AccountStatus
import mozilla.components.feature.ipprotection.store.state.Authorized
import mozilla.components.feature.ipprotection.store.state.EligibilityStatus
import mozilla.components.feature.ipprotection.store.state.IPProtectionState
import org.junit.Assert.assertEquals
import org.junit.Test

@OptIn(ExperimentalAndroidComponentsApi::class)
class IPProtectionReducerTest {

    private val defaultState = buildIPProtectionState(accountStatus = AccountStatus.Authenticated)

    @Test
    fun `WHEN EligibilityChanged is dispatched THEN eligibilityStatus is updated`() {
        assertEquals(
            defaultState.copy(eligibilityStatus = EligibilityStatus.Eligible),
            iPProtectionReducer(
                defaultState,
                IPProtectionAction.EligibilityChanged(EligibilityStatus.Eligible),
            ),
        )
    }

    @Test
    fun `WHEN ToolkitStateChanged is dispatched THEN data fields are updated`() {
        val info = StateInfo(
            serviceState = ServiceState.Uninitialized,
            remaining = 1000L,
            max = 5000L,
            resetTime = "2026-06-01T00:00:00Z",
        )
        assertEquals(
            defaultState.copy(
                remainingDataBytes = 1000L,
                maxDataBytes = 5000L,
                resetDate = "2026-06-01T00:00:00Z",
            ),
            iPProtectionReducer(defaultState, IPProtectionAction.EngineStateChanged(info)),
        )
    }

    @Test
    fun `WHEN service is ready and proxy state is ready THEN proxyStatus is Idle`() {
        val info = StateInfo(serviceState = ServiceState.Ready, proxyState = PROXY_STATE_READY)
        assertEquals(
            defaultState.copy(
                serviceStatus = ServiceState.Ready,
                proxyStatus = Authorized.Idle,
                accountState = defaultState.accountState.copy(status = AccountStatus.EnrolledAndEntitled),
            ),
            iPProtectionReducer(defaultState, IPProtectionAction.EngineStateChanged(info)),
        )
    }

    @Test
    fun `WHEN service is ready and proxy state is activating THEN proxyStatus is Activating`() {
        val info = StateInfo(serviceState = ServiceState.Ready, proxyState = PROXY_STATE_ACTIVATING)
        assertEquals(
            defaultState.copy(
                serviceStatus = ServiceState.Ready,
                proxyStatus = Authorized.Activating,
                accountState = defaultState.accountState.copy(status = AccountStatus.EnrolledAndEntitled),
            ),
            iPProtectionReducer(defaultState, IPProtectionAction.EngineStateChanged(info)),
        )
    }

    @Test
    fun `WHEN service is ready and proxy state is active THEN proxyStatus is Active`() {
        val info = StateInfo(serviceState = ServiceState.Ready, proxyState = PROXY_STATE_ACTIVE)
        assertEquals(
            defaultState.copy(
                serviceStatus = ServiceState.Ready,
                proxyStatus = Authorized.Active,
                accountState = defaultState.accountState.copy(status = AccountStatus.EnrolledAndEntitled),
            ),
            iPProtectionReducer(defaultState, IPProtectionAction.EngineStateChanged(info)),
        )
    }

    @Test
    fun `WHEN service is ready and proxy state is paused THEN proxyStatus is DataLimitReached`() {
        val info = StateInfo(serviceState = ServiceState.Ready, proxyState = PROXY_STATE_PAUSED)
        assertEquals(
            defaultState.copy(
                serviceStatus = ServiceState.Ready,
                proxyStatus = Authorized.DataLimitReached,
                accountState = defaultState.accountState.copy(status = AccountStatus.EnrolledAndEntitled),
            ),
            iPProtectionReducer(defaultState, IPProtectionAction.EngineStateChanged(info)),
        )
    }

    @Test
    fun `WHEN service is ready and proxy state is error THEN proxyStatus is ConnectionError`() {
        val info = StateInfo(serviceState = ServiceState.Ready, proxyState = PROXY_STATE_ERROR)
        assertEquals(
            defaultState.copy(
                serviceStatus = ServiceState.Ready,
                proxyStatus = Authorized.ConnectionError,
                accountState = defaultState.accountState.copy(status = AccountStatus.EnrolledAndEntitled),
            ),
            iPProtectionReducer(defaultState, IPProtectionAction.EngineStateChanged(info)),
        )
    }

    @Test
    fun `WHEN ActivationFailed is dispatched THEN activate is cleared`() {
        val state = defaultState.copy(activate = true)
        assertEquals(
            state.copy(activate = null),
            iPProtectionReducer(state, IPProtectionAction.ToggleFailed),
        )
    }

    @Test
    fun `WHEN ProxyActiveShown is dispatched THEN proxyActiveShown is true`() {
        assertEquals(
            defaultState.copy(proxyActiveShown = true),
            iPProtectionReducer(defaultState, IPProtectionAction.ProxyActiveShown),
        )
    }

    @Test
    fun `WHEN proxy becomes active and proxyActiveShown was true THEN proxyActiveShown is preserved`() {
        val state = defaultState.copy(proxyActiveShown = true)
        val info = StateInfo(serviceState = ServiceState.Ready, proxyState = PROXY_STATE_ACTIVE)
        assertEquals(
            state.copy(
                serviceStatus = ServiceState.Ready,
                proxyStatus = Authorized.Active,
                accountState = defaultState.accountState.copy(status = AccountStatus.EnrolledAndEntitled),
            ),
            iPProtectionReducer(state, IPProtectionAction.EngineStateChanged(info)),
        )
    }

    @Test
    fun `WHEN proxy becomes activating and proxyActiveShown was true THEN proxyActiveShown is preserved`() {
        val state = defaultState.copy(proxyActiveShown = true)
        val info = StateInfo(serviceState = ServiceState.Ready, proxyState = PROXY_STATE_ACTIVATING)
        assertEquals(
            state.copy(
                serviceStatus = ServiceState.Ready,
                proxyStatus = Authorized.Activating,
                accountState = defaultState.accountState.copy(status = AccountStatus.EnrolledAndEntitled),
            ),
            iPProtectionReducer(state, IPProtectionAction.EngineStateChanged(info)),
        )
    }

    @Test
    fun `WHEN proxy becomes idle and proxyActiveShown was true THEN proxyActiveShown is reset`() {
        val state = defaultState.copy(proxyActiveShown = true)
        val info = StateInfo(serviceState = ServiceState.Ready, proxyState = PROXY_STATE_READY)
        assertEquals(
            defaultState.copy(
                serviceStatus = ServiceState.Ready,
                proxyStatus = Authorized.Idle,
                accountState = defaultState.accountState.copy(status = AccountStatus.EnrolledAndEntitled),
            ),
            iPProtectionReducer(state, IPProtectionAction.EngineStateChanged(info)),
        )
    }

    @Test
    fun `WHEN engine settles to ready while a pending activate was queued THEN activate is cleared`() {
        val state = defaultState.copy(
            serviceStatus = ServiceState.Ready,
            proxyStatus = Authorized.Activating,
            activate = true,
        )
        val info = StateInfo(serviceState = ServiceState.Ready, proxyState = PROXY_STATE_READY)
        val nextState = iPProtectionReducer(state, IPProtectionAction.EngineStateChanged(info))
        assertEquals(
            null,
            nextState.activate,
        )
    }

    @Test
    fun `WHEN proxy errors and proxyActiveShown was true THEN proxyActiveShown is reset`() {
        val state = defaultState.copy(proxyActiveShown = true)
        val info = StateInfo(serviceState = ServiceState.Ready, proxyState = PROXY_STATE_ERROR)
        assertEquals(
            defaultState.copy(
                serviceStatus = ServiceState.Ready,
                proxyStatus = Authorized.ConnectionError,
                accountState = defaultState.accountState.copy(status = AccountStatus.EnrolledAndEntitled),
            ),
            iPProtectionReducer(state, IPProtectionAction.EngineStateChanged(info)),
        )
    }

    @Test
    fun `GIVEN AccountStatus is AwaitingAuthentication WHEN FinishingAuthFlow is dispatched THEN AccountStatus is NeedsAuthentication`() {
        val initialState = buildIPProtectionState(accountStatus = AccountStatus.AwaitingAuthentication)

        val resultState = iPProtectionReducer(initialState, InternalAction.FinishingAuthFlow)

        assertEquals(AccountStatus.NeedsAuthentication, resultState.accountState.status)
    }

    @Test
    fun `GIVEN AccountStatus is AwaitingAuthorization WHEN FinishingAuthFlow is dispatched THEN AccountStatus is NeedsAuthorization`() {
        val initialState = buildIPProtectionState(accountStatus = AccountStatus.AwaitingAuthorization)

        val resultState = iPProtectionReducer(initialState, InternalAction.FinishingAuthFlow)

        assertEquals(AccountStatus.NeedsAuthorization, resultState.accountState.status)
    }

    @Test
    fun `GIVEN AccountStatus is AwaitingEnrollment WHEN FinishingAuthFlow is dispatched THEN AccountStatus does not change`() {
        val initialState = buildIPProtectionState(accountStatus = AccountStatus.AwaitingEnrollment)

        val resultState = iPProtectionReducer(initialState, InternalAction.FinishingAuthFlow)

        assertEquals(AccountStatus.AwaitingEnrollment, resultState.accountState.status)
    }

    @Test
    fun `GIVEN successful enrollment WHEN FinishingEnrollment is dispatched THEN user is entitled to use the feature and the feature starts activation`() {
        val initialState = buildIPProtectionState(accountStatus = AccountStatus.AwaitingEnrollment)

        val resultState = iPProtectionReducer(initialState, InternalAction.FinishingEnrollment(true))

        assertEquals(AccountStatus.EnrolledAndEntitled, resultState.accountState.status)
        assertEquals(true, resultState.activate)
    }

    @Test
    fun `GIVEN unsuccessful enrollment WHEN FinishingEnrollment is dispatched THEN user has to authorize again`() {
        val initialState = buildIPProtectionState(accountStatus = AccountStatus.AwaitingEnrollment)

        val resultState = iPProtectionReducer(initialState, InternalAction.FinishingEnrollment(false))

        assertEquals(AccountStatus.NeedsAuthorization, resultState.accountState.status)
    }

    @Test
    fun `WHEN AccountManagerStateChanged to Uninitialized is dispatched THEN data and proxy flags are reset to defaults`() {
        val dirtyState = defaultState.copy(
            eligibilityStatus = EligibilityStatus.Eligible,
            proxyStatus = Authorized.Active,
            serviceStatus = ServiceState.Ready,
            remainingDataBytes = 1000L,
            maxDataBytes = 5000L,
            resetDate = "2026-06-01T00:00:00Z",
            accountState = AccountState(AccountStatus.EnrolledAndEntitled),
            proxyActiveShown = true,
            activate = true,
        )

        val resultState = iPProtectionReducer(
            dirtyState,
            InternalAction.AccountManagerStateChanged(AccountStatus.Uninitialized),
        )

        assertEquals(
            dirtyState.copy(
                remainingDataBytes = -1L,
                maxDataBytes = -1L,
                resetDate = null,
                proxyActiveShown = false,
                activate = false,
                accountState = AccountState(AccountStatus.Uninitialized),
            ),
            resultState,
        )
    }

    @Test
    fun `GIVEN AccountStatus is NeedsAuthorization WHEN CheckAccount is dispatched THEN AccountStatus is TryAgain`() {
        val initialState = buildIPProtectionState(accountStatus = AccountStatus.NeedsAuthorization)

        val resultState = iPProtectionReducer(initialState, IPProtectionAction.CheckAccount)

        assertEquals(AccountStatus.TryAgain, resultState.accountState.status)
    }

    @Test
    fun `GIVEN AccountStatus is not NeedsAuthorization WHEN CheckAccount is dispatched THEN state does not change`() {
        val initialState = buildIPProtectionState(accountStatus = AccountStatus.EnrolledAndEntitled)

        val resultState = iPProtectionReducer(initialState, IPProtectionAction.CheckAccount)

        assertEquals(initialState, resultState)
    }

    private fun buildIPProtectionState(
        accountStatus: AccountStatus = AccountStatus.Uninitialized,
    ): IPProtectionState {
        return IPProtectionState(
            accountState = AccountState(accountStatus),
        )
    }
}
