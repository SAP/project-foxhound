/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.tooling.lint

import com.android.tools.lint.detector.api.Category
import com.android.tools.lint.detector.api.Detector
import com.android.tools.lint.detector.api.Implementation
import com.android.tools.lint.detector.api.Issue.Companion.create
import com.android.tools.lint.detector.api.JavaContext
import com.android.tools.lint.detector.api.Scope
import com.android.tools.lint.detector.api.Severity
import com.android.tools.lint.detector.api.SourceCodeScanner
import com.intellij.psi.PsiMethod
import org.jetbrains.uast.UCallExpression
import org.jetbrains.uast.getContainingUFile

/**
 * Detects usage of `resources.getDimensionPixelSize()` in Fenix code and suggests
 * replacing it with the `pixelSizeFor()` extension on `Context`, `View`, or `Fragment`.
 */
class PixelSizeForDetector : Detector(), SourceCodeScanner {
    companion object {
        private val Implementation = Implementation(
            PixelSizeForDetector::class.java,
            Scope.JAVA_FILE_SCOPE,
        )

        @JvmField
        val ISSUE_USE_PIXEL_SIZE_FOR = create(
            id = "Resources.GetDimensionPixelSizeInsteadOfPixelSizeFor",
            briefDescription = "Use pixelSizeFor() instead of resources.getDimensionPixelSize()",
            explanation = """
                `pixelSizeFor()` is an extension on `Context`, `View`, and `Fragment` \
                that wraps `resources.getDimensionPixelSize(...)`.
            """.trimIndent(),
            category = Category.PRODUCTIVITY,
            priority = 6,
            severity = Severity.WARNING,
            implementation = Implementation,
        )
    }

    override fun getApplicableMethodNames(): List<String> = listOf("getDimensionPixelSize")

    override fun visitMethodCall(
        context: JavaContext,
        node: UCallExpression,
        method: PsiMethod,
    ) {
        val packageName = node.getContainingUFile()?.packageName ?: return
        if (!packageName.startsWith("org.mozilla.fenix")) return

        val containingClassName = method.containingClass?.qualifiedName ?: return
        if (containingClassName == "android.content.res.Resources") {
            context.report(
                ISSUE_USE_PIXEL_SIZE_FOR,
                node,
                context.getLocation(node),
                "Use the pixelSizeFor() extension on Context/View/Fragment",
            )
        }
    }
}
