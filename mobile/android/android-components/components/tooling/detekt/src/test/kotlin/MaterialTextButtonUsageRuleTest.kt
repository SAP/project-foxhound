/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.tooling.detekt

import io.gitlab.arturbosch.detekt.test.lint
import mozilla.components.tooling.detekt.acorn.MaterialTextButtonUsageRule
import org.junit.Test
import kotlin.test.assertEquals

class MaterialTextButtonUsageRuleTest {

    @Test
    fun `WHEN the M3 TextButton is imported THEN it is flagged`() {
        val code = """
            package com.example
            import androidx.compose.material3.TextButton
        """.trimIndent()

        val findings = MaterialTextButtonUsageRule().lint(code)

        assertEquals(1, findings.size)
        assertEquals(
            MaterialTextButtonUsageRule.MESSAGE,
            findings.first().message,
        )
    }

    @Test
    fun `WHEN the M3 TextButton is imported with an alias THEN it is flagged`() {
        val code = """
            package com.example
            import androidx.compose.material3.TextButton as M3TextButton
        """.trimIndent()

        val findings = MaterialTextButtonUsageRule().lint(code)

        assertEquals(1, findings.size)
    }

    @Test
    fun `WHEN the fully qualified M3 TextButton is referenced THEN it is flagged`() {
        val code = """
            package com.example
            @Composable
            fun TextButton() {
                androidx.compose.material3.TextButton(onClick = {}) {}
            }
        """.trimIndent()

        val findings = MaterialTextButtonUsageRule().lint(code)

        assertEquals(1, findings.size)
        assertEquals(
            MaterialTextButtonUsageRule.MESSAGE,
            findings.first().message,
        )
    }

    @Test
    fun `WHEN the compose-base TextButton, ButtonDefaults and ButtonColors are imported THEN they are not flagged`() {
        val code = """
            package com.example
            import mozilla.components.compose.base.button.TextButton
            import androidx.compose.material3.ButtonDefaults
            import androidx.compose.material3.ButtonColors
            val colors = androidx.compose.material3.ButtonDefaults.textButtonColors()
        """.trimIndent()

        val findings = MaterialTextButtonUsageRule().lint(code)

        assertEquals(0, findings.size)
    }

    @Test
    fun `WHEN the M3 TextButton is used multiple times THEN each usage is flagged`() {
        val code = """
            package com.example
            import androidx.compose.material3.TextButton
            @Composable
            fun Content() {
                androidx.compose.material3.TextButton(onClick = {}) {}
            }
        """.trimIndent()

        val findings = MaterialTextButtonUsageRule().lint(code)

        assertEquals(2, findings.size)
    }
}
