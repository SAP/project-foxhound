/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.ui.richtext.parsing

import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

@RunWith(Parameterized::class)
internal class ParserTest(val testCase: ParserTestCase) {

    private lateinit var parser: Parser

    @Before
    fun setUp() {
        parser = Parser()
    }

    @Test
    fun `parser produces expected document for given document`() {
        val actualDocument = parser.parse(source = testCase.source)

        assertEquals(
            """
                Failed case: ${testCase.description}
                To debug, you can create the following test class:
                class SingleTest {

                    @Test
                    fun test() {
                        val testCase = ParserTestCases[25] // replace 25 with the failed test index
                        val result = Parser.parse(testCase.source)
                        assertEquals(testCase.expectedDocument, result)
                    }
                }
            """.trimIndent(),
            testCase.expectedDocument,
            actualDocument,
        )
    }

    companion object {

        @JvmStatic
        @Parameterized.Parameters
        fun testCases(): List<ParserTestCase> = ParserTestCases
    }
}
