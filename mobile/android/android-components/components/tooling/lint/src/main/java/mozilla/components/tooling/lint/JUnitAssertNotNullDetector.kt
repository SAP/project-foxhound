/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.tooling.lint

import com.android.tools.lint.detector.api.Category
import com.android.tools.lint.detector.api.Detector
import com.android.tools.lint.detector.api.Implementation
import com.android.tools.lint.detector.api.Issue
import com.android.tools.lint.detector.api.JavaContext
import com.android.tools.lint.detector.api.LintFix
import com.android.tools.lint.detector.api.Scope
import com.android.tools.lint.detector.api.Severity
import com.android.tools.lint.detector.api.SourceCodeScanner
import com.intellij.psi.PsiMethod
import org.jetbrains.uast.UCallExpression
import org.jetbrains.uast.skipParenthesizedExprDown
import java.util.EnumSet

/**
 * Detects usages of JUnit's `org.junit.Assert.assertNotNull` and suggests replacing them
 * with `kotlin.test.assertNotNull`, which returns the non-null value and enables smart casts.
 */
class JUnitAssertNotNullDetector : Detector(), SourceCodeScanner {

    companion object {
        private val Implementation = Implementation(
            JUnitAssertNotNullDetector::class.java,
            EnumSet.of(Scope.JAVA_FILE, Scope.TEST_SOURCES),
        )

        @JvmField
        val ISSUE_USE_KOTLIN_TEST_ASSERT_NOT_NULL: Issue = Issue.create(
            id = "JUnitAssertNotNull",
            briefDescription = "Use kotlin.test.assertNotNull instead of JUnit assertNotNull",
            explanation = """
                `kotlin.test.assertNotNull(value)` allows the compiler to smart cast \
                the variable to a non-null type so you don't need `!!` or `?.`.
            """.trimIndent(),
            category = Category.TESTING,
            priority = 6,
            severity = Severity.WARNING,
            implementation = Implementation,
        )
    }

    override fun getApplicableMethodNames(): List<String> = listOf("assertNotNull")

    override fun visitMethodCall(
        context: JavaContext,
        node: UCallExpression,
        method: PsiMethod,
    ) {
        if (context.evaluator.isMemberInClass(method, "org.junit.Assert")) {
            val quickFix = buildQuickFix(node)

            context.report(
                issue = ISSUE_USE_KOTLIN_TEST_ASSERT_NOT_NULL,
                scope = node,
                location = context.getLocation(node),
                message = "Use kotlin.test.assertNotNull instead of JUnit assertNotNull",
                quickfixData = quickFix,
            )
        }
    }

    private fun buildQuickFix(node: UCallExpression): LintFix? {
        // JUnit: assertNotNull(value) | assertNotNull(message, value)
        // kotlin.test: assertNotNull(value, message)
        val args = node.valueArguments.map { it.skipParenthesizedExprDown() }

        val valueArg = if (args.size == 1) args[0] else args[1]
        val messageArg = if (args.size == 1) null else args[0]

        val valueText = valueArg.sourcePsi?.text
        val messageText = messageArg?.sourcePsi?.text

        if (valueText != null) {
            val replacementText = if (messageText != null) {
                "kotlin.test.assertNotNull($valueText, $messageText)"
            } else {
                "kotlin.test.assertNotNull($valueText)"
            }

            return LintFix.create()
                .name("Replace with $replacementText")
                .family("Replace all assertNotNull usages to kotlin.test")
                .replace()
                .all()
                .with(replacementText)
                .shortenNames()
                .build()
        } else {
            return null
        }
    }
}
