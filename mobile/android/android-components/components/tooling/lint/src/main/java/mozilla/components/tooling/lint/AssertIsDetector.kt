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
import com.intellij.psi.PsiClassType
import com.intellij.psi.PsiMethod
import com.intellij.psi.PsiTypes
import org.jetbrains.uast.UBinaryExpressionWithType
import org.jetbrains.uast.UCallExpression
import org.jetbrains.uast.UastBinaryExpressionWithTypeKind.InstanceCheck
import org.jetbrains.uast.skipParenthesizedExprDown
import java.util.EnumSet

/**
 * Detects `assertTrue(x is SomeType)` patterns and suggests replacing them with
 * `assertIs<SomeType>(x)` from `kotlin.test`, which provides smart casts and
 * more informative failure messages.
 */
class AssertIsDetector : Detector(), Detector.UastScanner {

    companion object {
        private val Implementation = Implementation(
            AssertIsDetector::class.java,
            EnumSet.of(Scope.JAVA_FILE, Scope.TEST_SOURCES),
        )

        @JvmField
        val ISSUE_USE_ASSERT_IS: Issue = Issue.create(
            id = "AssertTrueInsteadOfAssertIs",
            briefDescription = "Use assertIs<Type>() instead of assertTrue(x is Type)",
            explanation = """
                `assertIs<SomeType>(x)` from `kotlin.test` gives a smart cast on the variable \
                and a descriptive error on failure.
            """.trimIndent(),
            category = Category.TESTING,
            priority = 6,
            severity = Severity.WARNING,
            implementation = Implementation,
        )
    }

    override fun getApplicableMethodNames(): List<String> = listOf("assertTrue")

    override fun visitMethodCall(
        context: JavaContext,
        node: UCallExpression,
        method: PsiMethod,
    ) {
        // JUnit: assertTrue(Boolean) or assertTrue(String, Boolean)
        // kotlin.test: assertTrue(Boolean) or assertTrue(Boolean, String?)
        val args = node.valueArguments.map { it.skipParenthesizedExprDown() }
        val booleanArg = args.firstOrNull { it.getExpressionType() == PsiTypes.booleanType() }
        val stringArg = args.firstOrNull {
            (it.getExpressionType() as? PsiClassType)?.name == String::class.simpleName
        }

        if (booleanArg is UBinaryExpressionWithType && booleanArg.operationKind is InstanceCheck) {
            val type = booleanArg.typeReference?.sourcePsi?.text
            val operand = booleanArg.operand.sourcePsi?.text
            val message = stringArg?.sourcePsi?.text

            val replacementText = if (type == null || operand == null) {
                null
            } else if (message != null) {
                "assertIs<$type>($operand, $message)"
            } else {
                "assertIs<$type>($operand)"
            }

            val quickFix = replacementText?.let {
                val fullyQualified = "kotlin.test.$replacementText"
                LintFix.create()
                    .name("Replace with $replacementText")
                    .replace()
                    .all()
                    .with(fullyQualified)
                    .shortenNames()
                    .build()
            }

            context.report(
                ISSUE_USE_ASSERT_IS,
                node,
                context.getLocation(node),
                "Use assertIs<${type ?: "T"}>() for better failure messages and smart casts",
                quickFix,
            )
        }
    }
}
