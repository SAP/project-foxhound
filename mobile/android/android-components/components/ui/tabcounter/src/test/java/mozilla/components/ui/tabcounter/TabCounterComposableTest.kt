/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.ui.tabcounter

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.ui.tabcounter.TabCounterTestTags.PRIVACY_BADGE
import mozilla.components.ui.tabcounter.TabCounterTestTags.TAB_COUNTER_ICON
import mozilla.components.ui.tabcounter.TabCounterTestTags.TAB_COUNTER_INFINITY_ICON
import mozilla.components.ui.tabcounter.TabCounterTestTags.TAB_COUNTER_TEXT
import mozilla.components.ui.tabcounter.TabCounterView.Companion.MAX_VISIBLE_TABS
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class TabCounterComposableTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun verifyNumericTabCount() {
        val tabCount = 10
        composeTestRule.setContent {
            AcornTheme {
                TabCounter(tabCount = tabCount)
            }
        }

        composeTestRule.onNodeWithTag(TAB_COUNTER_TEXT + tabCount.toString())
            .assertIsDisplayed()
        composeTestRule.onNodeWithTag(TAB_COUNTER_ICON)
            .assertIsDisplayed()
    }

    @Test
    fun verifyInfiniteTabCount() {
        val tabCount = MAX_VISIBLE_TABS + 1
        composeTestRule.setContent {
            AcornTheme {
                TabCounter(tabCount = tabCount)
            }
        }

        composeTestRule.onNodeWithTag(TAB_COUNTER_TEXT + tabCount.toString())
            .assertIsNotDisplayed()
        composeTestRule.onNodeWithTag(TAB_COUNTER_INFINITY_ICON)
            .assertIsDisplayed()
    }

    @Test
    fun verifyPrivacyBadgeVisible() {
        composeTestRule.setContent {
            AcornTheme {
                TabCounter(tabCount = 0, showPrivacyBadge = true)
            }
        }

        composeTestRule.onNodeWithTag(PRIVACY_BADGE)
            .assertIsDisplayed()
    }

    @Test
    fun verifyPrivacyBadgeHidden() {
        composeTestRule.setContent {
            AcornTheme {
                TabCounter(tabCount = 0, showPrivacyBadge = false)
            }
        }

        composeTestRule.onNodeWithTag(PRIVACY_BADGE)
            .assertIsNotDisplayed()
    }

    @Test
    fun verifyTabCountVisible() {
        val tabCount = 10
        composeTestRule.setContent {
            AcornTheme {
                TabCounter(tabCount = tabCount, showTabCount = true)
            }
        }

        composeTestRule.onNodeWithTag(TAB_COUNTER_TEXT + tabCount.toString())
            .assertIsDisplayed()
    }

    @Test
    fun verifyTabCountHidden() {
        val tabCount = 10
        composeTestRule.setContent {
            AcornTheme {
                TabCounter(tabCount = tabCount, showTabCount = false)
            }
        }

        composeTestRule.onNodeWithTag(TAB_COUNTER_TEXT + tabCount.toString())
            .assertIsNotDisplayed()
    }
}
