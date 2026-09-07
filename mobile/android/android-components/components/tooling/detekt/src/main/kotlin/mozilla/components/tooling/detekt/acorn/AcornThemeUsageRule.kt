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
import org.jetbrains.kotlin.psi.KtImportDirective

/**
 * Lints against `AcornTheme` usage in apps that provide their own theme wrapper on top of
 * `AcornTheme`.
 *
 * [appThemeName] is an optional parameter provided to the detekt [config] that is used to
 * specify the full import namespace to use instead of the app-level theme wrapper when
 * constructing the reported message (e.g. org.mozilla.fenix.theme.FirefoxTheme).
 */
class AcornThemeUsageRule(config: Config = Config.empty) : Rule(config) {
    override val issue: Issue
        get() = Issue(
            id = "AcornThemeUsage",
            severity = Severity.Maintainability,
            description = "AcornTheme should not be used directly in apps that " +
                "provide their own theme wrapper. Use the app-level theme instead.",
            debt = Debt.FIVE_MINS,
        )

    private val appThemeName: String
        get() = valueOrDefault(key = APP_THEME_NAME_KEY, default = "")

    /**
     * Report a code smell if [FORBIDDEN_IMPORT] is found in the imports.
     */
    override fun visitImportDirective(importDirective: KtImportDirective) {
        super.visitImportDirective(importDirective)

        val importName = importDirective.importedFqName?.asString() ?: return

        if (importName == FORBIDDEN_IMPORT) {
            val name = appThemeName.ifEmpty { "the app-level theme" }
            report(
                CodeSmell(
                    issue = issue,
                    entity = Entity.from(importDirective),
                    message = "Use $name instead of AcornTheme.",
                ),
            )
        }
    }

    companion object {
        private const val FORBIDDEN_IMPORT = "mozilla.components.compose.base.theme.AcornTheme"
        private const val APP_THEME_NAME_KEY = "appThemeName"
    }
}
