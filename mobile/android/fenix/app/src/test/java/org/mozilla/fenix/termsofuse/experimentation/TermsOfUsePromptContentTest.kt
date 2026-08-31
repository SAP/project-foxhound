package org.mozilla.fenix.termsofuse.experimentation

import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.nimbus.TermsOfUsePromptContentOption
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class TermsOfUsePromptContentTest {

    // Tests for toTermsOfUsePromptContentOption
    @Test
    fun `WHEN string matches the VALUE_0 name THEN toTermsOfUsePromptContentOption returns VALUE_0`() {
        assertEquals(
            TermsOfUsePromptContentOption.VALUE_0,
            "VALUE_0".toTermsOfUsePromptContentOption(),
        )
    }

    @Test
    fun `WHEN string matches the VALUE_1 name THEN toTermsOfUsePromptContentOption returns VALUE_1`() {
        assertEquals(
            TermsOfUsePromptContentOption.VALUE_1,
            "VALUE_1".toTermsOfUsePromptContentOption(),
        )
    }

    @Test
    fun `WHEN string matches the VALUE_2 name THEN toTermsOfUsePromptContentOption returns VALUE_2`() {
        assertEquals(
            TermsOfUsePromptContentOption.VALUE_2,
            "VALUE_2".toTermsOfUsePromptContentOption(),
        )
    }

    @Test
    fun `WHEN string does not match any TermsOfUsePromptContentOption name THEN toTermsOfUsePromptContentOption returns VALUE_0`() {
        assertEquals(
            TermsOfUsePromptContentOption.VALUE_0,
            "test".toTermsOfUsePromptContentOption(),
        )
    }

    // Tests for getTermsOfUsePromptContent title only
    @Test
    fun `WHEN TermsOfUsePromptContentOption is VALUE_0 THEN getTermsOfUsePromptContent title is as expected`() {
        val expectedTitle = "We’ve got an update"
        val result = getTermsOfUsePromptContent(
            testContext,
            TermsOfUsePromptContentOption.VALUE_0.name,
        ) {}.title

        assertEquals(expectedTitle, result)
    }

    @Test
    fun `WHEN TermsOfUsePromptContentOption is VALUE_1 THEN getTermsOfUsePromptContent title is as expected`() {
        val expectedTitle = "Terms of Use"
        val result = getTermsOfUsePromptContent(
            testContext,
            TermsOfUsePromptContentOption.VALUE_1.name,
        ) {}.title

        assertEquals(expectedTitle, result)
    }

    @Test
    fun `WHEN TermsOfUsePromptContentOption is VALUE_2 THEN getTermsOfUsePromptContent title is as expected`() {
        val expectedTitle = "A note from Firefox"
        val result = getTermsOfUsePromptContent(
            testContext,
            TermsOfUsePromptContentOption.VALUE_2.name,
        ) {}.title

        assertEquals(expectedTitle, result)
    }
}
