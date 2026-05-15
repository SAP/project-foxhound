/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.tooling.detekt

import io.gitlab.arturbosch.detekt.api.CodeSmell
import io.gitlab.arturbosch.detekt.api.Config
import io.gitlab.arturbosch.detekt.api.Debt
import io.gitlab.arturbosch.detekt.api.Entity
import io.gitlab.arturbosch.detekt.api.Issue
import io.gitlab.arturbosch.detekt.api.Rule
import io.gitlab.arturbosch.detekt.api.Severity
import org.jetbrains.kotlin.psi.KtCallExpression
import org.jetbrains.kotlin.psi.KtDotQualifiedExpression

/**
 * Detects usage of `System.currentTimeMillis()` and enforces the use of
 * `mozilla.components.support.utils.DateTimeProvider.currentTimeMillis()` instead to improve
 * testability.
 */
class NoSystemCurrentTimeMillisRule(config: Config = Config.empty) : Rule(config) {

    override val issue = Issue(
        id = "NoSystemCurrentTimeMillis",
        severity = Severity.CodeSmell,
        description = "`System.currentTimeMillis()` should not be used directly. " +
            "Use `mozilla.components.support.utils.DateTimeProvider.currentTimeMillis()` " +
            "abstraction instead for testability.",
        debt = Debt.FIVE_MINS,
    )

    override fun visitDotQualifiedExpression(expression: KtDotQualifiedExpression) {
        super.visitDotQualifiedExpression(expression)

        val receiverText = expression.receiverExpression.text
        val selectorExpression = expression.selectorExpression

        if (receiverText == "System" && selectorExpression is KtCallExpression) {
            val methodName = selectorExpression.calleeExpression?.text
            if (methodName == "currentTimeMillis") {
                report(
                    CodeSmell(
                        issue,
                        Entity.from(expression),
                        "Avoid using `System.currentTimeMillis()` directly. " +
                            "Use `mozilla.components.support.utils.DateTimeProvider.currentTimeMillis()`",
                    ),
                )
            }
        }
    }
}
