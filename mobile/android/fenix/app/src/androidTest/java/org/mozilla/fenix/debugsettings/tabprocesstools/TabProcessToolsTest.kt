/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.debugsettings.tabprocesstools

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.perf.ProcessExitRecord
import org.mozilla.fenix.theme.FirefoxTheme
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@RunWith(AndroidJUnit4::class)
class TabProcessToolsTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    private val today = dateFormat.format(Date())
    private val yesterday = Calendar.getInstance().apply {
        add(Calendar.DAY_OF_YEAR, -1)
    }.let { dateFormat.format(it.time) }

    @Test
    fun emptyStateIsShownWhenNoProcessExitsExist() {
        composeTestRule.setContent {
            FirefoxTheme {
                TabProcessTools(processExitsProvider = { emptyList() })
            }
        }

        composeTestRule.onNodeWithText("No process exits recorded.").assertIsDisplayed()
    }

    @Test
    fun exitRecordFieldsAreDisplayedWhenProcessExitsExist() {
        val exit = ProcessExitRecord(
            date = "$today 08:30:00",
            reason = "crash_native",
            processType = "content",
            importance = "cached",
            pssInMb = 245,
            rssInMb = 312,
        )

        composeTestRule.setContent {
            FirefoxTheme {
                TabProcessTools(processExitsProvider = { listOf(exit) })
            }
        }

        composeTestRule.onNodeWithText("Today").assertIsDisplayed()
        composeTestRule.onNodeWithText("08:30:00").assertIsDisplayed()
        composeTestRule.onNodeWithText("Reason: crash_native").assertIsDisplayed()
        composeTestRule.onNodeWithText("Process: content").assertIsDisplayed()
        composeTestRule.onNodeWithText("Importance: cached").assertIsDisplayed()
        composeTestRule.onNodeWithText("PSS: 245 MB / RSS: 312 MB").assertIsDisplayed()
    }

    @Test
    fun sectionHeadersAreShownForTodayYesterdayAndOlderDates() {
        val exits = listOf(
            ProcessExitRecord(
                date = "$today 09:00:00",
                reason = "crash_native",
                processType = "content",
                importance = "cached",
                pssInMb = 245,
                rssInMb = 312,
            ),
            ProcessExitRecord(
                date = "$yesterday 21:15:42",
                reason = "low_memory",
                processType = "parent",
                importance = "foreground",
                pssInMb = 180,
                rssInMb = 220,
            ),
            ProcessExitRecord(
                date = "2024-01-01 14:00:00",
                reason = "anr",
                processType = "content",
                importance = "cached",
                pssInMb = 300,
                rssInMb = 400,
            ),
        )

        composeTestRule.setContent {
            FirefoxTheme {
                TabProcessTools(processExitsProvider = { exits })
            }
        }

        composeTestRule.onNodeWithText("Today").assertIsDisplayed()
        composeTestRule.onNodeWithText("Yesterday").assertIsDisplayed()
        composeTestRule.onNodeWithText("2024-01-01").assertIsDisplayed()
    }

    @Test
    fun filterButtonShowsAllTypesByDefault() {
        val exits = listOf(
            ProcessExitRecord(
                date = "$today 09:00:00",
                reason = "crash_native",
                processType = "content",
                importance = "cached",
                pssInMb = 245,
                rssInMb = 312,
            ),
            ProcessExitRecord(
                date = "$today 08:00:00",
                reason = "signaled",
                processType = "gpu",
                importance = "foreground_service",
                pssInMb = 100,
                rssInMb = 120,
            ),
        )

        composeTestRule.setContent {
            FirefoxTheme {
                TabProcessTools(processExitsProvider = { exits })
            }
        }

        composeTestRule.onNodeWithText("All types").assertIsDisplayed()
    }

    @Test
    fun filterDropdownShowsAvailableTypesWhenOpened() {
        val exits = listOf(
            ProcessExitRecord(
                date = "$today 09:00:00",
                reason = "crash_native",
                processType = "content",
                importance = "cached",
                pssInMb = 245,
                rssInMb = 312,
            ),
            ProcessExitRecord(
                date = "$today 08:00:00",
                reason = "signaled",
                processType = "gpu",
                importance = "foreground_service",
                pssInMb = 100,
                rssInMb = 120,
            ),
        )

        composeTestRule.setContent {
            FirefoxTheme {
                TabProcessTools(processExitsProvider = { exits })
            }
        }

        composeTestRule.onNodeWithText("All types").performClick()

        composeTestRule.onNodeWithText("content").assertIsDisplayed()
        composeTestRule.onNodeWithText("gpu").assertIsDisplayed()
    }

    @Test
    fun exitsForDeselectedTypeAreHiddenFromList() {
        val exits = listOf(
            ProcessExitRecord(
                date = "$today 09:00:00",
                reason = "crash_native",
                processType = "content",
                importance = "cached",
                pssInMb = 245,
                rssInMb = 312,
            ),
            ProcessExitRecord(
                date = "$today 08:00:00",
                reason = "signaled",
                processType = "gpu",
                importance = "foreground_service",
                pssInMb = 100,
                rssInMb = 120,
            ),
        )

        composeTestRule.setContent {
            FirefoxTheme {
                TabProcessTools(processExitsProvider = { exits })
            }
        }

        composeTestRule.onNodeWithText("All types").performClick()
        composeTestRule.onNodeWithText("gpu").performClick()

        composeTestRule.onNodeWithText("Reason: signaled").assertDoesNotExist()
        composeTestRule.onNodeWithText("Reason: crash_native").assertIsDisplayed()
    }

    @Test
    fun reselectedTypeExitsAreRestoredInList() {
        val exits = listOf(
            ProcessExitRecord(
                date = "$today 09:00:00",
                reason = "crash_native",
                processType = "content",
                importance = "cached",
                pssInMb = 245,
                rssInMb = 312,
            ),
            ProcessExitRecord(
                date = "$today 08:00:00",
                reason = "signaled",
                processType = "gpu",
                importance = "foreground_service",
                pssInMb = 100,
                rssInMb = 120,
            ),
        )

        composeTestRule.setContent {
            FirefoxTheme {
                TabProcessTools(processExitsProvider = { exits })
            }
        }

        // Open dropdown and deselect gpu — dropdown stays open after item click
        composeTestRule.onNodeWithText("All types").performClick()
        composeTestRule.onNodeWithText("gpu").performClick()
        composeTestRule.onNodeWithText("Reason: signaled").assertDoesNotExist()

        // Reselect gpu in the same still-open dropdown session
        composeTestRule.onNodeWithText("gpu").performClick()
        composeTestRule.onNodeWithText("Reason: signaled").assertIsDisplayed()
    }

    @Test
    fun filterButtonShowsNoTypesWhenAllTypesDeselected() {
        val exits = listOf(
            ProcessExitRecord(
                date = "$today 09:00:00",
                reason = "crash_native",
                processType = "content",
                importance = "cached",
                pssInMb = 245,
                rssInMb = 312,
            ),
        )

        composeTestRule.setContent {
            FirefoxTheme {
                TabProcessTools(processExitsProvider = { exits })
            }
        }

        composeTestRule.onNodeWithText("All types").performClick()
        composeTestRule.onNodeWithText("content").performClick()

        composeTestRule.onNodeWithText("No types").assertIsDisplayed()
    }

    @Test
    fun emptyStateIsShownWhenAllTypesDeselected() {
        val exits = listOf(
            ProcessExitRecord(
                date = "$today 09:00:00",
                reason = "crash_native",
                processType = "content",
                importance = "cached",
                pssInMb = 245,
                rssInMb = 312,
            ),
        )

        composeTestRule.setContent {
            FirefoxTheme {
                TabProcessTools(processExitsProvider = { exits })
            }
        }

        composeTestRule.onNodeWithText("All types").performClick()
        composeTestRule.onNodeWithText("content").performClick()

        composeTestRule.onNodeWithText("No process exits recorded.").assertIsDisplayed()
    }
}
