/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.tooling.detekt

import io.gitlab.arturbosch.detekt.test.lint
import org.junit.Assert.assertEquals
import org.junit.Test

class NoSystemCurrentTimeMillisRuleTest {

    @Test
    fun testSystemCurrentTimeMillisDetectedInFunction() {
        val code = """
            |package my.package
            |
            |class MyClass {
            |    fun getTime(): Long {
            |        return System.currentTimeMillis()
            |    }
            |}
        """.trimMargin()

        val findings = NoSystemCurrentTimeMillisRule().lint(code)

        assertEquals(1, findings.size)
        assertEquals(
            "Avoid using `System.currentTimeMillis()` directly. Use `mozilla.components.support.utils.DateTimeProvider.currentTimeMillis()`",
            findings.first().message,
        )
    }

    @Test
    fun testSystemCurrentTimeMillisInVariable() {
        val code = """
            |package my.package
            |
            |class MyClass {
            |    val timestamp = System.currentTimeMillis()
            |}
        """.trimMargin()

        val findings = NoSystemCurrentTimeMillisRule().lint(code)

        assertEquals(1, findings.size)
    }

    @Test
    fun testNoViolationWithoutSystemCurrentTimeMillis() {
        val code = """
            |package my.package
            |
            |class MyClass {
            |    fun getTime(provider: DateTimeProvider): Long {
            |        return provider.currentTimeMillis()
            |    }
            |}
        """.trimMargin()

        val findings = NoSystemCurrentTimeMillisRule().lint(code)

        assertEquals(0, findings.size)
    }

    @Test
    fun testNoViolationWithOtherSystemMethods() {
        val code = """
            |package my.package
            |
            |class MyClass {
            |    fun printTime() {
            |        System.out.println("test")
            |    }
            |}
        """.trimMargin()

        val findings = NoSystemCurrentTimeMillisRule().lint(code)

        assertEquals(0, findings.size)
    }
}
