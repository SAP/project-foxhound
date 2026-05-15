/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.accounts.push

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import kotlinx.coroutines.test.runTest
import mozilla.components.concept.base.crash.CrashReporting
import mozilla.components.concept.sync.AuthType
import mozilla.components.concept.sync.DeviceConstellation
import mozilla.components.concept.sync.OAuthAccount
import mozilla.components.feature.push.AutoPushFeature
import mozilla.components.feature.push.PushConfig
import mozilla.components.service.fxa.manager.FxaAccountManager
import mozilla.components.support.test.any
import mozilla.components.support.test.eq
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.anyBoolean
import org.mockito.Mockito.reset
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoMoreInteractions
import org.mockito.Mockito.`when`
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AccountObserverTest {

    private val accountManager: FxaAccountManager = mock()
    private val pushFeature: AutoPushFeature = mock()
    private val pushScope: String = "testScope"
    private val account: OAuthAccount = mock()
    private val constellation: DeviceConstellation = mock()
    private val config: PushConfig = mock()
    private val crashReporter: CrashReporting = mock()

    @Before
    fun setup() {
        `when`(accountManager.authenticatedAccount()).thenReturn(account)
        `when`(account.deviceConstellation()).thenReturn(constellation)
        `when`(pushFeature.config).thenReturn(config)
    }

    @Test
    fun `register device observer for existing accounts`() = runTest {
        val lifecycle: Lifecycle = mock()
        val lifecycleOwner: LifecycleOwner = mock()
        val observer = AccountObserver(
            testContext,
            pushFeature,
            pushScope,
            crashReporter,
            lifecycleOwner,
            coroutineContext,
            false,
        )
        `when`(lifecycle.currentState).thenReturn(Lifecycle.State.STARTED)
        `when`(lifecycleOwner.lifecycle).thenReturn(lifecycle)

        observer.onAuthenticated(account, AuthType.Existing)
        testScheduler.advanceUntilIdle()

        verify(constellation).registerDeviceObserver(any(), eq(lifecycleOwner), anyBoolean())

        reset(constellation)

        observer.onAuthenticated(account, AuthType.Recovered)
        testScheduler.advanceUntilIdle()

        verify(constellation).registerDeviceObserver(any(), eq(lifecycleOwner), anyBoolean())
    }

    @Test
    fun `onLoggedOut removes cache`() = runTest {
        val observer = AccountObserver(
            testContext,
            pushFeature,
            pushScope,
            crashReporter,
            mock(),
            coroutineContext,
            false,
        )

        preference(testContext).edit()
            .putString(PREF_LAST_VERIFIED, "{\"timestamp\": 100, \"totalCount\": 0}")
            .putString(PREF_FXA_SCOPE, "12345")
            .apply()

        assertTrue(preference(testContext).contains(PREF_LAST_VERIFIED))

        observer.onLoggedOut()

        assertFalse(preference(testContext).contains(PREF_LAST_VERIFIED))
        assertTrue(preference(testContext).contains(PREF_FXA_SCOPE))
    }

    @Test
    fun `feature does not subscribe when authenticating`() = runTest {
        val observer = AccountObserver(
            testContext,
            pushFeature,
            pushScope,
            crashReporter,
            mock(),
            coroutineContext,
            false,
        )

        observer.onAuthenticated(account, AuthType.Existing)

        verify(pushFeature).config

        verifyNoMoreInteractions(pushFeature)

        observer.onAuthenticated(account, AuthType.Recovered)

        verifyNoMoreInteractions(pushFeature)

        observer.onAuthenticated(account, AuthType.Signup)

        verifyNoMoreInteractions(pushFeature)

        observer.onAuthenticated(account, AuthType.Signin)

        verifyNoMoreInteractions(pushFeature)
    }

    @Test
    fun `feature and service invoked on logout`() = runTest {
        val observer = AccountObserver(
            testContext,
            pushFeature,
            pushScope,
            crashReporter,
            mock(),
            coroutineContext,
            false,
        )

        observer.onLoggedOut()

        verify(pushFeature).unsubscribe(eq(pushScope), any(), any())
    }

    @Test
    fun `feature and service not invoked for any other callback`() = runTest {
        val observer = AccountObserver(
            testContext,
            pushFeature,
            pushScope,
            crashReporter,
            mock(),
            coroutineContext,
            false,
        )

        observer.onAuthenticationProblems()
        observer.onProfileUpdated(mock())

        verify(pushFeature).config
        verifyNoMoreInteractions(pushFeature)
    }
}
