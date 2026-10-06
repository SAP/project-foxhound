/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.tooling.detekt.acorn

import io.gitlab.arturbosch.detekt.api.CodeSmell
import io.gitlab.arturbosch.detekt.api.Config
import io.gitlab.arturbosch.detekt.api.Debt
import io.gitlab.arturbosch.detekt.api.Entity
import io.gitlab.arturbosch.detekt.api.Issue
import io.gitlab.arturbosch.detekt.api.Rule
import io.gitlab.arturbosch.detekt.api.Severity
import org.jetbrains.kotlin.com.intellij.psi.PsiElement
import org.jetbrains.kotlin.psi.KtDotQualifiedExpression
import org.jetbrains.kotlin.psi.KtImportDirective
import org.jetbrains.kotlin.psi.psiUtil.getStrictParentOfType

/**
 * Lints against `MaterialTheme.typography` in apps that provide their own typography.
 *
 * `appTypographyName` is an optional parameter provided to the detekt rule config that is used to
 * specify the full import namespace for where to access the `typography` properties from
 * (e.g. org.mozilla.fenix.theme.FirefoxTheme.typography).
 */
class MaterialTypographyUsageRule(config: Config = Config.empty) : Rule(config) {
    override val issue: Issue
        get() = Issue(
            id = "MaterialTypographyUsage",
            severity = Severity.Maintainability,
            description = "MaterialTheme.typography should not be used directly in apps " +
                "that provide their own typography. Use the app-level typography instead.",
            debt = Debt.FIVE_MINS,
        )

    private val appTypographyName: String
        get() = valueOrDefault(key = APP_TYPOGRAPHY_NAME_KEY, default = "")

    /**
     * Report a code smell if FORBIDDEN_IMPORT is found in the imports.
     */
    override fun visitImportDirective(importDirective: KtImportDirective) {
        super.visitImportDirective(importDirective)

        val importName = importDirective.importedFqName?.asString() ?: return

        if (importName == FORBIDDEN_IMPORT) {
            reportCodeSmell(element = importDirective)
        }
    }

    /**
     * Report a code smell for `MaterialTheme.typography` or
     * `androidx.compose.material3.MaterialTheme` usage.
     */
    override fun visitDotQualifiedExpression(expression: KtDotQualifiedExpression) {
        super.visitDotQualifiedExpression(expression)

        // Imports are reported by [visitImportDirective]. Skip the nested
        // KtDotQualifiedExpression inside an import to avoid double-reporting.
        if (expression.getStrictParentOfType<KtImportDirective>() != null) return

        val receiver = expression.receiverExpression.text
        val selector = expression.selectorExpression?.text

        val isForbiddenReceiver = receiver == FORBIDDEN_RECEIVER ||
            receiver == "$FORBIDDEN_PACKAGE.$FORBIDDEN_RECEIVER"

        if (isForbiddenReceiver && selector == FORBIDDEN_SELECTOR) {
            reportCodeSmell(expression)
        }
    }

    private fun reportCodeSmell(element: PsiElement) {
        val name = appTypographyName.ifEmpty {
            "the app-level typography"
        }
        report(
            CodeSmell(
                issue = issue,
                entity = Entity.from(element = element),
                message = "Use $name instead of $FORBIDDEN_RECEIVER.$FORBIDDEN_SELECTOR.",
            ),
        )
    }

    companion object {
        private const val FORBIDDEN_PACKAGE = "androidx.compose.material3"
        private const val FORBIDDEN_RECEIVER = "MaterialTheme"
        private const val FORBIDDEN_SELECTOR = "typography"
        private const val FORBIDDEN_IMPORT = "$FORBIDDEN_PACKAGE.$FORBIDDEN_RECEIVER.$FORBIDDEN_SELECTOR"
        private const val APP_TYPOGRAPHY_NAME_KEY = "appTypographyName"
    }
}
