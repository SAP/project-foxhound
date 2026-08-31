package org.mozilla.fenix.tabgroups

import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class TabGroupDeleteConfirmationDialogTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun confirmTabGroupDeleteDialogClickedTest() {
        var onConfirmInvoked = false

        composeTestRule.setContent {
            DeleteTabGroupConfirmationDialog(
                onConfirmDelete = { onConfirmInvoked = true },
                onCancel = { },
            )
        }

        composeTestRule.onNodeWithTag(TabGroupsTestTag.DELETE_DIALOG_CONFIRM_BUTTON)
            .performClick()

        assertTrue(onConfirmInvoked)
    }

    @Test
    fun cancelTabGroupDeleteDialogClickedTest() {
        var onCancelInvoked = false

        composeTestRule.setContent {
            DeleteTabGroupConfirmationDialog(
                onConfirmDelete = { },
                onCancel = { onCancelInvoked = true },
            )
        }

        composeTestRule.onNodeWithTag(TabGroupsTestTag.DELETE_DIALOG_CANCEL_BUTTON)
            .performClick()

        assertTrue(onCancelInvoked)
    }
}
