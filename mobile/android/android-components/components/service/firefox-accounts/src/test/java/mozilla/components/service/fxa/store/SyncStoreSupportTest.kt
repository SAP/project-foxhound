/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxa.store

import androidx.lifecycle.LifecycleOwner
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.concept.sync.AuthFlowError
import mozilla.components.concept.sync.AuthType
import mozilla.components.concept.sync.Avatar
import mozilla.components.concept.sync.ConstellationState
import mozilla.components.concept.sync.DeviceConstellation
import mozilla.components.concept.sync.OAuthAccount
import mozilla.components.concept.sync.Profile
import mozilla.components.service.fxa.manager.AccountState
import mozilla.components.service.fxa.manager.FxaAccountManager
import mozilla.components.service.fxa.manager.SCOPE_PROFILE
import mozilla.components.support.test.any
import mozilla.components.support.test.coMock
import mozilla.components.support.test.eq
import mozilla.components.support.test.mock
import mozilla.components.support.test.whenever
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`

class SyncStoreSupportTest {
    private val testDispatcher = StandardTestDispatcher()
    private val accountManager = mock<FxaAccountManager>()
    private val lifecycleOwner = mock<LifecycleOwner>()
    private val autoPause = false

    private lateinit var store: SyncStore
    private lateinit var syncObserver: AccountSyncObserver
    private lateinit var constellationObserver: ConstellationObserver
    private lateinit var accountObserver: FxaAccountObserver
    private lateinit var integration: SyncStoreSupport

    @Before
    fun setup() {
        store = SyncStore()
        syncObserver = AccountSyncObserver(store)
        constellationObserver = ConstellationObserver(store)
        accountObserver = FxaAccountObserver(
            store = store,
            deviceConstellationObserver = constellationObserver,
            lifecycleOwner = lifecycleOwner,
            autoPause = autoPause,
            ioDispatcher = testDispatcher,
            mainDispatcher = testDispatcher,
        )

        integration = SyncStoreSupport(
            store = store,
            fxaAccountManager = lazyOf(accountManager),
            lifecycleOwner = lifecycleOwner,
            autoPause = autoPause,
            ioDispatcher = testDispatcher,
            mainDispatcher = testDispatcher,
        )
    }

    @Test
    fun `GIVEN integration WHEN initialize is called THEN observers registered`() {
        integration.initialize()

        verify(accountManager).registerForSyncEvents(any(), eq(lifecycleOwner), eq(autoPause))
        verify(accountManager).register(any(), eq(lifecycleOwner), eq(autoPause))
    }

    @Test
    fun `GIVEN sync observer WHEN onStarted observed THEN sync status updated`() {
        syncObserver.onStarted()

        assertEquals(SyncStatus.Started, store.state.status)
    }

    @Test
    fun `GIVEN sync observer WHEN onIdle observed THEN sync status updated`() {
        syncObserver.onIdle()

        assertEquals(SyncStatus.Idle, store.state.status)
    }

    @Test
    fun `GIVEN sync observer WHEN onError observed THEN sync status updated`() {
        syncObserver.onError(Exception())

        assertEquals(SyncStatus.Error, store.state.status)
    }

    @Test
    fun `GIVEN account observer WHEN onAuthenticated observed THEN device observer registered`() = runTest(testDispatcher) {
        val constellation = mock<DeviceConstellation>()
        val account = mock<OAuthAccount> {
            whenever(deviceConstellation()).thenReturn(constellation)
        }

        accountObserver.onAuthenticated(account, mock<AuthType.Existing>())

        testDispatcher.scheduler.advanceUntilIdle()

        verify(constellation).registerDeviceObserver(constellationObserver, lifecycleOwner, autoPause)
    }

    @Test
    fun `GIVEN account observer WHEN onAuthenticated observed with profile THEN account and account state are updated`() = runTest(testDispatcher) {
        val profile = generateProfile()
        val constellation = mock<DeviceConstellation>()
        val account = coMock<OAuthAccount> {
            whenever(deviceConstellation()).thenReturn(constellation)
            whenever(getCurrentDeviceId()).thenReturn("id")
            whenever(getSessionToken()).thenReturn("token")
            whenever(getProfile(eq(false))).thenReturn(profile)
        }

        assertEquals(AccountState.NotAuthenticated, store.state.accountState)

        accountObserver.onAuthenticated(account, AuthType.Existing)
        testDispatcher.scheduler.advanceUntilIdle()

        val expected = Account(
            profile.uid,
            profile.email,
            profile.avatar,
            profile.displayName,
            "id",
            "token",
        )
        assertEquals(expected, store.state.account)
        assertEquals(AccountState.Authenticated, store.state.accountState)
    }

    @Test
    fun `GIVEN account observer WHEN onAuthenticated observed without profile THEN account and account state are not updated`() = runTest(testDispatcher) {
        val constellation = mock<DeviceConstellation>()
        val account = coMock<OAuthAccount> {
            whenever(deviceConstellation()).thenReturn(constellation)
            whenever(getProfile(eq(false))).thenReturn(null)
        }

        accountObserver.onAuthenticated(account, AuthType.Existing)

        assertNull(store.state.account)
        assertEquals(AccountState.NotAuthenticated, store.state.accountState)
    }

    @Test
    fun `GIVEN user is logged in WHEN onLoggedOut observed THEN sync status and account states are updated`() = runTest(testDispatcher) {
        val account = coMock<OAuthAccount> {
            whenever(deviceConstellation()).thenReturn(mock())
            whenever(getProfile()).thenReturn(null)
        }
        accountObserver.onAuthenticated(account, AuthType.Existing)

        accountObserver.onLoggedOut()

        assertEquals(SyncStatus.LoggedOut, store.state.status)
        assertNull(store.state.account)
        assertEquals(AccountState.NotAuthenticated, store.state.accountState)
    }

    @Test
    fun `GIVEN account observer WHEN onAuthenticationProblems observed THEN account state is updated`() {
        assertEquals(AccountState.NotAuthenticated, store.state.accountState)

        accountObserver.onAuthenticationProblems()

        assertEquals(AccountState.AuthenticationProblem, store.state.accountState)
    }

    @Test
    fun `GIVEN account observer WHEN onFlowError observed THEN account state is updated`() {
        assertNull(store.state.account)
        assertEquals(AccountState.NotAuthenticated, store.state.accountState)

        accountObserver.onFlowError(AuthFlowError.FailedToBeginAuth)

        assertNull(store.state.account)
        assertEquals(AccountState.NotAuthenticated, store.state.accountState)
    }

    @Test
    fun `GIVEN account observer WHEN onProfileUpdated then update the account state`() {
        // Prerequisite is having a non-null account already.
        store.dispatch(SyncAction.UpdateAccount(Account(null, null, null, null, null, null)))

        val profile = generateProfile()
        accountObserver.onProfileUpdated(profile)

        assertEquals(profile.uid, store.state.account!!.uid)
        assertEquals(profile.avatar, store.state.account!!.avatar)
        assertEquals(profile.email, store.state.account!!.email)
        assertEquals(profile.displayName, store.state.account!!.displayName)
    }

    @Test
    fun `GIVEN account observer WHEN onReady is triggered THEN do nothing`() = runTest(testDispatcher) {
        // `onReady` is too early for us (today) to try and get the auth status from the cached value.
        // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1909779
        val currentDeviceId = "id"
        val sessionToken = "token"
        val constellation = mock<DeviceConstellation>()
        val authenticatedAccount = coMock<OAuthAccount> {
            whenever(deviceConstellation()).thenReturn(constellation)
            whenever(getCurrentDeviceId()).thenReturn(currentDeviceId)
            whenever(getSessionToken()).thenReturn(sessionToken)
        }
        val initialState = store.state.copy()

        assertNull(store.state.account)
        assertEquals(AccountState.NotAuthenticated, store.state.accountState)

        `when`(authenticatedAccount.checkAuthorizationStatus(eq(SCOPE_PROFILE))).thenReturn(false)

        accountObserver.onReady(authenticatedAccount = authenticatedAccount)

        assertEquals(initialState, store.state)

        `when`(authenticatedAccount.checkAuthorizationStatus(eq(SCOPE_PROFILE))).thenReturn(true)

        accountObserver.onReady(authenticatedAccount = authenticatedAccount)

        assertEquals(initialState, store.state)
    }

    @Test
    fun `GIVEN account observer WHEN onReady observed without profile THEN account states are not updated`() = runTest(testDispatcher) {
        val constellation = mock<DeviceConstellation>()
        val account = coMock<OAuthAccount> {
            whenever(deviceConstellation()).thenReturn(constellation)
            whenever(getProfile()).thenReturn(null)
        }

        assertNull(store.state.account)
        assertEquals(AccountState.NotAuthenticated, store.state.accountState)

        accountObserver.onReady(account)

        assertNull(store.state.account)
        assertEquals(AccountState.NotAuthenticated, store.state.accountState)
    }

    @Test
    fun `GIVEN device observer WHEN onDevicesUpdate observed THEN constellation state updated`() {
        val constellation = mock<ConstellationState>()
        constellationObserver.onDevicesUpdate(constellation)

        assertEquals(constellation, store.state.constellationState)
    }

    private fun generateProfile(
        uid: String = "uid",
        email: String = "email",
        avatar: Avatar = Avatar("url", true),
        displayName: String = "displayName",
    ) = Profile(uid, email, avatar, displayName)
}
