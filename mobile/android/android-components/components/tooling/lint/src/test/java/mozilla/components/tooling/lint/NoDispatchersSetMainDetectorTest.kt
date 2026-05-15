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
class NoDispatchersSetMainDetectorTest : LintDetectorTest() {

    override fun getDetector(): Detector = NoDispatchersSetMainDetector()
    override fun getIssues(): List<Issue> = listOf(
        NoDispatchersSetMainDetector.Companion.ISSUE_NO_DISPATCHERS_SET_MAIN,
    )

    // Stub for kotlinx.coroutines.Dispatchers to make the test code resolvable
    private val dispatcherStub = TestFiles.kotlin(
        """
        package kotlinx.coroutines.test

        object Dispatchers {
            @JvmStatic
            fun setMain(dispatcher: Any) { /* stub */ }
            @JvmStatic
            fun resetMain() { /* stub */ }
            @JvmStatic
            val Main: Any get() = Any()
        }
        """,
    ).indented()

    private val setMainUsage = TestFiles.kotlin(
        """
        package com.example.test

        import kotlinx.coroutines.test.Dispatchers

        class MySetMainViolationTest {
            init {
                Dispatchers.setMain(Dispatchers.Main) // VIOLATION
            }
        }
        """,
    ).indented()

    private val resetMainUsage = TestFiles.kotlin(
        """
        package com.example.test

        import kotlinx.coroutines.test.Dispatchers

        class MySetMainViolationTest {
            init {
                Dispatchers.resetMain(Dispatchers.Main) // VIOLATION
            }
        }
        """,
    ).indented()

    @Test
    fun `GIVEN a test file, WHEN Dispatchers_setMain is called THEN expect lint error`() {
        lint()
            .allowMissingSdk()
            .files(dispatcherStub, setMainUsage)
            .run()
            .expectErrorCount(1)
            .expectContains(
                """
                Avoid using 'Dispatchers.setMain' directly in tests. Use a TestRule (e.g., MainCoroutineRule or a local rule) for managing dispatchers
            """.trimIndent(),
            )
    }

    @Test
    fun `GIVEN a test file, WHEN Dispatchers_resetMain is called THEN expect lint error`() {
        lint()
            .allowMissingSdk()
            .files(dispatcherStub, resetMainUsage)
            .run()
            .expectErrorCount(1)
            .expectContains(
                """
                Avoid using 'Dispatchers.resetMain' directly in tests. Use a TestRule (e.g., MainCoroutineRule or a local rule) for managing dispatchers
            """.trimIndent(),
            )
    }

    @Test
    fun `GIVEN a test file, WHEN Dispatchers setMain or resetMain are NOT called then expect no error`() {
        val cleanUsage = TestFiles.kotlin(
            """
            package com.example.test

            import kotlinx.coroutines.test.Dispatchers

            class MyCleanTest {
                init {
                    val mainDispatcher = Dispatchers.Main // this is fine
                }
            }
            """,
        ).indented()

        lint()
            .allowMissingSdk()
            .files(dispatcherStub, cleanUsage)
            .run()
            .expectClean()
    }
}
