/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.tooling.detekt

import io.gitlab.arturbosch.detekt.test.TestConfig
import io.gitlab.arturbosch.detekt.test.lint
import junit.framework.TestCase.assertEquals
import mozilla.components.tooling.detekt.acorn.AcornThemeUsageRule
import org.junit.Test

class AcornThemeUsageRuleTest {

    private val fenixConfig = TestConfig(
        "appThemeName" to "org.mozilla.fenix.theme.FirefoxTheme",
    )

    @Test
    fun `GIVEN appThemeName is not configured WHEN AcornTheme is imported THEN it is flagged with a generic message`() {
        val code = """
            package com.example
            import mozilla.components.compose.base.theme.AcornTheme
        """.trimIndent()

        val findings = AcornThemeUsageRule().lint(code)

        assertEquals(1, findings.size)
        assertEquals(
            "Use the app-level theme instead of AcornTheme.",
            findings.first().message,
        )
    }

    @Test
    fun `GIVEN appThemeName is configured WHEN AcornTheme is imported THEN the message mentions the appThemeName to use`() {
        val code = """
            package org.mozilla.fenix.compose
            import mozilla.components.compose.base.theme.AcornTheme
        """.trimIndent()

        val findings = AcornThemeUsageRule(fenixConfig).lint(code)

        assertEquals(1, findings.size)
        assertEquals(
            "Use org.mozilla.fenix.theme.FirefoxTheme instead of AcornTheme.",
            findings.first().message,
        )
    }

    @Test
    fun `WHEN the configured app theme is imported THEN it is not flagged`() {
        val code = """
            package org.mozilla.fenix.compose
            import org.mozilla.fenix.theme.FirefoxTheme
        """.trimIndent()

        val findings = AcornThemeUsageRule(fenixConfig).lint(code)

        assertEquals(0, findings.size)
    }

    @Test
    fun `WHEN other imports from the Acorn theme package are used THEN they are not flagged`() {
        val code = """
            package org.mozilla.fenix.compose
            import mozilla.components.compose.base.theme.AcornColors
            import mozilla.components.compose.base.theme.AcornTypography
            import mozilla.components.compose.base.theme.lightColorPalette
        """.trimIndent()

        val findings = AcornThemeUsageRule(fenixConfig).lint(code)

        assertEquals(0, findings.size)
    }

    @Test
    fun `WHEN AcornTheme is imported with an alias THEN it is flagged`() {
        val code = """
            package org.mozilla.fenix.compose
            import mozilla.components.compose.base.theme.AcornTheme as Theme
        """.trimIndent()

        val findings = AcornThemeUsageRule(fenixConfig).lint(code)

        assertEquals(1, findings.size)
    }
}
