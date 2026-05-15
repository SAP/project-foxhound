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

/**
 * Detects direct usage of `SnackbarHostState.showSnackbar(...)` from Material 3.
 *
 * This detector aims to enforce the use of the custom `displaySnackbar` function
 * provided in `mozilla.components.compose.base.snackbar`. The custom function includes
 * additional accessibility handling that might be missed when using the Material 3
 * function directly.
 *
 * It scans for method calls named "showSnackbar" and checks if the receiver of the call
 * is an instance of `androidx.compose.material3.SnackbarHostState` or its subclasses.
 * If such a usage is found, it reports an error, guiding the developer to use the preferred wrapper.
 */
class ShowSnackbarDetector : Detector(), SourceCodeScanner {

    override fun getApplicableMethodNames(): List<String>? {
        return listOf("showSnackbar")
    }

    override fun visitMethodCall(context: JavaContext, node: UCallExpression, method: PsiMethod) {
        val evaluator = context.evaluator
        // Check if the method is a member of SnackbarHostState or any of its subclasses.
        // `strict = false` includes the class itself in the check.
        if (evaluator.isMemberInSubClassOf(method, SNACKBAR_HOST_STATE_FQN, false)) {
            context.report(
                ISSUE_NO_DIRECT_SHOW_SNACKBAR,
                node,
                context.getLocation(node),
                VIOLATION_MESSAGE,
            )
        }
    }

    /**
     * Companion object for the [ShowSnackbarDetector].
     *
     * This object holds constants and the [Issue] definition for the lint rule.
     * The rule flags direct usage of `SnackbarHostState.showSnackbar(...)` and suggests using
     * `displaySnackbar` from `mozilla.components.compose.base.snackbar` for better accessibility.
     */
    companion object {
        private const val SNACKBAR_HOST_STATE_FQN = "androidx.compose.material3.SnackbarHostState"
        internal const val VIOLATION_MESSAGE =
            "Direct use of 'SnackbarHostState.showSnackbar(...)' is discouraged. " +
                "Use 'displaySnackbar' from 'mozilla.components.compose.base.snackbar' instead" +
                "for enhanced accessibility."
        private val Implementation = Implementation(
            ShowSnackbarDetector::class.java,
            Scope.JAVA_FILE_SCOPE,
        )

        @JvmField
        val ISSUE_NO_DIRECT_SHOW_SNACKBAR: Issue = Issue.create(
            id = "DisallowedDirectShowSnackbarCall",
            briefDescription = "Disallowed direct SnackbarHostState.showSnackbar call",
            explanation = VIOLATION_MESSAGE,
            category = Category.A11Y,
            priority = 6,
            severity = Severity.ERROR,
            implementation = Implementation,
        )
    }
}
