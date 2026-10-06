/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.tooling.lint

import com.android.tools.lint.checks.infrastructure.LintDetectorTest
import com.android.tools.lint.checks.infrastructure.TestFiles
import com.android.tools.lint.detector.api.Detector
import com.android.tools.lint.detector.api.Issue
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class JUnitAssertNotNullDetectorTest : LintDetectorTest() {
    override fun getDetector(): Detector = JUnitAssertNotNullDetector()

    override fun getIssues(): List<Issue> =
        listOf(JUnitAssertNotNullDetector.ISSUE_USE_KOTLIN_TEST_ASSERT_NOT_NULL)

    private val junitAssertStub = TestFiles.java(
        """
        package org.junit;
        public class Assert {
            public static void assertNotNull(Object value) {}
            public static void assertNotNull(String message, Object value) {}
        }
        """,
    ).indented()

    private val kotlinTestStub = TestFiles.kotlin(
        """
        package kotlin.test
        fun <T : Any> assertNotNull(actual: T?, message: String? = null): T = actual!!
        """,
    ).indented()

    @Test
    fun `single-arg JUnit assertNotNull via static import is replaced`() {
        lint()
            .files(
                junitAssertStub,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import org.junit.Assert.assertNotNull

                    class MyTest {
                        fun test() {
                            val value: String? = "x"
                            assertNotNull(value)
                        }
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectWarningCount(1)
            .expectFixDiffs(
                """
                Fix for src/com/example/test/MyTest.kt line 7: Replace with kotlin.test.assertNotNull(value):
                @@ -7 +7 @@
                -        assertNotNull(value)
                +        kotlin.test.assertNotNull(value)
                """.trimIndent(),
            )
    }

    @Test
    fun `qualified single-arg JUnit assertNotNull is replaced`() {
        lint()
            .files(
                junitAssertStub,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import org.junit.Assert

                    class MyTest {
                        fun test() {
                            val value: String? = "x"
                            Assert.assertNotNull(value)
                        }
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectWarningCount(1)
            .expectFixDiffs(
                """
                Fix for src/com/example/test/MyTest.kt line 7: Replace with kotlin.test.assertNotNull(value):
                @@ -7 +7 @@
                -        Assert.assertNotNull(value)
                +        kotlin.test.assertNotNull(value)
                """.trimIndent(),
            )
    }

    @Test
    fun `qualified two-arg JUnit assertNotNull swaps message position`() {
        lint()
            .files(
                junitAssertStub,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import org.junit.Assert

                    class MyTest {
                        fun test() {
                            val value: String? = "x"
                            Assert.assertNotNull("should not be null", value)
                        }
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectWarningCount(1)
            .expectFixDiffs(
                """
                Fix for src/com/example/test/MyTest.kt line 7: Replace with kotlin.test.assertNotNull(value, "should not be null"):
                @@ -7 +7 @@
                -        Assert.assertNotNull("should not be null", value)
                +        kotlin.test.assertNotNull(value, "should not be null")
                """.trimIndent(),
            )
    }

    @Test
    fun `kotlin test assertNotNull is clean`() {
        lint()
            .files(
                kotlinTestStub,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import kotlin.test.assertNotNull

                    class MyTest {
                        fun test() {
                            val value: String? = "x"
                            assertNotNull(value)
                        }
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectClean()
    }

    @Test
    fun `unrelated assertNotNull function is clean`() {
        lint()
            .files(
                TestFiles.kotlin(
                    """
                    package com.example.test
                    fun assertNotNull(value: Any?) {}

                    class MyTest {
                        fun test() {
                            val value: String? = "x"
                            assertNotNull(value)
                        }
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectClean()
    }
}
