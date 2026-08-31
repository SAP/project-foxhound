/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.tooling.detekt

import io.gitlab.arturbosch.detekt.test.lint
import mozilla.components.tooling.detekt.acorn.MaterialSwitchUsageRule
import org.junit.Test
import kotlin.test.assertEquals

class MaterialSwitchUsageRuleTest {

    @Test
    fun `WHEN the M3 Switch is imported THEN it is flagged`() {
        val code = """
            package com.example
            import androidx.compose.material3.Switch
        """.trimIndent()

        val findings = MaterialSwitchUsageRule().lint(code)

        assertEquals(1, findings.size)
        assertEquals(
            MaterialSwitchUsageRule.MESSAGE,
            findings.first().message,
        )
    }

    @Test
    fun `WHEN the M3 Switch is imported with an alias THEN it is flagged`() {
        val code = """
            package com.example
            import androidx.compose.material3.Switch as M3Switch

        """.trimIndent()

        val findings = MaterialSwitchUsageRule().lint(code)

        assertEquals(1, findings.size)
    }

    @Test
    fun `WHEN the compose-base Switch, SwitchDefaults and SwitchColors are imported THEN they are not flagged`() {
        val code = """
            package com.example
            import mozilla.components.compose.base.Switch
            import androidx.compose.material3.SwitchDefaults
            import androidx.compose.material3.SwitchColors
            val colors = androidx.compose.material3.SwitchDefaults.colors()
        """.trimIndent()

        val findings = MaterialSwitchUsageRule().lint(code)

        assertEquals(0, findings.size)
    }

    @Test
    fun `WHEN the fully qualified M3 Switch is referenced THEN it is flagged`() {
        val code = """
            package com.example
            @Composable
            fun Switch() {
                androidx.compose.material3.Switch(checked = true, onCheckedChange = {})
            }
        """.trimIndent()

        val findings = MaterialSwitchUsageRule().lint(code)

        assertEquals(1, findings.size)
        assertEquals(
            MaterialSwitchUsageRule.MESSAGE,
            findings.first().message,
        )
    }

    @Test
    fun `WHEN the M3 Switch is used multiple times THEN each usage is flagged`() {
        val code = """
            package com.example
            import androidx.compose.material3.Switch
            @Composable
            fun Content() {
                androidx.compose.material3.Switch(checked = true, onCheckedChange = {})
            }
        """.trimIndent()

        val findings = MaterialSwitchUsageRule().lint(code)

        assertEquals(2, findings.size)
    }
}
