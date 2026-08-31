/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.tooling.lint

import com.android.tools.lint.detector.api.Category
import com.android.tools.lint.detector.api.Detector
import com.android.tools.lint.detector.api.Implementation
import com.android.tools.lint.detector.api.Issue
import com.android.tools.lint.detector.api.JavaContext
import com.android.tools.lint.detector.api.Scope
import com.android.tools.lint.detector.api.Severity
import com.android.tools.lint.detector.api.SourceCodeScanner
import com.intellij.psi.PsiMethod
import org.jetbrains.uast.UCallExpression
import java.util.EnumSet

/**
 * A custom Lint detector that checks for direct usage of `Dispatchers.setMain` within test files.
 *
 * This detector aims to enforce best practices for managing coroutine dispatchers in tests.
 * Directly manipulating `Dispatchers.setMain` can lead to brittle and hard-to-maintain tests.
 * Instead, it encourages injecting dispatchers into components, allowing tests to provide
 * a `TestDispatcher` or a controlled dispatcher without modifying global state.
 *
 * The detector specifically looks for `UCallExpression` nodes where the method name is `setMain`
 * or `resetMain` and the receiver is `kotlinx.coroutines.test`. It only operates on files
 * identified as test files (based on their path containing `/src/test/` or `/src/androidTest/`).
 */
class NoDispatchersSetMainDetector : Detector(), SourceCodeScanner {

    /**
     * Companion object holding the lint issue definitions and detector implementation details.
     */
    companion object {

        private val Implementation = Implementation(
            NoDispatchersSetMainDetector::class.java,
            EnumSet.of(Scope.JAVA_FILE, Scope.TEST_SOURCES),
        )

        @JvmField
        val ISSUE_NO_DISPATCHERS_SET_MAIN: Issue = Issue.create(
            id = "NoDispatchersSetMainInTests",
            briefDescription = "Prohibits `Dispatchers.setMain` in test files",
            explanation = """
                Using `Dispatchers.setMain` directly within test methods can lead to complex and hard-to-manage test setups
                due to global state manipulation.
                It's preferable to use dependency injection to provide dispatchers to your components.
                In tests, you can then pass a `StandardTestDispatcher` or `UnconfinedTestDispatcher` directly
                to the component being tested. This promotes better isolation and simplifies test code.
            """.trimIndent(),
            category = Category.CORRECTNESS,
            priority = 6,
            severity = Severity.ERROR,
            implementation = Implementation,
        )
    }

    override fun getApplicableMethodNames(): List<String>? = listOf(
        "setMain",
        "resetMain",
    )

    override fun visitMethodCall(context: JavaContext, node: UCallExpression, method: PsiMethod) {
        val methodName = method.name
        val containingClass = method.containingClass
        val className = containingClass?.qualifiedName ?: ""
        val packageName = if (className.contains(".")) className.substringBeforeLast('.') else ""

        if (packageName.startsWith("kotlinx.coroutines.test") &&
            (methodName == "setMain" || methodName == "resetMain")
        ) {
            context.report(
                ISSUE_NO_DISPATCHERS_SET_MAIN,
                node,
                context.getLocation(node),
                "Avoid using 'Dispatchers.$methodName' directly in tests. " +
                    "Inject dispatchers into your components instead to allow testing with a TestDispatcher.",
            )
            return
        }
    }
}
