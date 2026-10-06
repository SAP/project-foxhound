/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:OptIn(ExperimentalAndroidComponentsApi::class)

package org.mozilla.fenix.components.menu

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.ExperimentalAndroidComponentsApi
import mozilla.components.concept.engine.ipprotection.IPProtectionHandler.StateInfo
import mozilla.components.concept.engine.ipprotection.ServiceState
import mozilla.components.feature.ipprotection.store.IPProtectionAction
import mozilla.components.feature.ipprotection.store.IPProtectionStore
import mozilla.components.feature.ipprotection.store.state.Authorized
import mozilla.components.feature.ipprotection.store.state.BYTES_PER_GB
import mozilla.components.feature.ipprotection.store.state.IPProtectionState
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mozilla.fenix.components.menu.store.IPProtectionMenuState
import org.mozilla.fenix.components.menu.store.IPProtectionMenuStatus

class IPProtectionMenuBindingTest {
    private val testDispatcher = StandardTestDispatcher()

    @Test
    fun `GIVEN proxy is uninitialized WHEN binding starts THEN dispatch Disabled status`() = runTest {
        var result: IPProtectionMenuState? = null
        val ipProtectionStore = IPProtectionStore()

        startBinding(ipProtectionStore) { result = it }

        assertEquals(IPProtectionMenuStatus.Disabled, result?.status)
    }

    @Test
    fun `GIVEN proxy is active WHEN binding starts THEN dispatch Enabled status`() = runTest {
        var result: IPProtectionMenuState? = null
        val ipProtectionStore = IPProtectionStore(
            initialState = IPProtectionState(proxyStatus = Authorized.Active),
        )

        startBinding(ipProtectionStore) { result = it }

        assertEquals(IPProtectionMenuStatus.Enabled, result?.status)
    }

    @Test
    fun `WHEN proxy status changes THEN dispatch updated menu state`() = runTest {
        var result: IPProtectionMenuState? = null
        val ipProtectionStore = IPProtectionStore()

        startBinding(ipProtectionStore) { result = it }

        assertEquals(IPProtectionMenuStatus.Disabled, result?.status)

        ipProtectionStore.dispatch(
            IPProtectionAction.EngineStateChanged(
                StateInfo(
                    serviceState = ServiceState.Ready,
                    proxyState = StateInfo.PROXY_STATE_ACTIVE,
                ),
            ),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(IPProtectionMenuStatus.Enabled, result?.status)
    }

    @Test
    fun `WHEN proxy status maps to menu status THEN all statuses are mapped correctly`() = runTest {
        val cases = listOf(
            StateInfo(serviceState = ServiceState.Uninitialized) to IPProtectionMenuStatus.Disabled,
            StateInfo(
                serviceState = ServiceState.Ready,
                proxyState = StateInfo.PROXY_STATE_READY,
            ) to IPProtectionMenuStatus.Disabled,
            StateInfo(
                serviceState = ServiceState.Ready,
                proxyState = StateInfo.PROXY_STATE_ACTIVATING,
            ) to IPProtectionMenuStatus.Activating,
            StateInfo(
                serviceState = ServiceState.Ready,
                proxyState = StateInfo.PROXY_STATE_ACTIVE,
            ) to IPProtectionMenuStatus.Enabled,
            StateInfo(
                serviceState = ServiceState.Ready,
                proxyState = StateInfo.PROXY_STATE_PAUSED,
            ) to IPProtectionMenuStatus.DataLimitReached,
            StateInfo(
                serviceState = ServiceState.Ready,
                proxyState = StateInfo.PROXY_STATE_ERROR,
            ) to IPProtectionMenuStatus.ConnectionError,
            StateInfo(
                serviceState = ServiceState.Unauthenticated,
            ) to IPProtectionMenuStatus.AuthRequired,
        )

        for ((stateInfo, expectedStatus) in cases) {
            var result: IPProtectionMenuState? = null
            val ipProtectionStore = IPProtectionStore()

            ipProtectionStore.dispatch(IPProtectionAction.EngineStateChanged(stateInfo))
            testDispatcher.scheduler.advanceUntilIdle()

            startBinding(ipProtectionStore) { result = it }

            assertEquals(
                "StateInfo $stateInfo should map to $expectedStatus",
                expectedStatus,
                result?.status,
            )
        }
    }

    @Test
    fun `GIVEN dataMaxBytes is set WHEN binding starts THEN dispatch correct dataLimitGb`() = runTest {
        var result: IPProtectionMenuState? = null
        val ipProtectionStore = IPProtectionStore(
            initialState = IPProtectionState(
                proxyStatus = Authorized.Active,
                maxDataBytes = (5 * BYTES_PER_GB).toLong(),
            ),
        )

        startBinding(ipProtectionStore) { result = it }

        assertEquals(5, result?.dataLimitGb)
    }

    @Test
    fun `GIVEN dataMaxBytes is unavailable WHEN binding starts THEN dispatch dataLimitGb as -1`() = runTest {
        var result: IPProtectionMenuState? = null
        val ipProtectionStore = IPProtectionStore(
            initialState = IPProtectionState(proxyStatus = Authorized.Active, maxDataBytes = -1L),
        )

        startBinding(ipProtectionStore) { result = it }

        assertEquals(-1, result?.dataLimitGb)
    }

    private fun startBinding(
        ipProtectionStore: IPProtectionStore,
        onUpdate: (IPProtectionMenuState) -> Unit,
    ) {
        val binding = IPProtectionMenuBinding(
            ipProtectionStore = ipProtectionStore,
            onIPProtectionStatusUpdate = onUpdate,
            mainDispatcher = testDispatcher,
        )
        binding.start()
        testDispatcher.scheduler.advanceUntilIdle()
    }
}
