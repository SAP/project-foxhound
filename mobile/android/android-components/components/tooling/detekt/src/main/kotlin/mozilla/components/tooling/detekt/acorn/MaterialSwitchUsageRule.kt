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
import org.jetbrains.kotlin.psi.KtCallExpression
import org.jetbrains.kotlin.psi.KtDotQualifiedExpression
import org.jetbrains.kotlin.psi.KtImportDirective
import org.jetbrains.kotlin.psi.psiUtil.getStrictParentOfType

/**
 * Lints against using `androidx.compose.material3.Switch` and instead recommends using
 * `mozilla.components.compose.base.Switch` which aligns with the Acorn Design System.
 */
class MaterialSwitchUsageRule(config: Config = Config.empty) : Rule(config) {
    override val issue: Issue
        get() = Issue(
            id = "MaterialSwitchUsage",
            severity = Severity.Maintainability,
            description = "$FORBIDDEN_IMPORT should not be used directly. Use " +
                "$RECOMMENDED_IMPORT instead, which aligns with the Acorn Design System",
            debt = Debt.FIVE_MINS,
        )

    /**
     * Report a code smell if [FORBIDDEN_IMPORT] is found in the imports.
     */
    override fun visitImportDirective(importDirective: KtImportDirective) {
        super.visitImportDirective(importDirective)

        val importName = importDirective.importedFqName?.asString() ?: return

        if (importName == FORBIDDEN_IMPORT) {
            reportCodeSmell(element = importDirective)
        }
    }

    /**
     * Report a code smell if the fully qualified `androidx.compose.material3.Switch` is referenced
     * outside the imports.
     */
    override fun visitDotQualifiedExpression(expression: KtDotQualifiedExpression) {
        super.visitDotQualifiedExpression(expression)

        // Imports are reported by [visitImportDirective]. Skip the nested
        // KtDotQualifiedExpression inside an import to avoid double-reporting.
        if (expression.getStrictParentOfType<KtImportDirective>() != null) return

        if (expression.receiverExpression.text != FORBIDDEN_PACKAGE) return

        val selectorName = when (val selector = expression.selectorExpression) {
            is KtCallExpression -> selector.calleeExpression?.text
            else -> selector?.text
        }

        if (selectorName == FORBIDDEN_NAME) {
            reportCodeSmell(element = expression)
        }
    }

    private fun reportCodeSmell(element: PsiElement) {
        report(
            CodeSmell(
                issue = issue,
                entity = Entity.from(element = element),
                message = MESSAGE,
            ),
        )
    }

    companion object {
        private const val FORBIDDEN_PACKAGE = "androidx.compose.material3"
        private const val FORBIDDEN_NAME = "Switch"
        private const val FORBIDDEN_IMPORT = "$FORBIDDEN_PACKAGE.$FORBIDDEN_NAME"
        private const val RECOMMENDED_IMPORT = "mozilla.components.compose.base.Switch"

        internal const val MESSAGE = "Use $RECOMMENDED_IMPORT instead of $FORBIDDEN_IMPORT."
    }
}
