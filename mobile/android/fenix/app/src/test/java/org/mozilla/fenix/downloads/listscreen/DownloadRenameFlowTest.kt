package org.mozilla.fenix.downloads.listscreen

import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextReplacement
import androidx.compose.ui.text.input.TextFieldValue
import androidx.test.ext.junit.runners.AndroidJUnit4
import junit.framework.TestCase.assertFalse
import junit.framework.TestCase.assertTrue
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.downloads.listscreen.store.RenameFileError

@RunWith(AndroidJUnit4::class)
class DownloadRenameFlowTest {
    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `GIVEN changed filename WHEN checking confirm button THEN button is enabled`() {
        val result = enableConfirmButton(
            originalFileName = "document.pdf",
            newFileName = "new_document.pdf",
        )

        assertTrue(result)
    }

    @Test
    fun `GIVEN only extension changed WHEN checking confirm button THEN button is enabled`() {
        val result = enableConfirmButton(
            originalFileName = "document.pdf",
            newFileName = "document.txt",
        )

        assertTrue(result)
    }

    @Test
    fun `GIVEN unchanged filename WHEN checking confirm button THEN button is disabled`() {
        val result = enableConfirmButton(
            originalFileName = "document.pdf",
            newFileName = "document.pdf",
        )

        assertFalse(result)
    }

    @Test
    fun `GIVEN blank filename WHEN checking confirm button THEN button is disabled`() {
        val result = enableConfirmButton(
            originalFileName = "document.pdf",
            newFileName = "",
        )

        assertFalse(result)
    }

    @Test
    fun `GIVEN whitespace only filename WHEN checking confirm button THEN button is disabled`() {
        val result = enableConfirmButton(
            originalFileName = "document.pdf",
            newFileName = "   ",
        )

        assertFalse(result)
    }

    @Test
    fun `GIVEN blank base name with extension WHEN checking confirm button THEN button is disabled`() {
        val result = enableConfirmButton(
            originalFileName = "document.pdf",
            newFileName = ".pdf",
        )

        assertFalse(result)
    }

    @Test
    fun `GIVEN filename containing slash WHEN checking confirm button THEN button is disabled`() {
        val result = enableConfirmButton(
            originalFileName = "document.pdf",
            newFileName = "doc/ument.pdf",
        )

        assertFalse(result)
    }

    @Test
    fun `GIVEN filename containing NUL WHEN checking confirm button THEN button is disabled`() {
        val result = enableConfirmButton(
            originalFileName = "document.pdf",
            newFileName = "doc\u0000ument.pdf",
        )

        assertFalse(result)
    }

    @Test
    fun `GIVEN there is an error WHEN checking confirm button THEN button is disabled`() {
        val result = enableConfirmButton(
            originalFileName = "document.pdf",
            newFileName = "   ",
            currentError = RenameFileError.CannotRename,
        )

        assertFalse(result)
    }

    @Test
    fun `GIVEN a valid file name change WHEN clicking confirm button THEN onConfirmSave is called `() {
        var confirmedName: String? = null
        var cancelled = false
        val fileNameState = mutableStateOf(TextFieldValue("original.pdf"))

        composeTestRule.setContent {
            DownloadRenameDialog(
                originalFileName = "original.pdf",
                error = null,
                fileNameState = fileNameState.value,
                onFileNameChange = { fileNameState.value = it },
                onConfirmSave = { confirmedName = it },
                onCancel = { cancelled = true },
                onCannotRenameDismiss = {},
            )
        }

        composeTestRule
            .onNodeWithTag(DownloadsListTestTag.RENAME_DIALOG_TEXT_FIELD)
            .performTextReplacement("renamed.pdf")

        composeTestRule
            .onNodeWithTag(DownloadsListTestTag.RENAME_DIALOG_CONFIRM_BUTTON)
            .assertIsEnabled()
            .performClick()

        composeTestRule.runOnIdle {
            assertFalse(cancelled)
            assertEquals("renamed.pdf", confirmedName)
        }
    }

    @Test
    fun `GIVEN the rename dialog is show WHEN cancel is clicked THEN onCancel is called`() {
        var cancelled = false
        var fileNameState = TextFieldValue("original.pdf")

        composeTestRule.setContent {
            DownloadRenameDialog(
                originalFileName = "original.pdf",
                error = null,
                fileNameState = fileNameState,
                onFileNameChange = { fileNameState = it },
                onConfirmSave = {},
                onCancel = { cancelled = true },
                onCannotRenameDismiss = {},
            )
        }

        composeTestRule
            .onNodeWithTag(DownloadsListTestTag.RENAME_DIALOG_CANCEL_BUTTON)
            .performClick()

        composeTestRule.runOnIdle {
            assertTrue(cancelled)
        }
    }

    @Test
    fun `GIVEN the rename dialog is shown WHEN proposed file name has a slash THEN the field is in an error state`() {
        val fileNameState = mutableStateOf(TextFieldValue("original.pdf"))
        composeTestRule.setContent {
            DownloadRenameDialog(
                originalFileName = "original.pdf",
                error = null,
                fileNameState = fileNameState.value,
                onFileNameChange = { fileNameState.value = it },
                onConfirmSave = {},
                onCancel = {},
                onCannotRenameDismiss = {},
            )
        }

        composeTestRule
            .onNodeWithTag(DownloadsListTestTag.RENAME_DIALOG_TEXT_FIELD)
            .performTextReplacement("bad/name")

        composeTestRule.waitForIdle()

        composeTestRule
            .onNodeWithTag(DownloadsListTestTag.RENAME_DIALOG_TEXT_FIELD)
            .assert(SemanticsMatcher.keyIsDefined(SemanticsProperties.Error))
    }

    @Test
    fun `GIVEN the rename dialog is shown WHEN proposed file name already exists THEN the field is in an error state`() {
        var fileNameState = TextFieldValue("file.pdf")
        composeTestRule.setContent {
            DownloadRenameDialog(
                originalFileName = "file.pdf",
                error = RenameFileError.NameAlreadyExists(proposedFileName = "file.pdf"),
                fileNameState = fileNameState,
                onFileNameChange = { fileNameState = it },
                onConfirmSave = {},
                onCancel = {},
                onCannotRenameDismiss = {},
            )
        }

        composeTestRule.waitForIdle()

        composeTestRule
            .onNodeWithTag(DownloadsListTestTag.RENAME_DIALOG_TEXT_FIELD)
            .assert(SemanticsMatcher.keyIsDefined(SemanticsProperties.Error))
    }
}
