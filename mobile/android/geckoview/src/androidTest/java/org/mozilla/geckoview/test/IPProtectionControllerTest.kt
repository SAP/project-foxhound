/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.geckoview.test

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.MediumTest
import org.hamcrest.MatcherAssert.assertThat
import org.hamcrest.Matchers.equalTo
import org.hamcrest.Matchers.nullValue
import org.junit.After
import org.junit.Assert.assertThrows
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.gecko.EventDispatcher
import org.mozilla.gecko.util.BundleEventListener
import org.mozilla.gecko.util.GeckoBundle
import org.mozilla.geckoview.GeckoResult
import org.mozilla.geckoview.IPProtectionController

@RunWith(AndroidJUnit4::class)
@MediumTest
class IPProtectionControllerTest : BaseSessionTest() {

    private val ipProtectionController
        get() = sessionRule.runtime.ipProtectionController

    @Before
    fun setup() {
        sessionRule.setPrefsUntilTestEnd(
            mapOf(
                "browser.ipProtection.enabled" to true,
                "browser.ipProtection.cacheDisabled" to true,
                "browser.ipProtection.guardian.endpoint" to "https://vpn.mozilla.com",
                "browser.ipProtection.log" to true,
            ),
        )
    }

    @After
    fun teardown() {
        ipProtectionController.setDelegate(null)
        ipProtectionController.setAuthProvider(null)
        sessionRule.waitForResult(ipProtectionController.uninit())
    }

    @Test
    fun serviceStateInitializedAfterConstruction() {
        var serviceState = sessionRule.waitForResult(ipProtectionController.getServiceState())
        assertThat(
            "service state is uninitialized after construction",
            serviceState,
            equalTo(IPProtectionController.SERVICE_STATE_UNINITIALIZED),
        )
        sessionRule.waitForResult(ipProtectionController.init())
        serviceState = sessionRule.waitForResult(ipProtectionController.getServiceState())
        assertThat(
            "After Init we should be signed-out",
            serviceState,
                equalTo(IPProtectionController.SERVICE_STATE_UNAUTHENTICATED),
        )
    }

    private fun dispatchServiceState(bundle: GeckoBundle): Int {
        val result = GeckoResult<Int>()
        ipProtectionController.setDelegate(object : IPProtectionController.Delegate {
            override fun onServiceStateChanged(state: Int) {
                result.complete(state)
            }
        })
        EventDispatcher.getInstance()
            .dispatch("GeckoView:IPProtection:IPProtectionService:StateChanged", bundle)
        return sessionRule.waitForResult(result)
    }

    @Test
    fun delegateCalledOnServiceStateChange() {
        val delegate = object : IPProtectionController.Delegate {}
        ipProtectionController.setDelegate(delegate)
        assertThat(
            "getDelegate returns the delegate that was set",
            ipProtectionController.delegate,
            equalTo(delegate),
        )
    }

    @Test
    fun serviceStateCodesAreParsedCorrectly() {
        val states = listOf(
            "unauthenticated" to IPProtectionController.SERVICE_STATE_UNAUTHENTICATED,
            "unavailable" to IPProtectionController.SERVICE_STATE_UNAVAILABLE,
            "optedout" to IPProtectionController.SERVICE_STATE_OPTED_OUT,
            "ready" to IPProtectionController.SERVICE_STATE_READY,
        )
        for ((stateString, expectedCode) in states) {
            val bundle = GeckoBundle()
            bundle.putString("state", stateString)
            assertThat(dispatchServiceState(bundle), equalTo(expectedCode))
        }
    }

    private fun dispatchProxyState(bundle: GeckoBundle): IPProtectionController.ProxyState {
        val result = GeckoResult<IPProtectionController.ProxyState>()
        ipProtectionController.setDelegate(object : IPProtectionController.Delegate {
            override fun onProxyStateChanged(state: IPProtectionController.ProxyState) {
                result.complete(state)
            }
        })
        EventDispatcher.getInstance()
            .dispatch("GeckoView:IPProtection:IPPProxyManager:StateChanged", bundle)
        return sessionRule.waitForResult(result)
    }

    @Test
    fun proxyStateCodesAreParsedCorrectly() {
        val states = listOf(
            "not-ready" to IPProtectionController.ProxyState.NOT_READY,
            "ready" to IPProtectionController.ProxyState.READY,
            "activating" to IPProtectionController.ProxyState.ACTIVATING,
            "active" to IPProtectionController.ProxyState.ACTIVE,
            "error" to IPProtectionController.ProxyState.ERROR,
            "paused" to IPProtectionController.ProxyState.PAUSED,
        )
        for ((stateString, expectedCode) in states) {
            val bundle = GeckoBundle()
            bundle.putString("state", stateString)
            assertThat(dispatchProxyState(bundle).state, equalTo(expectedCode))
        }
    }

    @Test
    fun proxyStateErrorTypeIsNullWhenNotError() {
        val bundle = GeckoBundle()
        bundle.putString("state", "ready")
        assertThat(dispatchProxyState(bundle).errorType, nullValue())
    }

    @Test
    fun proxyStateErrorTypeIsPresentWhenError() {
        val bundle = GeckoBundle()
        bundle.putString("state", "error")
        bundle.putString("errorType", "dns_error")
        assertThat(dispatchProxyState(bundle).errorType, equalTo("dns_error"))
    }

    private fun dispatchUsageInfo(bundle: GeckoBundle): IPProtectionController.UsageInfo {
        val result = GeckoResult<IPProtectionController.UsageInfo>()
        ipProtectionController.setDelegate(object : IPProtectionController.Delegate {
            override fun onUsageChanged(info: IPProtectionController.UsageInfo) {
                result.complete(info)
            }
        })
        EventDispatcher.getInstance()
            .dispatch("GeckoView:IPProtection:IPPProxyManager:UsageChanged", bundle)
        return sessionRule.waitForResult(result)
    }

    @Test
    fun usageInfoIsParsedCorrectly() {
        val bundle = GeckoBundle()
        bundle.putLong("remaining", 1000L)
        bundle.putLong("max", 10000L)
        bundle.putString("resetTime", "2024-01-01T00:00:00Z")
        val info = dispatchUsageInfo(bundle)
        assertThat(info.remaining, equalTo(1000L))
        assertThat(info.max, equalTo(10000L))
        assertThat(info.resetTime, equalTo("2024-01-01T00:00:00Z"))
    }

    @Test
    fun activateRejectsWithIPProxyExceptionWhenNotReady() {
        val proxyState = sessionRule.waitForResult(ipProtectionController.getProxyState())
        assertThat(
            "proxy is not ready thus activate will throw when called",
            proxyState.state,
            equalTo(IPProtectionController.ProxyState.NOT_READY),
        )
        val thrown = assertThrows(IPProtectionController.IPProxyException::class.java) {
            sessionRule.waitForResult(ipProtectionController.activate())
        }
        assertThat(thrown.code, equalTo(IPProtectionController.IPProxyException.ERROR_UNKNOWN))
    }

    @Test
    fun ipProxyExceptionKnownErrorStringsMapToSpecificCodes() {
        val cases = listOf(
            "network-error" to IPProtectionController.IPProxyException.ERROR_NETWORK,
            "timeout-error" to IPProtectionController.IPProxyException.ERROR_TIMEOUT,
            "pass-unavailable" to IPProtectionController.IPProxyException.ERROR_PASS_UNAVAILABLE,
            "server-not-found" to IPProtectionController.IPProxyException.ERROR_SERVER_NOT_FOUND,
            "activation-canceled" to IPProtectionController.IPProxyException.ERROR_ACTIVATION_CANCELED,
        )
        for ((errorString, expectedCode) in cases) {
            assertThat(
                IPProtectionController.IPProxyException.fromErrorString(errorString).code,
                equalTo(expectedCode),
            )
        }
    }

    @Test
    fun ipProxyExceptionUnknownErrorStringsMapsToErrorUnknown() {
        val unknownStrings = listOf("generic-error", "catastrophic-error", "some-unknown-error", null)
        for (errorString in unknownStrings) {
            assertThat(
                IPProtectionController.IPProxyException.fromErrorString(errorString).code,
                equalTo(IPProtectionController.IPProxyException.ERROR_UNKNOWN),
            )
        }
    }

    @Test
    fun usageInfoResetTimeIsNullWhenAbsent() {
        val bundle = GeckoBundle()
        bundle.putLong("remaining", 0L)
        bundle.putLong("max", 5000L)
        val info = dispatchUsageInfo(bundle)
        assertThat(info.remaining, equalTo(0L))
        assertThat(info.max, equalTo(5000L))
        assertThat(info.resetTime, nullValue())
    }

    private class StubAuthProvider(
        private val token: GeckoResult<String> = GeckoResult.fromValue("stub-token"),
    ) : IPProtectionController.AuthProvider {
        override fun getToken(): GeckoResult<String> = token
    }

    @Test
    fun setAuthProviderRoundTrips() {
        val provider = StubAuthProvider()
        ipProtectionController.setAuthProvider(provider)
        assertThat(ipProtectionController.authProvider, equalTo<IPProtectionController.AuthProvider>(provider))
        ipProtectionController.setAuthProvider(null)
        assertThat(ipProtectionController.authProvider, nullValue())
    }

    @Test
    fun getTokenEventIsRoutedToAuthProvider() {
        ipProtectionController.setAuthProvider(
            StubAuthProvider(token = GeckoResult.fromValue("secret-token")),
        )
        val response = sessionRule.waitForResult(
            EventDispatcher.getInstance().queryBundle("GeckoView:IPProtection:GetToken"),
        )
        assertThat(response.getString("token"), equalTo("secret-token"))
    }

    @Test
    fun getTokenEventWithoutProviderReturnsError() {
        ipProtectionController.setAuthProvider(null)
        assertGetTokenError("no-auth-provider")
    }

    @Test
    fun getTokenEventWithRejectedTokenReturnsError() {
        ipProtectionController.setAuthProvider(
            StubAuthProvider(token = GeckoResult.fromException(RuntimeException("no-token"))),
        )
        assertGetTokenError("no-token")
    }

    @Test
    fun getTokenEventWithNullTokenStringReturnsError() {
        ipProtectionController.setAuthProvider(
            StubAuthProvider(token = GeckoResult.fromValue(null)),
        )
        assertGetTokenError("no-token")
    }

    @Test
    fun getTokenEventWithEmptyTokenStringReturnsError() {
        ipProtectionController.setAuthProvider(
            StubAuthProvider(token = GeckoResult.fromValue("")),
        )
        assertGetTokenError("no-token")
    }

    private fun assertGetTokenError(expected: String) {
        val thrown = assertThrows(RuntimeException::class.java) {
            sessionRule.waitForResult(
                EventDispatcher.getInstance().queryBundle("GeckoView:IPProtection:GetToken"),
            )
        }
        val cause = thrown.cause as EventDispatcher.QueryException
        assertThat(cause.data.toString(), equalTo(expected))
    }

    @Test
    fun notifySignInStateChangedDispatchesAuthStateChanged() {
        ipProtectionController.setAuthProvider(StubAuthProvider())
        val result = GeckoResult<Boolean>()
        val listener = BundleEventListener { _, message, callback ->
            result.complete(message.getBoolean("isSignedIn", false))
            callback?.sendSuccess(null)
        }
        EventDispatcher.getInstance()
            .registerUiThreadListener(listener, "GeckoView:IPProtection:AuthStateChanged")
        try {
            sessionRule.waitForResult(ipProtectionController.notifySignInStateChanged(true))
            assertThat(sessionRule.waitForResult(result), equalTo(true))
        } finally {
            EventDispatcher.getInstance()
                .unregisterUiThreadListener(listener, "GeckoView:IPProtection:AuthStateChanged")
        }
    }

    @Test
    fun notifySignInStateChangedRejectsWithoutAuthProvider() {
        ipProtectionController.setAuthProvider(null)
        assertThrows(IllegalStateException::class.java) {
            sessionRule.waitForResult(ipProtectionController.notifySignInStateChanged(true))
        }
    }
}
