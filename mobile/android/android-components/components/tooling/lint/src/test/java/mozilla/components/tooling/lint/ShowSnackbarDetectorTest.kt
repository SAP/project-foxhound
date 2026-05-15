/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.tooling.lint

import com.android.tools.lint.checks.infrastructure.LintDetectorTest
import com.android.tools.lint.checks.infrastructure.TestFiles
import com.android.tools.lint.detector.api.Detector
import com.android.tools.lint.detector.api.Issue
import mozilla.components.tooling.lint.ShowSnackbarDetector.Companion.VIOLATION_MESSAGE
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ShowSnackbarDetectorTest : LintDetectorTest() {

    override fun getDetector(): Detector = ShowSnackbarDetector()

    override fun getIssues(): List<Issue> =
        listOf(ShowSnackbarDetector.ISSUE_NO_DIRECT_SHOW_SNACKBAR)

    private val snackbarHostStateStub = TestFiles.kotlin(
        """
        package androidx.compose.material3

        open class SnackbarHostState {
            open suspend fun showSnackbar(
                message: String,
                actionLabel: String? = null,
                withDismissAction: Boolean = false,
                duration: SnackbarDuration = SnackbarDuration.Short
            ): SnackbarResult = SnackbarResult.Dismissed
        }

        enum class SnackbarDuration {
            Short,
            Long,
            Indefinite
        }

        enum class SnackbarResult {
            Dismissed,
            ActionPerformed
        }
        """,
    ).indented()

    private val snackbarHostStateSubclassStub = TestFiles.kotlin(
        """
        package com.example.subclass

        import androidx.compose.material3.SnackbarHostState

        class MySnackbarHostStateSubclass : SnackbarHostState()
        """,
    ).indented()

    private val composableAnnotationStub = TestFiles.kotlin(
        """
        package androidx.compose.runtime

        annotation class Composable
        """,
    ).indented()

    private val kotlinxCoroutinesStubs = TestFiles.kotlin(
        """
        package kotlinx.coroutines

        import kotlin.coroutines.CoroutineContext

        interface CoroutineScope {
            val coroutineContext: CoroutineContext
        }

        object GlobalScope : CoroutineScope {
            override val coroutineContext: CoroutineContext = kotlin.coroutines.EmptyCoroutineContext
            fun launch(block: suspend CoroutineScope.() -> Unit): Job = object : Job {}
        }

        interface Job
        """,
    ).indented()

    private val displaySnackbarStub = TestFiles.kotlin(
        """
        package mozilla.components.compose.base.snackbar

        import androidx.compose.runtime.Composable
        import androidx.compose.material3.SnackbarHostState

        @Composable
        fun displaySnackbar(snackbarHostState: SnackbarHostState, message: String) {}
        """,
    ).indented()

    private val directUsageSnackbar = TestFiles.kotlin(
        """
        package com.example

        import androidx.compose.material3.SnackbarHostState
        import androidx.compose.runtime.Composable
        import kotlinx.coroutines.GlobalScope

        @Composable
        fun MyScreen() {
            val hostState = SnackbarHostState()
            GlobalScope.launch {
                hostState.showSnackbar("Hello") // VIOLATION
            }
        }
        """,
    ).indented()

    private val subclassUsageSnackbar = TestFiles.kotlin(
        """
        package com.example

        import com.example.subclass.MySnackbarHostStateSubclass
        import androidx.compose.runtime.Composable
        import kotlinx.coroutines.GlobalScope

        @Composable
        fun MySubclassScreen() {
            val hostStateSubclass = MySnackbarHostStateSubclass()
            GlobalScope.launch {
                hostStateSubclass.showSnackbar("Hello from subclass") // VIOLATION
            }
        }
        """,
    ).indented()

    private val wrapperUsageSnackbar = TestFiles.kotlin(
        """
        package com.example

        import androidx.compose.material3.SnackbarHostState
        import androidx.compose.runtime.Composable
        import mozilla.components.compose.base.snackbar.displaySnackbar

        @Composable
        fun MyScreen() {
            val hostState = SnackbarHostState()
            displaySnackbar(hostState, "Hello from wrapper") // CLEAN
        }
        """,
    ).indented()

    private val otherShowSnackbarMethod = TestFiles.kotlin(
        """
        package com.example

        class OtherSnackbar {
            suspend fun showSnackbar(message: String) { }
        }

        class YetAnotherSnackbar {
            fun showSnackbar(message: String) {}
        }

        fun simplifiedTest(){
            YetAnotherSnackbar().showSnackbar("Different again") // CLEAN
        }
        """,
    ).indented()

    @Test
    fun `GIVEN direct call to SnackbarHostState_showSnackbar THEN expect lint error`() {
        lint().allowMissingSdk().files(
                snackbarHostStateStub,
                composableAnnotationStub,
                kotlinxCoroutinesStubs,
                directUsageSnackbar,
            ).run().expectErrorCount(1).expectContains(VIOLATION_MESSAGE)
    }

    @Test
    fun `GIVEN direct call to showSnackbar on a subclass THEN expect lint error`() {
        lint().allowMissingSdk().files(
            snackbarHostStateStub,
            snackbarHostStateSubclassStub,
            composableAnnotationStub,
            kotlinxCoroutinesStubs,
            subclassUsageSnackbar,
        ).run().expectErrorCount(1).expectContains(VIOLATION_MESSAGE)
    }

    @Test
    fun `GIVEN call to displaySnackbar wrapper THEN expect clean`() {
        lint().allowMissingSdk().files(
            snackbarHostStateStub,
            composableAnnotationStub,
            displaySnackbarStub,
            kotlinxCoroutinesStubs,
            wrapperUsageSnackbar,
        ).run().expectClean()
    }

    @Test
    fun `GIVEN call to a different showSnackbar method THEN expect clean`() {
        lint().allowMissingSdk().files(
            snackbarHostStateStub,
            composableAnnotationStub,
            kotlinxCoroutinesStubs,
            otherShowSnackbarMethod,
        ).run().expectClean()
    }
}
