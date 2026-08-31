/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.trackingprotection

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.helpers.lifecycle.TestLifecycleOwner
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.Theme

@RunWith(AndroidJUnit4::class)
class TrackersBlockedCardTest {
    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `when the longfox animation is not shown, the fox is not displayed`() {
        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                TrackersBlockedCard(
                    trackersBlockedCount = 3,
                    showLongfoxAnimation = false,
                )
            }
        }

        composeTestRule.onNodeWithTag(LONGFOX_FOX_IMAGE_TEST_TAG).assertDoesNotExist()
    }

    @Test
    fun `if the animation flag is cleared mid-animation the peek animation still runs to completion`() {
        // The animation is driven by the compose clock, so pause it to step through deterministically.
        composeTestRule.mainClock.autoAdvance = false

        var showLongfoxAnimation by mutableStateOf(true)
        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                TrackersBlockedCard(
                    trackersBlockedCount = 3,
                    showLongfoxAnimation = showLongfoxAnimation,
                )
            }
        }

        // The fox appears as soon as the animation starts, well before the sequence finishes.
        composeTestRule.mainClock.advanceTimeBy(100L)
        composeTestRule.onNodeWithTag(LONGFOX_FOX_IMAGE_TEST_TAG).assertExists()

        // The homepage consumes the entry point and clears the flag while the fox is still peeking.
        showLongfoxAnimation = false

        // The animation is latched, so it must keep running rather than being cancelled here.
        composeTestRule.mainClock.advanceTimeBy(20_000L)

        // Once the full peek/dwell/retract sequence ends, the fox is removed.
        composeTestRule.onNodeWithTag(LONGFOX_FOX_IMAGE_TEST_TAG).assertDoesNotExist()
    }

    @Test
    fun `when the card is backgrounded mid-animation the fox is removed instead of replaying its retract`() {
        // The animation is driven by the compose clock, so pause it to step through deterministically.
        composeTestRule.mainClock.autoAdvance = false

        val lifecycleOwner = TestLifecycleOwner(initialState = Lifecycle.State.RESUMED)
        composeTestRule.setContent {
            CompositionLocalProvider(LocalLifecycleOwner provides lifecycleOwner) {
                FirefoxTheme(theme = Theme.Light) {
                    TrackersBlockedCard(
                        trackersBlockedCount = 3,
                        showLongfoxAnimation = true,
                    )
                }
            }
        }

        // The fox is peeking out once the animation starts.
        composeTestRule.mainClock.advanceTimeBy(100L)
        composeTestRule.onNodeWithTag(LONGFOX_FOX_IMAGE_TEST_TAG).assertExists()

        // Sending the app to the background must reset the card to its hidden default state.
        composeTestRule.runOnUiThread { lifecycleOwner.onStop() }
        composeTestRule.mainClock.advanceTimeBy(100L)
        composeTestRule.onNodeWithTag(LONGFOX_FOX_IMAGE_TEST_TAG).assertDoesNotExist()

        // It must stay hidden rather than playing the retract transition when the app returns.
        composeTestRule.mainClock.advanceTimeBy(20_000L)
        composeTestRule.onNodeWithTag(LONGFOX_FOX_IMAGE_TEST_TAG).assertDoesNotExist()
    }

    @Test
    fun `when longfox is enabled, tapping the pill launches the game rather than the privacy report`() {
        var privacyReportTaps = 0
        var longfoxTaps = 0
        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                TrackersBlockedCard(
                    trackersBlockedCount = 3,
                    onPrivacyReportTapped = { privacyReportTaps++ },
                    onLongfoxEntryPointClicked = { longfoxTaps++ },
                    longfoxEnabled = true,
                )
            }
        }

        composeTestRule.onNodeWithTag(PROTECTION_STATUS_PILL_TEST_TAG).performClick()

        assertEquals(1, longfoxTaps)
        assertEquals(0, privacyReportTaps)
    }

    @Test
    fun `when longfox is disabled, tapping the pill opens the privacy report rather than the game`() {
        var privacyReportTaps = 0
        var longfoxTaps = 0
        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                TrackersBlockedCard(
                    trackersBlockedCount = 3,
                    onPrivacyReportTapped = { privacyReportTaps++ },
                    onLongfoxEntryPointClicked = { longfoxTaps++ },
                    longfoxEnabled = false,
                )
            }
        }

        composeTestRule.onNodeWithTag(PROTECTION_STATUS_PILL_TEST_TAG).performClick()

        assertEquals(1, privacyReportTaps)
        assertEquals(0, longfoxTaps)
    }

    @Test
    fun `pill routing is independent of the peek animation`() {
        // longfox enabled but no animation this view - the pill must still launch the game.
        var privacyReportTaps = 0
        var longfoxTaps = 0
        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                TrackersBlockedCard(
                    trackersBlockedCount = 3,
                    onPrivacyReportTapped = { privacyReportTaps++ },
                    onLongfoxEntryPointClicked = { longfoxTaps++ },
                    longfoxEnabled = true,
                    showLongfoxAnimation = false,
                )
            }
        }

        composeTestRule.onNodeWithTag(PROTECTION_STATUS_PILL_TEST_TAG).performClick()

        assertEquals(1, longfoxTaps)
        assertEquals(0, privacyReportTaps)
    }
}
