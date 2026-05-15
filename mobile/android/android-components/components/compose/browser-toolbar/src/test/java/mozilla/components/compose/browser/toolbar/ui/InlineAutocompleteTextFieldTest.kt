/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.browser.toolbar.ui

import android.view.inputmethod.EditorInfo
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.SoftwareKeyboardController
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotDisplayed
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.click
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performImeAction
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.performTextReplacement
import androidx.compose.ui.test.performTouchInput
import mozilla.components.compose.browser.toolbar.concept.BrowserToolbarTestTags.ADDRESSBAR_SEARCH_BOX
import mozilla.components.concept.toolbar.AutocompleteResult
import mozilla.components.support.test.any
import mozilla.components.support.test.mock
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class InlineAutocompleteTextFieldTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `WHEN the query is updated THEN inform callbacks`() {
        val onUrlEdit: (BrowserToolbarQuery) -> Unit = mock()

        composeTestRule.setContent {
            InlineAutocompleteTextField(
                query = "",
                hint = "Search or enter address",
                suggestion = null,
                showQueryAsPreselected = false,
                usePrivateModeQueries = false,
                onUrlEdit = onUrlEdit,
            )
        }

        composeTestRule.onNodeWithTag(ADDRESSBAR_SEARCH_BOX).performTextReplacement("hello")
        verify(onUrlEdit).invoke(BrowserToolbarQuery(current = "hello", previous = ""))

        composeTestRule.onNodeWithText("hello").performTextInput(" world")
        verify(onUrlEdit).invoke(BrowserToolbarQuery(current = "hello world", previous = "hello"))
    }

    @Test
    fun `GIVEN a query WHEN an autocomplete suggestion is available THEN display the autocompleted query`() {
        val suggestion = AutocompleteResult(
            input = "moz",
            text = "mozilla.org",
            url = "https://mozilla.org",
            source = "test",
            totalItems = 1,
        )

        composeTestRule.setContent {
            InlineAutocompleteTextField(
                query = "moz",
                hint = "",
                suggestion = suggestion,
                showQueryAsPreselected = false,
                usePrivateModeQueries = false,
            )
        }

        composeTestRule.onNodeWithTag(ADDRESSBAR_SEARCH_BOX).assertTextEquals("mozilla.org")
    }

    @Test
    fun `GIVEN an autocomplete suggestion is shown WHEN the query is tapped, THEN don't do anything`() {
        val onUrlEdit: (BrowserToolbarQuery) -> Unit = mock()
        val suggestion = AutocompleteResult(
            input = "w",
            text = "wikipedia.org",
            url = "https://wikipedia.org",
            source = "test",
            totalItems = 1,
        )

        composeTestRule.setContent {
            InlineAutocompleteTextField(
                query = "w",
                hint = "",
                suggestion = suggestion,
                showQueryAsPreselected = false,
                usePrivateModeQueries = false,
                onUrlEdit = onUrlEdit,
            )
        }

        // Tapping on the very left is where the query is shown.
        composeTestRule.onNodeWithTag(ADDRESSBAR_SEARCH_BOX).performTouchInput { click(position = centerLeft) }

        verify(onUrlEdit, never()).invoke(any())
    }

    @Test
    fun `GIVEN an autocomplete suggestion is shown WHEN tapping outside the query, THEN commit the autocomplete suggestion`() {
        val onUrlEdit: (BrowserToolbarQuery) -> Unit = mock()
        val suggestion = AutocompleteResult(
            input = "w",
            text = "wikipedia.org",
            url = "https://wikipedia.org",
            source = "test",
            totalItems = 1,
        )

        composeTestRule.setContent {
            InlineAutocompleteTextField(
                query = "w",
                hint = "",
                suggestion = suggestion,
                showQueryAsPreselected = false,
                usePrivateModeQueries = false,
                onUrlEdit = onUrlEdit,
            )
        }

        // Tapping on the very right is to the outside of the current query.
        composeTestRule.onNodeWithTag(ADDRESSBAR_SEARCH_BOX).performTouchInput { click(position = centerRight) }

        verify(onUrlEdit).invoke(BrowserToolbarQuery(previous = "w", current = "wikipedia.org"))
    }

    @Test
    fun `GIVEN a query and suggestion are shown WHEN backspace is first pressed THEN only clear the suggestion`() {
        val onUrlEdit: (BrowserToolbarQuery) -> Unit = mock()
        val suggestion = AutocompleteResult(
            input = "moz",
            text = "mozilla.org",
            url = "https://mozilla.org",
            source = "test",
            totalItems = 1,
        )

        composeTestRule.setContent {
            InlineAutocompleteTextField(
                query = "moz",
                hint = "",
                suggestion = suggestion,
                showQueryAsPreselected = false,
                usePrivateModeQueries = false,
                onUrlEdit = onUrlEdit,
            )
        }

        composeTestRule.onNodeWithText("mozilla.org").assertIsDisplayed()

        // Simulate a backspace normally deleting text.
        composeTestRule.onNodeWithText("mozilla.org").performTextReplacement("mo")
        // The text should now be the original query, without the suggestion.
        composeTestRule.onNodeWithText("moz").assertIsDisplayed()
        composeTestRule.onNodeWithText("mozilla.org").assertDoesNotExist()
        verify(onUrlEdit, never()).invoke(any())

        // Simulate a second backspace.
        composeTestRule.onNodeWithText("moz").performTextReplacement("mo")
        // Now the last character of the query should be deleted and the callback notified.
        composeTestRule.onNodeWithText("mo").assertIsDisplayed()
        composeTestRule.onNodeWithText("moz").assertDoesNotExist()
        verify(onUrlEdit).invoke(BrowserToolbarQuery(previous = "moz", current = "mo"))
    }

    @Test
    fun `WHEN query is empty THE the hint is displayed`() {
        composeTestRule.setContent {
            InlineAutocompleteTextField(
                query = "",
                hint = "Search or enter address",
                suggestion = null,
                showQueryAsPreselected = false,
                usePrivateModeQueries = false,
                onUrlEdit = { },
            )
        }

        composeTestRule.onNodeWithText("Search or enter address").assertIsDisplayed()
    }

    @Test
    fun `WHEN query is not empty THE the hint is not displayed`() {
        composeTestRule.setContent {
            InlineAutocompleteTextField(
                query = "test",
                hint = "Search or enter address",
                suggestion = null,
                showQueryAsPreselected = false,
                usePrivateModeQueries = false,
                onUrlEdit = { },
            )
        }

        composeTestRule.onNodeWithText("Search or enter address").assertIsNotDisplayed()
    }

    @Test
    fun `WHEN disabling personalized learning for the IME THEN set the right ime option`() {
        val editorInfo = EditorInfo()

        NoPersonalizedLearningHelper.addNoPersonalizedLearning(editorInfo)

        assertTrue(editorInfo.imeOptions and EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING != 0)
    }

    @Test
    fun `GIVEN a query but no suggestion WHEN the IME action button is tapped THEN hide the IME and inform callbacks of the query accepted`() {
        val userQuery = "mozilla"
        val keyboardController: SoftwareKeyboardController = mock()
        val urlCommitedCallback: (String) -> Unit = mock()
        composeTestRule.setContent {
            CompositionLocalProvider(LocalSoftwareKeyboardController provides keyboardController) {
                InlineAutocompleteTextField(
                    query = userQuery,
                    hint = "test",
                    suggestion = null, // No suggestion
                    showQueryAsPreselected = false,
                    usePrivateModeQueries = false,
                    onUrlCommitted = urlCommitedCallback,
                )
            }
        }

        composeTestRule.onNodeWithTag(ADDRESSBAR_SEARCH_BOX).performImeAction()

        verify(keyboardController).hide()
        verify(urlCommitedCallback).invoke(userQuery)
    }

    @Test
    fun `GIVEN a query and suggestion WHEN the IME action button is tapped THEN hide the IME and inform callbacks of the suggestion accepted`() {
        val userQuery = "wiki"
        val suggestion = AutocompleteResult(
            input = "wiki",
            text = "wikipedia.org",
            url = "https://wikipedia.org",
            source = "test",
            totalItems = 1,
        )
        val keyboardController: SoftwareKeyboardController = mock()
        val urlCommitedCallback: (String) -> Unit = mock()
        composeTestRule.setContent {
            CompositionLocalProvider(LocalSoftwareKeyboardController provides keyboardController) {
                InlineAutocompleteTextField(
                    query = userQuery,
                    hint = "test",
                    suggestion = suggestion,
                    showQueryAsPreselected = false,
                    usePrivateModeQueries = false,
                    onUrlCommitted = urlCommitedCallback,
                )
            }
        }

        composeTestRule.onNodeWithTag(ADDRESSBAR_SEARCH_BOX).performImeAction()

        verify(keyboardController).hide()
        verify(urlCommitedCallback).invoke(suggestion.text)
    }

    @Test
    fun `GIVEN no query and no suggestion WHEN the IME action button is tapped THEN hide keyboard and inform callbacks`() {
        val userQuery = ""
        val keyboardController: SoftwareKeyboardController = mock()
        val urlCommitedCallback: (String) -> Unit = mock()
        composeTestRule.setContent {
            CompositionLocalProvider(LocalSoftwareKeyboardController provides keyboardController) {
                InlineAutocompleteTextField(
                    query = userQuery,
                    hint = "test",
                    suggestion = null, // No suggestion
                    showQueryAsPreselected = false,
                    usePrivateModeQueries = false,
                    onUrlCommitted = urlCommitedCallback,
                )
            }
        }

        composeTestRule.onNodeWithTag(ADDRESSBAR_SEARCH_BOX).performImeAction()

        verify(keyboardController).hide()
        verify(urlCommitedCallback).invoke(userQuery)
    }
}
