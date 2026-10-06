/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui

import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.webcompat.BrokenSiteReporterTestTags
import org.mozilla.fenix.webcompat.ui.EditUrlConfirmationDialog

@RunWith(AndroidJUnit4::class)
class WebCompatReporterEditUrlDialogTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun saveButtonClickedTest() {
        var saveInvoked = false

        composeTestRule.setContent {
            FirefoxTheme {
                EditUrlConfirmationDialog(
                    url = "https://www.example.com",
                    onUrlChange = {},
                    isError = false,
                    onSave = { saveInvoked = true },
                    onDismiss = {},
                )
            }
        }

        composeTestRule
            .onNodeWithTag(BrokenSiteReporterTestTags.BROKEN_SITE_REPORTER_EDIT_URL_DIALOG_SAVE_BUTTON)
            .performClick()

        assertTrue(saveInvoked)
    }

    @Test
    fun dismissButtonClickedTest() {
        var dismissInvoked = false

        composeTestRule.setContent {
            FirefoxTheme {
                EditUrlConfirmationDialog(
                    url = "https://www.example.com",
                    onUrlChange = {},
                    isError = false,
                    onSave = {},
                    onDismiss = { dismissInvoked = true },
                )
            }
        }

        composeTestRule
            .onNodeWithTag(BrokenSiteReporterTestTags.BROKEN_SITE_REPORTER_EDIT_URL_DIALOG_DISMISS_BUTTON)
            .performClick()

        assertTrue(dismissInvoked)
    }
}
