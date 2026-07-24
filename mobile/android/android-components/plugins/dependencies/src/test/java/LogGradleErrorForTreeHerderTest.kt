/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import org.junit.jupiter.api.Assertions.assertLinesMatch
import org.junit.jupiter.api.Test

class LogGradleErrorForTreeHerderJupiterTest {
    private fun assertEqualLines(expected: String, actual: String) {
        assertLinesMatch(
            expected.split("\n"),
            actual.trimEnd('\n').split("\n"))
    }

    @Test
    fun `getIndentedMessage formats a single exception message correctly`() {
        val exception = RuntimeException("Test message")
        val actualMessage = LogGradleErrorForTreeHerder.getIndentedMessage(exception)
        assertEqualLines("""
            Test message
        """.trimIndent(), actualMessage)
    }

    @Test
    fun `getIndentedMessage formats an exception with a single cause correctly`() {
        val cause = IllegalStateException("Cause message")
        val exception = RuntimeException("Test message", cause)
        val actualMessage: String = LogGradleErrorForTreeHerder.getIndentedMessage(exception)
        assertEqualLines("""
            Test message
            > Cause message
        """.trimIndent(), actualMessage)
    }

    @Test
    fun `getIndentedMessage formats an exception with multiple nested causes correctly`() {
        val deepestCause = NullPointerException("Deepest cause\nDeepest cause 2")
        val middleCause = IllegalArgumentException("Middle cause\nMiddle cause 2", deepestCause)
        val exception = RuntimeException("Top-level message", middleCause)
        val actualMessage = LogGradleErrorForTreeHerder.getIndentedMessage(exception)
        assertEqualLines("""
            Top-level message
            > Middle cause
              Middle cause 2
              > Deepest cause
                Deepest cause 2
        """.trimIndent(), actualMessage)
    }

    @Test
    fun `getIndentedMessage handles an exception with a null message`() {
        val exception = RuntimeException(null as String?)
        val actualMessage = LogGradleErrorForTreeHerder.getIndentedMessage(exception)
        assertEqualLines("""

        """.trimIndent(), actualMessage)
    }

    @Test
    fun `getIndentedMessage handles an exception with an empty message`() {
        val exception = RuntimeException("")
        val actualMessage = LogGradleErrorForTreeHerder.getIndentedMessage(exception)
        assertEqualLines("""

        """.trimIndent(), actualMessage)
    }

    @Test
    fun `getIndentedMessage handles an exception message with newlines`() {
        val exception = RuntimeException("First line\nSecond line")
        val actualMessage = LogGradleErrorForTreeHerder.getIndentedMessage(exception)
        assertEqualLines("""
            First line
            Second line
        """.trimIndent(), actualMessage)
    }

    @Test
    fun `getIndentedMessage handles an exception message with newlines and a cause`() {
        val cause = IllegalStateException("Cause\nAnother cause line")
        val exception = RuntimeException("First line\nSecond line", cause)
        val actualMessage = LogGradleErrorForTreeHerder.getIndentedMessage(exception)
        assertEqualLines("""
            First line
            Second line
            > Cause
              Another cause line
        """.trimIndent(), actualMessage)
    }

    @Test
    fun `getIndentedMessage handles a cause with a null message`() {
        val cause = IllegalStateException(null as String?)
        val exception = RuntimeException("Test message", cause)
        val actualMessage = LogGradleErrorForTreeHerder.getIndentedMessage(exception)
        assertEqualLines("""
            Test message
            >
        """.trimIndent(), actualMessage)
    }
}
