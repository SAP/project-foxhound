/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.tooling.detekt

import io.gitlab.arturbosch.detekt.test.TestConfig
import io.gitlab.arturbosch.detekt.test.lint
import junit.framework.TestCase.assertEquals
import mozilla.components.tooling.detekt.acorn.MaterialTypographyUsageRule
import org.junit.Test

class MaterialTypographyUsageRuleTest {

    private val fenixConfig = TestConfig(
        "appTypographyName" to "org.mozilla.fenix.theme.FirefoxTheme.typography",
    )

    @Test
    fun `GIVEN no appTypographyName is configured WHEN MaterialTheme typography is accessed THEN it is flagged with a generic message`() {
        val code = """
            package com.example
            import androidx.compose.material3.MaterialTheme
            val typography = MaterialTheme.typography
        """.trimIndent()

        val findings = MaterialTypographyUsageRule().lint(code)

        assertEquals(1, findings.size)
        assertEquals(
            "Use the app-level typography instead of MaterialTheme.typography.",
            findings.first().message,
        )
    }

    @Test
    fun `GIVEN appTypographyName is configured WHEN MaterialTheme typography is accessed THEN the message mentions the appTypographyName to use`() {
        val code = """
            package org.mozilla.fenix.compose
            import androidx.compose.material3.MaterialTheme
            val typography = MaterialTheme.typography
        """.trimIndent()

        val findings = MaterialTypographyUsageRule(fenixConfig).lint(code)

        assertEquals(1, findings.size)
        assertEquals(
            "Use org.mozilla.fenix.theme.FirefoxTheme.typography " +
                "instead of MaterialTheme.typography.",
            findings.first().message,
        )
    }

    @Test
    fun `WHEN MaterialTheme typography with a property is accessed THEN it is flagged`() {
        val code = """
            package org.mozilla.fenix.compose
            import androidx.compose.material3.MaterialTheme
            val typography = MaterialTheme.typography.bodyLarge
            val color = MaterialTheme.colorScheme.primary
        """.trimIndent()

        val findings = MaterialTypographyUsageRule(fenixConfig).lint(code)

        assertEquals(1, findings.size)
    }

    @Test
    fun `WHEN the fully qualified MaterialTheme typography is accessed THEN it is flagged`() {
        val code = """
            package org.mozilla.fenix.compose
            val typography = androidx.compose.material3.MaterialTheme.typography
        """.trimIndent()

        val findings = MaterialTypographyUsageRule(fenixConfig).lint(code)

        assertEquals(1, findings.size)
    }

    @Test
    fun `WHEN MaterialTheme typography appears in an import directive THEN it is flagged`() {
        val code = """
            package org.mozilla.fenix.compose
            import androidx.compose.material3.MaterialTheme.typography
        """.trimIndent()

        val findings = MaterialTypographyUsageRule(fenixConfig).lint(code)

        assertEquals(1, findings.size)
    }

    @Test
    fun `GIVEN appTypographyName is configured WHEN the configured app typography is accessed THEN it is not flagged`() {
        val code = """
            package org.mozilla.fenix.compose
            import org.mozilla.fenix.theme.FirefoxTheme
            val typography = FirefoxTheme.typography.body1
        """.trimIndent()

        val findings = MaterialTypographyUsageRule(fenixConfig).lint(code)

        assertEquals(0, findings.size)
    }

    @Test
    fun `WHEN MaterialTheme typography is accessed multiple times THEN each usage is flagged`() {
        val code = """
            package org.mozilla.fenix.compose
            import androidx.compose.material3.MaterialTheme
            val bodyLarge = MaterialTheme.typography.bodyLarge
            val titleLarge = MaterialTheme.typography.titleLarge
        """.trimIndent()

        val findings = MaterialTypographyUsageRule(fenixConfig).lint(code)

        assertEquals(2, findings.size)
    }
}
