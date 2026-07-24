/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.badge

import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.test.isDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onChild
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.ui.icons.R
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class BadgedIconTest {
    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `WHEN badge size is small THEN icon size is 24x24`() {
        val expectedSize = 24
        composeTestRule.setContent {
            BadgedIcon(
                modifier = Modifier.Companion.testTag("badgedIcon"),
                painter = painterResource(R.drawable.mozac_ic_download_24),
                isHighlighted = true,
                size = BADGE_SIZE_SMALL,
                notificationCount = 0,
            )
        }
        val badgedIcon = composeTestRule.onNodeWithTag("badgedIcon")
        val layoutInfo = badgedIcon.fetchSemanticsNode().layoutInfo
        assertEquals(expectedSize, layoutInfo.height)
        assertEquals(expectedSize, layoutInfo.width)
    }

    @Test
    fun `WHEN badge size is small THEN badge size is 8x8`() {
        val expectedSize = 8
        composeTestRule.setContent {
            BadgedIcon(
                modifier = Modifier.Companion.testTag("badgedIcon"),
                painter = painterResource(R.drawable.mozac_ic_download_24),
                isHighlighted = true,
                size = BADGE_SIZE_SMALL,
                notificationCount = 0,
            )
        }
        val badgedIcon = composeTestRule.onNodeWithTag("badgedIcon")
        val badge = badgedIcon.onChild()
        val layoutInfo = badge.fetchSemanticsNode().layoutInfo
        assertEquals(expectedSize, layoutInfo.width)
        assertEquals(expectedSize, layoutInfo.height)
    }

    @Test
    fun `WHEN badge size is large AND count is one digit THEN icon is 24x24`() {
        val expectedWidth = 24
        val expectedHeight = 24
        composeTestRule.setContent {
            BadgedIcon(
                modifier = Modifier.Companion.testTag("badgedIcon"),
                painter = painterResource(R.drawable.mozac_ic_download_24),
                isHighlighted = true,
                size = BADGE_SIZE_LARGE,
                notificationCount = 1,
            )
        }
        val badgedIcon = composeTestRule.onNodeWithTag("badgedIcon")
        val layoutInfo = badgedIcon.fetchSemanticsNode().layoutInfo
        assertEquals(expectedWidth, layoutInfo.width)
        assertEquals(expectedHeight, layoutInfo.height)
    }

    @Test
    fun `WHEN badge size is large AND count is one digit THEN badge size is 16x16`() {
        val expectedWidth = 16
        val expectedHeight = 16
        composeTestRule.setContent {
            BadgedIcon(
                modifier = Modifier.Companion.testTag("badgedIcon"),
                painter = painterResource(R.drawable.mozac_ic_download_24),
                isHighlighted = true,
                size = BADGE_SIZE_LARGE,
                notificationCount = 1,
            )
        }
        val badgedIcon = composeTestRule.onNodeWithTag("badgedIcon")
        val badge = badgedIcon.onChild()
        val layoutInfo = badge.fetchSemanticsNode().layoutInfo
        assertEquals(expectedWidth, layoutInfo.width)
        assertEquals(expectedHeight, layoutInfo.height)
    }

    @Test
    fun `WHEN badge size is large AND count is two digits THEN icon size is 24x24`() {
        val expectedWidth = 24
        val expectedHeight = 24
        composeTestRule.setContent {
            BadgedIcon(
                modifier = Modifier.Companion.testTag("badgedIcon"),
                painter = painterResource(R.drawable.mozac_ic_download_24),
                isHighlighted = true,
                size = BADGE_SIZE_LARGE,
                notificationCount = 10,
            )
        }
        val badgedIcon = composeTestRule.onNodeWithTag("badgedIcon")
        val layoutInfo = badgedIcon.fetchSemanticsNode().layoutInfo
        assertEquals(expectedWidth, layoutInfo.width)
        assertEquals(expectedHeight, layoutInfo.height)
    }

    @Test
    fun `WHEN badge size is large AND count is two digits THEN badge size is 16x16dp`() {
        val expectedWidth = 16
        val expectedHeight = 16
        composeTestRule.setContent {
            BadgedIcon(
                modifier = Modifier.Companion.testTag("badgedIcon"),
                painter = painterResource(R.drawable.mozac_ic_download_24),
                isHighlighted = true,
                size = BADGE_SIZE_LARGE,
                notificationCount = 10,
            )
        }
        val badgedIcon = composeTestRule.onNodeWithTag("badgedIcon")
        val badge = badgedIcon.onChild()
        val layoutInfo = badge.fetchSemanticsNode().layoutInfo
        assertEquals(expectedWidth, layoutInfo.width)
        assertEquals(expectedHeight, layoutInfo.height)
    }

    @Test
    fun `WHEN badge size is large AND count is three digits THEN icon size is 24x24`() {
        val expectedWidth = 24
        val expectedHeight = 24
        composeTestRule.setContent {
            BadgedIcon(
                modifier = Modifier.Companion.testTag("badgedIcon"),
                painter = painterResource(R.drawable.mozac_ic_download_24),
                isHighlighted = true,
                size = BADGE_SIZE_LARGE,
                notificationCount = 999,
            )
        }
        val badgedIcon = composeTestRule.onNodeWithTag("badgedIcon")
        val layoutInfo = badgedIcon.fetchSemanticsNode().layoutInfo
        assertEquals(expectedWidth, layoutInfo.width)
        assertEquals(expectedHeight, layoutInfo.height)
    }

    @Test
    fun `WHEN badge size is large AND count is max int THEN badge size is 16x16dp`() {
        val expectedWidth = 16
        val expectedHeight = 16
        composeTestRule.setContent {
            BadgedIcon(
                modifier = Modifier.Companion.testTag("badgedIcon"),
                painter = painterResource(R.drawable.mozac_ic_download_24),
                isHighlighted = true,
                size = BADGE_SIZE_LARGE,
                notificationCount = Int.MAX_VALUE,
            )
        }
        val badgedIcon = composeTestRule.onNodeWithTag("badgedIcon")
        val badge = badgedIcon.onChild()
        val layoutInfo = badge.fetchSemanticsNode().layoutInfo
        assertEquals(expectedWidth, layoutInfo.width)
        assertEquals(expectedHeight, layoutInfo.height)
    }

    @Test
    fun `WHEN badge size is large AND count is three digits THEN badge size is 16x16dp`() {
        val expectedWidth = 16
        val expectedHeight = 16
        composeTestRule.setContent {
            BadgedIcon(
                modifier = Modifier.Companion.testTag("badgedIcon"),
                painter = painterResource(R.drawable.mozac_ic_download_24),
                isHighlighted = true,
                size = BADGE_SIZE_LARGE,
                notificationCount = 999,
            )
        }
        val badgedIcon = composeTestRule.onNodeWithTag("badgedIcon")
        val badge = badgedIcon.onChild()
        val layoutInfo = badge.fetchSemanticsNode().layoutInfo
        assertEquals(expectedWidth, layoutInfo.width)
        assertEquals(expectedHeight, layoutInfo.height)
    }

    @Test
    fun `WHEN badge size is small THEN count is NOT displayed`() {
        composeTestRule.setContent {
            BadgedIcon(
                modifier = Modifier.Companion.testTag("badgedIcon"),
                painter = painterResource(R.drawable.mozac_ic_download_24),
                isHighlighted = true,
                size = BADGE_SIZE_SMALL,
                notificationCount = 10,
            )
        }
        val textField = composeTestRule.onNodeWithText("10")
        assertFalse(textField.isDisplayed())
    }

    @Test
    fun `WHEN badge size is large THEN count is displayed`() {
        composeTestRule.setContent {
            BadgedIcon(
                modifier = Modifier.Companion.testTag("badgedIcon"),
                painter = painterResource(R.drawable.mozac_ic_download_24),
                isHighlighted = true,
                size = BADGE_SIZE_LARGE,
                notificationCount = 10,
            )
        }
        val textField = composeTestRule.onNodeWithText("10")
        assertTrue(textField.isDisplayed())
    }

    @Test
    fun `WHEN badge size is large AND count is one digit THEN entire count is displayed`() {
        composeTestRule.setContent {
            BadgedIcon(
                modifier = Modifier.Companion.testTag("badgedIcon"),
                painter = painterResource(R.drawable.mozac_ic_download_24),
                isHighlighted = true,
                size = BADGE_SIZE_LARGE,
                notificationCount = 1,
            )
        }
        val textField = composeTestRule.onNodeWithText("1")
        assertTrue(textField.isDisplayed())
    }

    @Test
    fun `WHEN badge size is large AND count is two digits THEN entire count is displayed`() {
        composeTestRule.setContent {
            BadgedIcon(
                modifier = Modifier.Companion.testTag("badgedIcon"),
                painter = painterResource(R.drawable.mozac_ic_download_24),
                isHighlighted = true,
                size = BADGE_SIZE_LARGE,
                notificationCount = 20,
            )
        }
        val textField = composeTestRule.onNodeWithText("20")
        assertTrue(textField.isDisplayed())
    }

    @Test
    fun `WHEN badge size is large AND count is three digits THEN infinity symbol is displayed`() {
        composeTestRule.setContent {
            BadgedIcon(
                modifier = Modifier.Companion.testTag("badgedIcon"),
                painter = painterResource(R.drawable.mozac_ic_download_24),
                isHighlighted = true,
                size = BADGE_SIZE_LARGE,
                notificationCount = 100,
            )
        }
        val textField = composeTestRule.onNodeWithText("∞")
        assertTrue(textField.isDisplayed())
    }

    @Test
    fun `WHEN badge size is large AND count is int max THEN infinity symbol is displayed`() {
        composeTestRule.setContent {
            BadgedIcon(
                modifier = Modifier.Companion.testTag("badgedIcon"),
                painter = painterResource(R.drawable.mozac_ic_download_24),
                isHighlighted = true,
                size = BADGE_SIZE_LARGE,
                notificationCount = Int.MAX_VALUE,
            )
        }
        val textField = composeTestRule.onNodeWithText("∞")
        assertTrue(textField.isDisplayed())
    }

    @Test
    fun `WHEN badge size is large AND not highlighted THEN only the icon is displayed`() {
        composeTestRule.setContent {
            BadgedIcon(
                modifier = Modifier.Companion.testTag("badgedIcon"),
                painter = painterResource(R.drawable.mozac_ic_download_24),
                isHighlighted = false,
                size = BADGE_SIZE_LARGE,
                notificationCount = 100,
            )
        }
        val icon = composeTestRule.onNodeWithTag("badgedIcon")
        assertTrue(icon.isDisplayed())
        val badge = icon.onChild()
        assertFalse(badge.isDisplayed())
    }

    @Test
    fun `WHEN badge size is small AND not highlighted THEN only the icon is displayed`() {
        composeTestRule.setContent {
            BadgedIcon(
                modifier = Modifier.Companion.testTag("badgedIcon"),
                painter = painterResource(R.drawable.mozac_ic_download_24),
                isHighlighted = false,
                size = BADGE_SIZE_SMALL,
                notificationCount = 100,
            )
        }
        val icon = composeTestRule.onNodeWithTag("badgedIcon")
        assertTrue(icon.isDisplayed())
        val badge = icon.onChild()
        assertFalse(badge.isDisplayed())
    }
}
