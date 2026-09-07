/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.tooling.lint

import com.android.tools.lint.checks.infrastructure.LintDetectorTest
import com.android.tools.lint.checks.infrastructure.TestMode
import com.android.tools.lint.detector.api.Detector
import com.android.tools.lint.detector.api.Issue
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ComposeIconButtonDetectorTest : LintDetectorTest() {
    override fun getDetector(): Detector? = ComposeIconButtonDetector()

    override fun getIssues(): List<Issue> = listOf(
        ComposeIconButtonDetector.ISSUE_ICON_BUTTON_USAGE,
    )

    @Test
    fun `GIVEN the compose-base IconButton is imported WHEN it is used THEN no warning is reported`() {
        val validCode = """
            package mozilla.components.sample

            import mozilla.components.compose.base.button.IconButton

            fun MyComposable() {
                IconButton(onClick = {}) { }
            }
        """.trimIndent()

        lint()
            .allowMissingSdk()
            .allowCompilationErrors()
            .files(kotlin(validCode))
            .run()
            .expectClean()
    }

    @Test
    fun `GIVEN the Material3 IconButton is imported WHEN it is used THEN an error is reported`() {
        val invalidCode = """
            package mozilla.components.sample

            import androidx.compose.material3.IconButton

            fun MyComposable() {
                IconButton(onClick = {}) { }
            }
        """.trimIndent()

        lint()
            .allowMissingSdk()
            .allowCompilationErrors()
            .skipTestModes(TestMode.IMPORT_ALIAS)
            .files(kotlin(invalidCode))
            .run()
            .expect(
                """
src/mozilla/components/sample/test.kt:3: Error: Use mozilla.components.compose.base.button.IconButton instead of androidx.compose.material3.IconButton [ComposeIconButtonUsage]
import androidx.compose.material3.IconButton
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
1 errors, 0 warnings
                """.trimIndent(),
            )
    }
}
