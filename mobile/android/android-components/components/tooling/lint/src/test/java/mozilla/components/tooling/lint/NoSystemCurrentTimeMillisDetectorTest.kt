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
class NoSystemCurrentTimeMillisDetectorTest : LintDetectorTest() {

    override fun getDetector(): Detector = NoSystemCurrentTimeMillisDetector()
    override fun getIssues(): List<Issue> = listOf(
        NoSystemCurrentTimeMillisDetector.ISSUE_NO_SYSTEM_CURRENT_TIME_MILLIS,
    )

    @Test
    fun `GIVEN System_currentTimeMillis is called in a method THEN expect lint warning`() {
        val code = TestFiles.kotlin(
            """
            package my.pkg

            class MyClass {
                fun getTime(): Long {
                    return System.currentTimeMillis()
                }
            }
            """,
        ).indented()

        lint()
            .allowMissingSdk()
            .files(code)
            .run()
            .expectWarningCount(1)
            .expectContains("System.currentTimeMillis() must be injectable.")
    }

    @Test
    fun `GIVEN System_currentTimeMillis is assigned to a property THEN expect lint warning`() {
        val code = TestFiles.kotlin(
            """
            package my.pkg

            class MyClass {
                val timestamp = System.currentTimeMillis()
            }
            """,
        ).indented()

        lint()
            .allowMissingSdk()
            .files(code)
            .run()
            .expectWarningCount(1)
            .expectContains("System.currentTimeMillis() must be injectable.")
    }

    @Test
    fun `GIVEN System_currentTimeMillis is used as a method reference THEN expect lint warning`() {
        val code = TestFiles.kotlin(
            """
            package my.pkg

            class MyClass {
                val getTime: () -> Long = System::currentTimeMillis
            }
            """,
        ).indented()

        lint()
            .allowMissingSdk()
            .files(code)
            .run()
            .expectWarningCount(1)
            .expectContains("System.currentTimeMillis() must be injectable.")
    }

    @Test
    fun `GIVEN System_currentTimeMillis is a default value on a top-level function THEN expect no warning`() {
        val code = TestFiles.kotlin(
            """
            package my.pkg

            fun getTime(now: Long = System.currentTimeMillis()): Long = now
            """,
        ).indented()

        lint()
            .allowMissingSdk()
            .files(code)
            .run()
            .expectClean()
    }

    @Test
    fun `GIVEN System_currentTimeMillis is a default value on a class primary constructor THEN expect no warning`() {
        val code = TestFiles.kotlin(
            """
            package my.pkg

            class MyClass(val now: Long = System.currentTimeMillis())
            """,
        ).indented()

        lint()
            .allowMissingSdk()
            .files(code)
            .run()
            .expectClean()
    }

    @Test
    fun `GIVEN System_currentTimeMillis is a default value on a class secondary constructor THEN expect no warning`() {
        val code = TestFiles.kotlin(
            """
            package my.pkg

            class MyClass {
                val now: Long
                constructor(now: Long = System.currentTimeMillis()) {
                    this.now = now
                }
            }
            """,
        ).indented()

        lint()
            .allowMissingSdk()
            .files(code)
            .run()
            .expectClean()
    }

    @Test
    fun `GIVEN System_currentTimeMillis is wrapped in a lambda default value on a top-level function THEN expect no warning`() {
        val code = TestFiles.kotlin(
            """
            package my.pkg

            fun topLevelFunction(
                currentTimeProvider: () -> Long = { System.currentTimeMillis() },
            ): Long = currentTimeProvider()
            """,
        ).indented()

        lint()
            .allowMissingSdk()
            .files(code)
            .run()
            .expectClean()
    }

    @Test
    fun `GIVEN System_currentTimeMillis is wrapped in a lambda default value on a class primary constructor THEN expect no warning`() {
        val code = TestFiles.kotlin(
            """
            package my.pkg

            class MyClass(
                private val currentTimeProvider: () -> Long = { System.currentTimeMillis() },
            )
            """,
        ).indented()

        lint()
            .allowMissingSdk()
            .files(code)
            .run()
            .expectClean()
    }

    @Test
    fun `GIVEN System_currentTimeMillis method reference is a default value on a top-level function THEN expect no warning`() {
        val code = TestFiles.kotlin(
            """
            package my.pkg

            fun getTime(getTime: () -> Long = System::currentTimeMillis): Long = getTime()
            """,
        ).indented()

        lint()
            .allowMissingSdk()
            .files(code)
            .run()
            .expectClean()
    }

    @Test
    fun `GIVEN System_currentTimeMillis method reference is a default value on a class primary constructor THEN expect no warning`() {
        val code = TestFiles.kotlin(
            """
            package my.pkg

            class MyClass(val getTime: () -> Long = System::currentTimeMillis)
            """,
        ).indented()

        lint()
            .allowMissingSdk()
            .files(code)
            .run()
            .expectClean()
    }

    @Test
    fun `GIVEN System_currentTimeMillis method reference is a default value on a method inside a class THEN expect lint warning`() {
        val code = TestFiles.kotlin(
            """
            package my.pkg

            class MyClass {
                fun getTime(getTime: () -> Long = System::currentTimeMillis): Long = getTime()
            }
            """,
        ).indented()

        lint()
            .allowMissingSdk()
            .files(code)
            .run()
            .expectWarningCount(1)
            .expectContains("System.currentTimeMillis() must be injectable.")
    }

    @Test
    fun `GIVEN System_currentTimeMillis is a default value on a local function THEN expect lint warning`() {
        val code = TestFiles.kotlin(
            """
            package my.pkg

            fun outer() {
                fun localFn(now: Long = System.currentTimeMillis()): Long = now
                localFn()
            }
            """,
        ).indented()

        lint()
            .allowMissingSdk()
            .files(code)
            .run()
            .expectWarningCount(1)
            .expectContains("System.currentTimeMillis() must be injectable.")
    }

    @Test
    fun `GIVEN System_currentTimeMillis is a default value on a companion object method THEN expect lint warning`() {
        val code = TestFiles.kotlin(
            """
            package my.pkg

            class MyClass {
                companion object {
                    fun create(now: Long = System.currentTimeMillis()): Long = now
                }
            }
            """,
        ).indented()

        lint()
            .allowMissingSdk()
            .files(code)
            .run()
            .expectWarningCount(1)
            .expectContains("System.currentTimeMillis() must be injectable.")
    }

    @Test
    fun `GIVEN System_currentTimeMillis is a default value on a method inside a class THEN expect lint warning`() {
        val code = TestFiles.kotlin(
            """
            package my.pkg

            class MyClass {
                fun getTime(now: Long = System.currentTimeMillis()): Long = now
            }
            """,
        ).indented()

        lint()
            .allowMissingSdk()
            .files(code)
            .run()
            .expectWarningCount(1)
            .expectContains("System.currentTimeMillis() must be injectable.")
    }

    @Test
    fun `GIVEN System_currentTimeMillis is a default value on a method inside an object THEN expect lint warning`() {
        val code = TestFiles.kotlin(
            """
            package my.pkg

            object MyObject {
                fun getTime(now: Long = System.currentTimeMillis()): Long = now
            }
            """,
        ).indented()

        lint()
            .allowMissingSdk()
            .files(code)
            .run()
            .expectWarningCount(1)
            .expectContains("System.currentTimeMillis() must be injectable.")
    }

    @Test
    fun `GIVEN another currentTimeMillis is called on a non-System receiver THEN expect no warning`() {
        val provider = TestFiles.kotlin(
            """
            package some.pkg

            object SomeProvider {
                fun currentTimeMillis(): Long = 0L
            }
            """,
        ).indented()

        val code = TestFiles.kotlin(
            """
            package my.pkg

            import some.pkg.SomeProvider

            class MyClass {
                fun getTime(): Long {
                    return SomeProvider.currentTimeMillis()
                }
            }
            """,
        ).indented()

        lint()
            .allowMissingSdk()
            .files(provider, code)
            .run()
            .expectClean()
    }

    @Test
    fun `GIVEN other System methods are called THEN expect no warning`() {
        val code = TestFiles.kotlin(
            """
            package my.pkg

            class MyClass {
                fun printTime() {
                    System.out.println("test")
                }
            }
            """,
        ).indented()

        lint()
            .allowMissingSdk()
            .files(code)
            .run()
            .expectClean()
    }
}
