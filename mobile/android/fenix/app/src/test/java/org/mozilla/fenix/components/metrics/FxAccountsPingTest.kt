/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.metrics

import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.service.fxa.store.Account
import mozilla.components.service.fxa.store.SyncAction
import mozilla.components.service.fxa.store.SyncStatus
import mozilla.components.service.fxa.store.SyncStore
import mozilla.components.support.test.robolectric.testContext
import mozilla.telemetry.glean.private.JobTimeoutException
import org.junit.Assert.assertEquals
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.GleanMetrics.Pings.fxAccounts
import org.mozilla.fenix.components.TelemetryMiddleware
import org.mozilla.fenix.helpers.FenixGleanTestRule

@RunWith(AndroidJUnit4::class)
internal class FxAccountsPingTest {

    @get:Rule
    val gleanTestRule = FenixGleanTestRule(testContext)

    private lateinit var mockAccount: Account
    private lateinit var syncStore: SyncStore

    @Before
    fun setup() {
        mockAccount =
            Account(
                uid = "123",
                email = "email@email.com",
                avatar = null,
                displayName = "TempName",
                currentDeviceId = null,
                sessionToken = null,
            )
        val telemetryMiddleware = TelemetryMiddleware()
        syncStore = SyncStore(middleware = listOf(telemetryMiddleware))
    }

    @Test
    fun `the state changes and the UID does change and the ping is submitted`() {
        assertEquals(null, syncStore.state.account?.uid)
        var validatorRun = false
        syncStore.dispatch(SyncAction.UpdateSyncStatus(SyncStatus.Idle))
        val job = fxAccounts.testBeforeNextSubmit {
            validatorRun = true
        }
        syncStore.dispatch(
            SyncAction.UpdateAccount(
                account = mockAccount,
            ),
        )

        job.join()
        assertEquals("123", syncStore.state.account?.uid)
        if (!validatorRun) fail("The ping was not sent")
    }

    @Test
    fun `the state changes and the UID becomes null and the ping is NOT submitted`() {
        assertEquals(null, syncStore.state.account?.uid)
        var validatorRun = false
        syncStore.dispatch(SyncAction.UpdateSyncStatus(SyncStatus.Idle))
        syncStore.dispatch(
            SyncAction.UpdateAccount(
                account = mockAccount,
            ),
        )
        assertEquals(syncStore.state.account?.uid, "123")
        val job = fxAccounts.testBeforeNextSubmit {
            validatorRun = true
        }
        syncStore.dispatch(
            SyncAction.UpdateAccount(
                account = mockAccount.copy(uid = null),
            ),
        )

        try {
            job.join()
            fail("The ping was sent")
        } catch (e: JobTimeoutException) {
            assertEquals(null, syncStore.state.account?.uid)
            if (validatorRun) fail("The ping was sent")
        }
    }

    @Test
    fun `the state changes and the UID remains the same and the ping is NOT submitted`() {
        assertEquals(null, syncStore.state.account?.uid)
        var validatorRun = false
        syncStore.dispatch(SyncAction.UpdateSyncStatus(SyncStatus.Idle))
        syncStore.dispatch(
            SyncAction.UpdateAccount(
                account = mockAccount,
            ),
        )
        assertEquals("123", syncStore.state.account?.uid)
        val job = fxAccounts.testBeforeNextSubmit {
            validatorRun = true
            assertEquals(false, true)
        }
        syncStore.dispatch(
            SyncAction.UpdateAccount(
                account = mockAccount.copy(email = "newEmail@email.com"),
            ),
        )

        try {
            job.join()
            fail("The ping was sent")
        } catch (e: JobTimeoutException) {
            assertEquals("123", syncStore.state.account?.uid)
            assertEquals("newEmail@email.com", syncStore.state.account?.email)
            if (validatorRun) fail("The ping was sent")
        }
    }
}
