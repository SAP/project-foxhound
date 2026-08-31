/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:OptIn(ExperimentalAndroidComponentsApi::class)

package mozilla.components.feature.ipprotection.debug

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import mozilla.components.ExperimentalAndroidComponentsApi
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.concept.engine.ipprotection.ServiceState
import mozilla.components.feature.ipprotection.store.state.AccountState
import mozilla.components.feature.ipprotection.store.state.AccountStatus
import mozilla.components.feature.ipprotection.store.state.Authorized
import mozilla.components.feature.ipprotection.store.state.EligibilityStatus
import mozilla.components.feature.ipprotection.store.state.IPProtectionState
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class IPProtectionStateDebugTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `WHEN rendered with a populated state THEN section headers and values are displayed`() {
        composeTestRule.setContent {
            AcornTheme {
                IPProtectionStateDebugContent(state = populatedState)
            }
        }

        composeTestRule.onNodeWithText("IP Protection Debug UI").assertExists()
        composeTestRule.onNodeWithText("Eligibility").assertExists()
        composeTestRule.onNodeWithText("IP Protection").assertExists()
        composeTestRule.onNodeWithText("Data usage").assertExists()
        composeTestRule.onNodeWithText("Account").assertExists()
        composeTestRule.onNodeWithText("VPN UI").assertExists()

        composeTestRule.onNodeWithText("Eligible").assertExists()
        composeTestRule.onNodeWithText("Active").assertExists()
        composeTestRule.onNodeWithText("Ready").assertExists()
        composeTestRule.onNodeWithText("EnrolledAndEntitled").assertExists()
        composeTestRule.onNodeWithText("2026-06-01").assertExists()
        composeTestRule.onNodeWithText("true").assertExists()
    }

    @Test
    fun `WHEN lastError is null THEN the null placeholder is displayed`() {
        composeTestRule.setContent {
            AcornTheme {
                IPProtectionStateDebugContent(state = IPProtectionState(lastError = null))
            }
        }

        composeTestRule.onNodeWithText("lastError").assertExists()
        // resetDate, lastError, and activate all default to "null" placeholders.
        composeTestRule.onAllNodesWithText("null").assertCountEquals(3)
    }

    @Test
    fun `WHEN lastError has a value THEN that value is displayed`() {
        composeTestRule.setContent {
            AcornTheme {
                IPProtectionStateDebugContent(
                    state = IPProtectionState(lastError = "network-error"),
                )
            }
        }

        composeTestRule.onNodeWithText("network-error").assertExists()
    }

    private val populatedState = IPProtectionState(
        eligibilityStatus = EligibilityStatus.Eligible,
        proxyStatus = Authorized.Active,
        serviceStatus = ServiceState.Ready,
        remainingDataBytes = 2_000_000_000L,
        maxDataBytes = 5_000_000_000L,
        resetDate = "2026-06-01",
        accountState = AccountState(status = AccountStatus.EnrolledAndEntitled),
        lastError = null,
        activate = true,
    )
}
