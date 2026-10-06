package org.mozilla.fenix.tabgroups.ui.tabgroups

import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.tabgroups.CloseLastTabAndDeleteTabGroupConfirmationDialog
import org.mozilla.fenix.tabgroups.TabGroupsTestTag
@RunWith(AndroidJUnit4::class)
class TabGroupCloseTabAndDeleteGroupConfirmationDialogTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun confirmCloseTabAndDeleteGroupDialogClickedTest() {
        var onConfirmInvoked = false

        composeTestRule.setContent {
            CloseLastTabAndDeleteTabGroupConfirmationDialog(
                onConfirmDelete = { onConfirmInvoked = true },
                onCancel = { },
            )
        }

        composeTestRule.onNodeWithTag(TabGroupsTestTag.CLOSE_LAST_TAB_AND_DELETE_DIALOG_CONFIRM_BUTTON)
            .performClick()

        Assert.assertTrue(onConfirmInvoked)
    }

    @Test
    fun cancelCloseTabAndDeleteGroupDialogClickedTest() {
        var onCancelInvoked = false

        composeTestRule.setContent {
            CloseLastTabAndDeleteTabGroupConfirmationDialog(
                onConfirmDelete = { },
                onCancel = { onCancelInvoked = true },
            )
        }

        composeTestRule.onNodeWithTag(TabGroupsTestTag.CLOSE_LAST_TAB_AND_DELETE_DIALOG_CANCEL_BUTTON)
            .performClick()

        Assert.assertTrue(onCancelInvoked)
    }
}
