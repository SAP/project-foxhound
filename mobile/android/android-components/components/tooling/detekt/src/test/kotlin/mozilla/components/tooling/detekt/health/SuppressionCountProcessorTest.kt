/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.tooling.detekt.health

import io.github.detekt.test.utils.compileContentForTest
import org.jetbrains.kotlin.resolve.BindingContext
import org.junit.Assert.assertEquals
import org.junit.Test

class SuppressionCountProcessorTest {
    @Test
    fun `single @SuppressWarnings in a function is processed`() {
        val code = """
            class Test {
                @SuppressWarnings("VariableNaming")
                fun suppressedFunction() = Unit
            }
        """

        val ktFile = compileContentForTest(code)
        SuppressionCountProcessor().onProcess(
            file = ktFile,
            bindingContext = BindingContext.EMPTY,
        )

        assertEquals(
            mapOf(
                "VariableNaming" to 1,
            ),
            ktFile.getUserData(SuppressionCountProcessor.Companion.suppressionKey),
        )
    }

    @Test
    fun `single suppression in a function is processed`() {
        val code = """
            class Test {
                @Suppress("unused")
                fun suppressedFunction() = Unit
            }
        """

        val ktFile = compileContentForTest(code)
        SuppressionCountProcessor().onProcess(
            file = ktFile,
            bindingContext = BindingContext.EMPTY,
        )

        assertEquals(
            mapOf(
                "unused" to 1,
            ),
            ktFile.getUserData(SuppressionCountProcessor.Companion.suppressionKey),
        )
    }

    @Test
    fun `multiple suppressions on a function in the same function annotation are correct`() {
        val code = """
            class Test {
                @Suppress("unused, TooManyFunctions")
                fun suppressedFunction() = Unit
            }
        """

        val ktFile = compileContentForTest(code)
        SuppressionCountProcessor().onProcess(
            file = ktFile,
            bindingContext = BindingContext.EMPTY,
        )

        assertEquals(
            mapOf(
                "unused" to 1,
                "TooManyFunctions" to 1,
            ),
            ktFile.getUserData(SuppressionCountProcessor.Companion.suppressionKey),
        )
    }

    @Test
    fun `multiple suppressions on a function with argument name specified is correct`() {
        val code = """
            class Test {
                @Suppress(names = ["unused, TooManyFunctions"])
                fun suppressedFunction() = Unit
            }
        """

        val ktFile = compileContentForTest(code)
        SuppressionCountProcessor().onProcess(
            file = ktFile,
            bindingContext = BindingContext.EMPTY,
        )

        assertEquals(
            mapOf(
                "unused" to 1,
                "TooManyFunctions" to 1,
            ),
            ktFile.getUserData(SuppressionCountProcessor.Companion.suppressionKey),
        )
    }

    @Test
    fun `single function suppression with argument name specified is correct`() {
        val code = """
            class Test {
                @Suppress(names = ["ComplexMethod"])
                fun suppressedFunction() = Unit
            }
        """

        val ktFile = compileContentForTest(code)
        SuppressionCountProcessor().onProcess(
            file = ktFile,
            bindingContext = BindingContext.EMPTY,
        )

        assertEquals(
            mapOf(
                "ComplexMethod" to 1,
            ),
            ktFile.getUserData(SuppressionCountProcessor.Companion.suppressionKey),
        )
    }

    @Test
    fun `single function suppression with argument name and arrayOf is correct`() {
        val code = """
            class Test {
                @Suppress(names = arrayOf("ComplexMethod"))
                fun suppressedFunction() = Unit
            }
        """

        val ktFile = compileContentForTest(code)
        SuppressionCountProcessor().onProcess(
            file = ktFile,
            bindingContext = BindingContext.EMPTY,
        )

        assertEquals(
            mapOf(
                "ComplexMethod" to 1,
            ),
            ktFile.getUserData(SuppressionCountProcessor.Companion.suppressionKey),
        )
    }

    @Test
    fun `multiple annotations on various functions are processed correctly`() {
        val code = """
            class Test {
                @Suppress(names = ["ComplexMethod"])
                fun suppressedFunction1() = Unit
                @Suppress("ComplexMethod, unused")
                fun suppressedFunction2() = Unit
            }
        """.trimIndent()

        val ktFile = compileContentForTest(code)
        SuppressionCountProcessor().onProcess(
            file = ktFile,
            bindingContext = BindingContext.EMPTY,
        )

        assertEquals(
            mapOf(
                "ComplexMethod" to 2,
                "unused" to 1,
            ),
            ktFile.getUserData(SuppressionCountProcessor.Companion.suppressionKey),
        )
    }
}
