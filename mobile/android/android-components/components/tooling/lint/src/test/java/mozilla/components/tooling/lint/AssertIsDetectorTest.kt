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
class AssertIsDetectorTest : LintDetectorTest() {
    override fun getDetector(): Detector = AssertIsDetector()

    override fun getIssues(): List<Issue> = listOf(AssertIsDetector.ISSUE_USE_ASSERT_IS)

    private val junitAssertStub = TestFiles.java(
        """
        package org.junit;
        public class Assert {
            public static void assertTrue(boolean condition) {}
            public static void assertTrue(String message, boolean condition) {}
        }
        """,
    ).indented()

    private val kotlinTestStub = TestFiles.kotlin(
        """
        package kotlin.test
        fun assertTrue(actual: Boolean, message: String? = null) {}
        inline fun <reified T> assertIs(value: Any?, message: String? = null): T = value as T
        """,
    ).indented()

    @Test
    fun `assertTrue with is check reports warning`() {
        lint()
            .allowMissingSdk()
            .files(
                junitAssertStub,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import org.junit.Assert.assertTrue

                    class MyTest {
                        fun test() {
                            val result = listOf("1")
                            assertTrue(result is ArrayList)
                        }
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectWarningCount(1)
            .expectContains("assertIs")
            .expectFixDiffs(
                """
                Fix for src/com/example/test/MyTest.kt line 7: Replace with assertIs<ArrayList>(result):
                @@ -7 +7 @@
                -        assertTrue(result is ArrayList)
                +        kotlin.test.assertIs<ArrayList>(result)
                """.trimIndent(),
            )
    }

    @Test
    fun `JUnit message-first assertTrue with is check reports warning`() {
        lint()
            .allowMissingSdk()
            .files(
                junitAssertStub,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import org.junit.Assert

                    class MyTest {
                        fun test() {
                            val result = listOf("1")
                            Assert.assertTrue("should be array list", result is ArrayList)
                        }
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectWarningCount(1)
            .expectContains("assertIs")
            .expectFixDiffs(
                """
                Fix for src/com/example/test/MyTest.kt line 7: Replace with assertIs<ArrayList>(result, "should be array list"):
                @@ -7 +7 @@
                -        Assert.assertTrue("should be array list", result is ArrayList)
                +        kotlin.test.assertIs<ArrayList>(result, "should be array list")
                """.trimIndent(),
            )
    }

    @Test
    fun `kotlin test assertTrue with message second reports warning`() {
        lint()
            .allowMissingSdk()
            .files(
                kotlinTestStub,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import kotlin.test.assertTrue

                    class MyTest {
                        fun test() {
                            val result = listOf("1")
                            assertTrue(result is ArrayList, "should be array list")
                        }
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectWarningCount(1)
            .expectContains("assertIs")
            .expectFixDiffs(
                """
                Fix for src/com/example/test/MyTest.kt line 7: Replace with assertIs<ArrayList>(result, "should be array list"):
                @@ -7 +7 @@
                -        assertTrue(result is ArrayList, "should be array list")
                +        kotlin.test.assertIs<ArrayList>(result, "should be array list")
                """.trimIndent(),
            )
    }

    @Test
    fun `method call result in is check reports warning`() {
        lint()
            .allowMissingSdk()
            .files(
                junitAssertStub,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import org.junit.Assert.assertTrue

                    class MyTest {
                        fun test() {
                            assertTrue(listOf("1") is ArrayList)
                        }
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectWarningCount(1)
            .expectContains("assertIs")
            .expectFixDiffs(
                """
                Fix for src/com/example/test/MyTest.kt line 6: Replace with assertIs<ArrayList>(listOf("1")):
                @@ -6 +6 @@
                -        assertTrue(listOf("1") is ArrayList)
                +        kotlin.test.assertIs<ArrayList>(listOf("1"))
                """.trimIndent(),
            )
    }

    @Test
    fun `assertTrue with simple boolean is clean`() {
        lint()
            .allowMissingSdk()
            .files(
                junitAssertStub,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import org.junit.Assert.assertTrue

                    class MyTest {
                        fun test() {
                            assertTrue(true)
                        }
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectClean()
    }

    @Test
    fun `assertTrue with equality check is clean`() {
        lint()
            .allowMissingSdk()
            .files(
                junitAssertStub,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import org.junit.Assert.assertTrue

                    class MyTest {
                        fun test() {
                            assertTrue(listOf("1").size == 1)
                        }
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectClean()
    }
}
