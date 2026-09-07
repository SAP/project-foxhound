/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.tooling.lint

import com.android.tools.lint.client.api.UElementHandler
import com.android.tools.lint.detector.api.Category
import com.android.tools.lint.detector.api.Detector
import com.android.tools.lint.detector.api.Implementation
import com.android.tools.lint.detector.api.Issue
import com.android.tools.lint.detector.api.JavaContext
import com.android.tools.lint.detector.api.Scope
import com.android.tools.lint.detector.api.Severity
import org.jetbrains.uast.UElement
import org.jetbrains.uast.UImportStatement

/**
 * Custom lint check that forbids the import of "androidx.compose.material3.IconButton"
 * and instead recommends using "mozilla.components.compose.base.button.IconButton".
 */
class ComposeIconButtonDetector : Detector(), Detector.UastScanner {

    override fun getApplicableUastTypes() = listOf(UImportStatement::class.java)
    override fun createUastHandler(context: JavaContext) = IconButtonImportHandler(context)

    /**
     * UAST handler that inspects import statements and reports usage of the disallowed
     * `androidx.compose.material3.IconButton` import.
     */
    class IconButtonImportHandler(private val context: JavaContext) : UElementHandler() {
        override fun visitImportStatement(node: UImportStatement) {
            node.importReference?.let { importReference ->
                val importFqName = importReference.asSourceString()
                if (importFqName == DISALLOWED_ICON_BUTTON_IMPORT) {
                    reportUsage(context, node)
                }
            }
        }

        private fun reportUsage(context: JavaContext, element: UElement) {
            context.report(
                ISSUE_ICON_BUTTON_USAGE,
                element,
                context.getLocation(element),
                VIOLATION_MESSAGE,
            )
        }
    }

    companion object {
        private const val DISALLOWED_ICON_BUTTON_IMPORT = "androidx.compose.material3.IconButton"
        private const val VIOLATION_MESSAGE =
            "Use mozilla.components.compose.base.button.IconButton instead of " +
                "androidx.compose.material3.IconButton"

        private val IMPLEMENTATION = Implementation(
            ComposeIconButtonDetector::class.java,
            Scope.JAVA_FILE_SCOPE,
        )

        val ISSUE_ICON_BUTTON_USAGE: Issue = Issue.create(
            id = "ComposeIconButtonUsage",
            briefDescription = "Forbidden use of androidx.compose.material3.IconButton",
            explanation = "The androidx.compose.material3.IconButton should not be used directly. " +
                "Please use mozilla.components.compose.base.button.IconButton instead, " +
                "which provides consistent styling and accessibility.",
            category = Category.CORRECTNESS,
            priority = 6,
            severity = Severity.ERROR,
            implementation = IMPLEMENTATION,
        )
    }
}
