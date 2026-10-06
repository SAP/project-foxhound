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
class NoFunctionTypeMockingDetectorTest : LintDetectorTest() {
    override fun getDetector(): Detector = NoFunctionTypeMockingDetector()

    override fun getIssues(): List<Issue> = listOf(
        NoFunctionTypeMockingDetector.ISSUE_NO_FUNCTION_TYPE_MOCKING,
    )

    private val mockkStubs = TestFiles.kotlin(
        """
        package io.mockk

        inline fun <reified T : Any> mockk(
            name: String? = null,
            relaxed: Boolean = false,
            vararg moreInterfaces: kotlin.reflect.KClass<*>,
            relaxUnitFun: Boolean = false,
            block: T.() -> Unit = {},
        ): T = null as T

        inline fun <reified T : Any> spyk(
            objToCopy: T? = null,
            name: String? = null,
            vararg moreInterfaces: kotlin.reflect.KClass<*>,
            recordPrivateCalls: Boolean = false,
            block: T.() -> Unit = {},
        ): T = null as T
        """,
    ).indented()

    @Test
    fun `explicit Function0 type argument is flagged`() {
        lint()
            .allowMissingSdk()
            .files(
                mockkStubs,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import io.mockk.mockk
                    class MyTest {
                        val onClick = mockk<() -> Unit>(relaxed = true)
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectErrorCount(1)
            .expectContains("Do not mockk/spyk a Kotlin function type.")
    }

    @Test
    fun `explicit Function1 type argument is flagged`() {
        lint()
            .allowMissingSdk()
            .files(
                mockkStubs,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import io.mockk.mockk
                    class MyTest {
                        val onValue = mockk<(String) -> Int>()
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectErrorCount(1)
            .expectContains("Do not mockk/spyk a Kotlin function type.")
    }

    @Test
    fun `multi-arg function type is flagged`() {
        lint()
            .allowMissingSdk()
            .files(
                mockkStubs,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import io.mockk.mockk
                    class MyTest {
                        val onPair = mockk<(String, Int) -> Boolean>()
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectErrorCount(1)
            .expectContains("Do not mockk/spyk a Kotlin function type.")
    }

    @Test
    fun `suspend function type is flagged`() {
        lint()
            .allowMissingSdk()
            .files(
                mockkStubs,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import io.mockk.mockk
                    class MyTest {
                        val onSuspend = mockk<suspend () -> Unit>(relaxed = true)
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectErrorCount(1)
            .expectContains("Do not mockk/spyk a Kotlin function type.")
    }

    @Test
    fun `spyk of function type is flagged`() {
        lint()
            .allowMissingSdk()
            .files(
                mockkStubs,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import io.mockk.spyk
                    class MyTest {
                        val onClick = spyk<() -> Unit>()
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectErrorCount(1)
            .expectContains("Do not mockk/spyk a Kotlin function type.")
    }

    @Test
    fun `function type inferred from property type is flagged`() {
        lint()
            .allowMissingSdk()
            .files(
                mockkStubs,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import io.mockk.mockk
                    class MyTest {
                        private val onClick: () -> Unit = mockk(relaxed = true)
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectErrorCount(1)
            .expectContains("Do not mockk/spyk a Kotlin function type.")
    }

    @Test
    fun `mockk of a non-function type is not flagged`() {
        lint()
            .allowMissingSdk()
            .files(
                mockkStubs,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import io.mockk.mockk
                    interface MyService { fun doIt() }
                    class MyTest {
                        val svc = mockk<MyService>(relaxed = true)
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectClean()
    }

    @Test
    fun `unrelated mockk-named function is not flagged`() {
        lint()
            .allowMissingSdk()
            .files(
                TestFiles.kotlin(
                    """
                    package com.example.other
                    fun <T> mockk(): T = TODO()
                    class MyTest {
                        val foo: () -> Unit = com.example.other.mockk()
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectClean()
    }

    @Test
    fun `spyk of a real instance whose type is not a function type is not flagged`() {
        lint()
            .allowMissingSdk()
            .files(
                mockkStubs,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import io.mockk.spyk
                    class Subject { fun doIt() = Unit }
                    class MyTest {
                        val subject = spyk(Subject())
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectClean()
    }

    @Test
    fun `function-typed property assigned a plain lambda alongside an unrelated mockk is not flagged`() {
        lint()
            .allowMissingSdk()
            .files(
                mockkStubs,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import io.mockk.mockk
                    interface MyService { fun doIt() }
                    class MyTest {
                        private val onClickCount = intArrayOf(0)
                        private val onClick: () -> Unit = { onClickCount[0]++ }
                        private val onValue: (String) -> Unit = { _ -> Unit }
                        private val svc: MyService = mockk(relaxed = true)
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectClean()
    }

    @Test
    fun `function-typed lateinit assigned a plain lambda alongside an unrelated mockk is not flagged`() {
        lint()
            .allowMissingSdk()
            .files(
                mockkStubs,
                TestFiles.kotlin(
                    """
                    package com.example.test
                    import io.mockk.mockk
                    interface MyService { fun doIt() }
                    class MyTest {
                        private lateinit var onClick: () -> Unit
                        private val svc: MyService = mockk(relaxed = true)
                        fun setup() {
                            onClick = { }
                        }
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectClean()
    }
}
