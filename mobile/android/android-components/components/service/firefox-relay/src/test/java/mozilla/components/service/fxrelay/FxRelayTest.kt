/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxrelay

import kotlinx.coroutines.test.runTest
import mozilla.appservices.relay.BounceStatus
import mozilla.appservices.relay.RelayClientInterface
import mozilla.appservices.relay.RelayProfile
import mozilla.components.concept.sync.AccessTokenInfo
import mozilla.components.concept.sync.OAuthAccount
import mozilla.components.service.fxrelay.eligibility.RelayPlanTier
import mozilla.components.support.test.any
import mozilla.components.support.test.mock
import mozilla.components.support.test.whenever
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class FxRelayTest {

    @Test
    fun `GIVEN free tier with 0 masks WHEN fetchAccountDetails THEN totalMasksUsed is 0`() = runTest {
        val profile = createMockProfile(hasPremium = false, hasMegabundle = false, totalMasks = 0L)
        val fxRelay = createFxRelayWithMockProfile(profile)

        val result = fxRelay.fetchAccountDetails()

        assertNotNull(result)
        assertEquals(RelayPlanTier.FREE, result?.relayPlanTier)
        assertEquals(0, result?.totalMasksUsed)
    }

    @Test
    fun `GIVEN free tier with 1 mask WHEN fetchAccountDetails THEN totalMasksUsed is 1`() = runTest {
        val profile = createMockProfile(hasPremium = false, hasMegabundle = false, totalMasks = 1L)
        val fxRelay = createFxRelayWithMockProfile(profile)

        val result = fxRelay.fetchAccountDetails()

        assertNotNull(result)
        assertEquals(RelayPlanTier.FREE, result?.relayPlanTier)
        assertEquals(1, result?.totalMasksUsed)
    }

    // A free tier can have existing email masks higher than the tier limit if they were previously a premium user.
    @Test
    fun `GIVEN free tier with 6 masks WHEN fetchAccountDetails THEN totalMasksUsed is 6`() = runTest {
        val profile = createMockProfile(hasPremium = false, hasMegabundle = false, totalMasks = 6L)
        val fxRelay = createFxRelayWithMockProfile(profile)

        val result = fxRelay.fetchAccountDetails()

        assertNotNull(result)
        assertEquals(RelayPlanTier.FREE, result?.relayPlanTier)
        assertEquals(6, result?.totalMasksUsed)
    }

    @Test
    fun `GIVEN premium tier with 6 masks WHEN fetchAccountDetails THEN totalMasksUsed is 6`() = runTest {
        val profile = createMockProfile(hasPremium = true, hasMegabundle = false, totalMasks = 6L)
        val fxRelay = createFxRelayWithMockProfile(profile)

        val result = fxRelay.fetchAccountDetails()

        assertNotNull(result)
        assertEquals(RelayPlanTier.PREMIUM, result?.relayPlanTier)
        assertEquals(6, result?.totalMasksUsed)
    }

    private fun createMockProfile(
        hasPremium: Boolean,
        hasMegabundle: Boolean,
        totalMasks: Long,
    ): RelayProfile {
        return RelayProfile(
            id = 0L,
            serverStorage = true,
            storePhoneLog = false,
            subdomain = "",
            hasPhone = false,
            hasVpn = false,
            hasPremium = hasPremium,
            hasMegabundle = hasMegabundle,
            onboardingState = 0L,
            onboardingFreeState = 0L,
            datePhoneRegistered = null,
            dateSubscribed = null,
            avatar = "avatar-url",
            nextEmailTry = "",
            bounceStatus = BounceStatus(paused = false, bounceType = ""),
            apiToken = "api-token",
            emailsBlocked = 0L,
            emailsForwarded = 0L,
            emailsReplied = 0L,
            levelOneTrackersBlocked = 0L,
            removeLevelOneEmailTrackers = false,
            totalMasks = totalMasks,
            atMaskLimit = false,
            metricsEnabled = true,
        )
    }

    private suspend fun createFxRelayWithMockProfile(profile: RelayProfile): FxRelayImpl {
        val account = mock<OAuthAccount>()
        val accessToken = AccessTokenInfo(
            scope = "https://identity.mozilla.com/apps/relay",
            token = "test-token",
            key = null,
            expiresAt = Long.MAX_VALUE,
        )
        whenever(account.getAccessToken(any())).thenReturn(accessToken)

        val mockClient = mock<RelayClientInterface>()
        whenever(mockClient.fetchProfile()).thenReturn(profile)

        return FxRelayImpl(
            account = account,
            relayClientProvider = { mockClient },
        )
    }
}
