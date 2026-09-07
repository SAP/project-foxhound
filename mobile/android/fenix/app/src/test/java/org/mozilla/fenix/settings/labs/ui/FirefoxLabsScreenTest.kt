/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.labs.ui

import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.mozilla.fenix.settings.labs.LabsItem
import org.mozilla.fenix.settings.labs.LabsItemSlugs
import org.mozilla.fenix.settings.labs.store.DialogState
import org.mozilla.fenix.settings.labs.store.LabsState
import org.mozilla.fenix.settings.labs.store.LabsStore
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.Theme

@RunWith(AndroidJUnit4::class)
class FirefoxLabsScreenTest {
    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `WHEN all labs items are unenrolled THEN the restore defaults button is disabled`() {
        val store = LabsStore(
            initialState = LabsState(
                labsItems = listOf(
                    LabsItem(
                        slug = LabsItemSlugs.HOMEPAGE_AS_NEW_TAB,
                        title = R.string.firefox_labs_homepage_as_a_new_tab,
                        description = R.string.firefox_labs_homepage_as_a_new_tab_description,
                        enrolled = false,
                        requiresRestart = true,
                    ),
                ),
                dialogState = DialogState.Closed,
            ),
        )

        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                FirefoxLabsScreen(
                    store = store,
                    onNavigationIconClick = {},
                    onShareFeedbackClick = {},
                )
            }
        }

        composeTestRule.onNodeWithText(
            testContext.getString(R.string.firefox_labs_restore_default_button_text),
        ).assertIsNotEnabled()
    }

    @Test
    fun `WHEN at least one labs item is enrolled THEN the restore defaults button is enabled`() {
        val store = LabsStore(
            initialState = LabsState(
                labsItems = listOf(
                    LabsItem(
                        slug = LabsItemSlugs.HOMEPAGE_AS_NEW_TAB,
                        title = R.string.firefox_labs_homepage_as_a_new_tab,
                        description = R.string.firefox_labs_homepage_as_a_new_tab_description,
                        enrolled = true,
                        requiresRestart = true,
                    ),
                ),
                dialogState = DialogState.Closed,
            ),
        )

        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                FirefoxLabsScreen(
                    store = store,
                    onNavigationIconClick = {},
                    onShareFeedbackClick = {},
                )
            }
        }

        composeTestRule.onNodeWithText(
            testContext.getString(R.string.firefox_labs_restore_default_button_text),
        ).assertIsEnabled()
    }

    @Test
    fun `WHEN a labs item has no feedback URL THEN the share feedback link is not displayed`() {
        val store = LabsStore(
            initialState = LabsState(
                labsItems = listOf(
                    LabsItem(
                        slug = LabsItemSlugs.HOMEPAGE_AS_NEW_TAB,
                        title = R.string.firefox_labs_homepage_as_a_new_tab,
                        description = R.string.firefox_labs_homepage_as_a_new_tab_description,
                        enrolled = false,
                        feedbackUrl = null,
                        requiresRestart = true,
                    ),
                ),
                dialogState = DialogState.Closed,
            ),
        )

        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                FirefoxLabsScreen(
                    store = store,
                    onNavigationIconClick = {},
                    onShareFeedbackClick = {},
                )
            }
        }

        composeTestRule.onNodeWithContentDescription(
            testContext.getString(
                R.string.firefox_labs_share_feedback_content_description,
                testContext.getString(R.string.firefox_labs_homepage_as_a_new_tab),
            ),
        ).assertDoesNotExist()
    }

    @Test
    fun `WHEN a labs item has a feedback URL THEN the share feedback link is displayed`() {
        val store = LabsStore(
            initialState = LabsState(
                labsItems = listOf(
                    LabsItem(
                        slug = LabsItemSlugs.HOMEPAGE_AS_NEW_TAB,
                        title = R.string.firefox_labs_homepage_as_a_new_tab,
                        description = R.string.firefox_labs_homepage_as_a_new_tab_description,
                        enrolled = false,
                        feedbackUrl = "https://connect.mozilla.org/",
                        requiresRestart = true,
                    ),
                ),
                dialogState = DialogState.Closed,
            ),
        )

        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                FirefoxLabsScreen(
                    store = store,
                    onNavigationIconClick = {},
                    onShareFeedbackClick = {},
                )
            }
        }

        composeTestRule.onNodeWithContentDescription(
            testContext.getString(
                R.string.firefox_labs_share_feedback_content_description,
                testContext.getString(R.string.firefox_labs_homepage_as_a_new_tab),
            ),
        ).assertExists()
    }

    @Test
    fun `WHEN tapping a labs item with requiresRestart=true THEN the toggle confirmation dialog is shown`() {
        val item = LabsItem(
            slug = LabsItemSlugs.HOMEPAGE_AS_NEW_TAB,
            title = R.string.firefox_labs_homepage_as_a_new_tab,
            description = R.string.firefox_labs_homepage_as_a_new_tab_description,
            enrolled = false,
            requiresRestart = true,
        )
        val store = LabsStore(
            initialState = LabsState(
                labsItems = listOf(item),
                dialogState = DialogState.Closed,
            ),
        )

        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                FirefoxLabsScreen(
                    store = store,
                    onNavigationIconClick = {},
                    onShareFeedbackClick = {},
                )
            }
        }

        composeTestRule.onNodeWithText(
            testContext.getString(R.string.firefox_labs_homepage_as_a_new_tab),
        ).performClick()

        composeTestRule.waitForIdle()
        assertEquals(DialogState.ToggleLabsItem(item), store.state.dialogState)
        assertFalse(store.state.labsItems.first().enrolled)
    }

    @Test
    fun `WHEN tapping a labs item with requiresRestart=false THEN the item is toggled directly with no dialog`() {
        val item = LabsItem(
            slug = LabsItemSlugs.HOMEPAGE_AS_NEW_TAB,
            title = R.string.firefox_labs_homepage_as_a_new_tab,
            description = R.string.firefox_labs_homepage_as_a_new_tab_description,
            enrolled = false,
            requiresRestart = false,
        )
        val store = LabsStore(
            initialState = LabsState(
                labsItems = listOf(item),
                dialogState = DialogState.Closed,
            ),
        )

        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                FirefoxLabsScreen(
                    store = store,
                    onNavigationIconClick = {},
                    onShareFeedbackClick = {},
                )
            }
        }

        composeTestRule.onNodeWithText(
            testContext.getString(R.string.firefox_labs_homepage_as_a_new_tab),
        ).performClick()

        composeTestRule.waitForIdle()
        assertEquals(DialogState.Closed, store.state.dialogState)
        assertTrue(store.state.labsItems.first().enrolled)
    }

    @Test
    fun `WHEN tapping Restore defaults AND an enrolled item requires restart THEN the restore defaults dialog is shown`() {
        val store = LabsStore(
            initialState = LabsState(
                labsItems = listOf(
                    LabsItem(
                        slug = LabsItemSlugs.HOMEPAGE_AS_NEW_TAB,
                        title = R.string.firefox_labs_homepage_as_a_new_tab,
                        description = R.string.firefox_labs_homepage_as_a_new_tab_description,
                        enrolled = true,
                        requiresRestart = true,
                    ),
                ),
                dialogState = DialogState.Closed,
            ),
        )

        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                FirefoxLabsScreen(
                    store = store,
                    onNavigationIconClick = {},
                    onShareFeedbackClick = {},
                )
            }
        }

        composeTestRule.onNodeWithText(
            testContext.getString(R.string.firefox_labs_restore_default_button_text),
        ).performClick()

        composeTestRule.waitForIdle()
        assertEquals(DialogState.RestoreDefaults, store.state.dialogState)
        assertTrue(store.state.labsItems.first().enrolled)
    }

    @Test
    fun `WHEN tapping Restore defaults AND no enrolled item requires restart THEN items are unenrolled with no dialog`() {
        val store = LabsStore(
            initialState = LabsState(
                labsItems = listOf(
                    LabsItem(
                        slug = LabsItemSlugs.HOMEPAGE_AS_NEW_TAB,
                        title = R.string.firefox_labs_homepage_as_a_new_tab,
                        description = R.string.firefox_labs_homepage_as_a_new_tab_description,
                        enrolled = true,
                        requiresRestart = false,
                    ),
                ),
                dialogState = DialogState.Closed,
            ),
        )

        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                FirefoxLabsScreen(
                    store = store,
                    onNavigationIconClick = {},
                    onShareFeedbackClick = {},
                )
            }
        }

        composeTestRule.onNodeWithText(
            testContext.getString(R.string.firefox_labs_restore_default_button_text),
        ).performClick()

        composeTestRule.waitForIdle()
        assertEquals(DialogState.Closed, store.state.dialogState)
        assertFalse(store.state.labsItems.first().enrolled)
    }
}
