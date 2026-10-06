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
import com.android.tools.lint.detector.api.SourceCodeScanner
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiMethod
import com.intellij.psi.util.PsiTreeUtil
import org.jetbrains.kotlin.psi.KtNamedFunction
import org.jetbrains.kotlin.psi.KtParameter
import org.jetbrains.kotlin.psi.KtPrimaryConstructor
import org.jetbrains.kotlin.psi.KtSecondaryConstructor
import org.jetbrains.uast.UCallExpression
import org.jetbrains.uast.UCallableReferenceExpression
import org.jetbrains.uast.UElement

/**
 * Custom Lint detector that flags [System.currentTimeMillis] usage that can't be injected in tests.
 *
 * The only permitted use is as a default value of a parameter on a function that is not declared
 * inside a class or object, OR as a default value of a parameter on a class. For example:
 * ```
 * class Class(
 *     private val currentTimeProvider: () -> Long = { System.currentTimeMillis() }
 * )
 * ```
 * or
 * ```
 * fun topLevelFunction(currentTimeProvider: () -> Long = { System.currentTimeMillis() } ) { ... }
 * ```
 *
 * For more info on lint API guidance see
 * [Google Android Lint API Guide](https://googlesamples.github.io/android-custom-lint-rules/api-guide.html)
 */
class NoSystemCurrentTimeMillisDetector : Detector(), SourceCodeScanner {

    override fun getApplicableMethodNames(): List<String> = listOf(METHOD_NAME)

    override fun visitMethodCall(context: JavaContext, node: UCallExpression, method: PsiMethod) {
        // `getApplicableMethodNames` matches by name only, so other classes that happen to
        // declare a `currentTimeMillis` method would also reach here.
        if (method.containingClass?.qualifiedName != SYSTEM_CLASS) return

        // Default-parameter call sites are injectable (callers can pass a fake clock), so
        // they're the one permitted use of the real system clock.
        if (isInjectableDefaultParameter(node.sourcePsi)) return

        context.report(
            ISSUE_NO_SYSTEM_CURRENT_TIME_MILLIS,
            node,
            context.getLocation(node),
            MESSAGE,
        )
    }

    override fun getApplicableUastTypes(): List<Class<out UElement>> =
        listOf(UCallableReferenceExpression::class.java)

    override fun createUastHandler(context: JavaContext): UElementHandler =
        object : UElementHandler() {
            @Suppress("ReturnCount")
            override fun visitCallableReferenceExpression(node: UCallableReferenceExpression) {
                // Cheap name filter before resolution: `UCallableReferenceExpression` fires for
                // every `::name` reference in the file, so most invocations are not ours.
                if (node.callableName != METHOD_NAME) return

                // Resolve the reference to its underlying declaration. Bail if it's unresolved
                // or doesn't resolve to a method (e.g. a property reference of the same name).
                val resolved = node.resolve() as? PsiMethod ?: return

                // Confirm the method belongs to `java.lang.System`; other classes may declare
                // an unrelated `currentTimeMillis` method that we shouldn't flag.
                if (resolved.containingClass?.qualifiedName != SYSTEM_CLASS) return

                // Allow the same injectable-default-parameter exception as direct calls, e.g.
                // `fun foo(getTime: () -> Long = System::currentTimeMillis)` on a top-level fun.
                if (isInjectableDefaultParameter(node.sourcePsi)) return

                context.report(
                    ISSUE_NO_SYSTEM_CURRENT_TIME_MILLIS,
                    node,
                    context.getLocation(node),
                    MESSAGE,
                )
            }
        }

    @Suppress("ReturnCount")
    private fun isInjectableDefaultParameter(sourcePsi: PsiElement?): Boolean {
        // Need the underlying source element to walk the PSI tree; without it, we can't tell
        // where the call sits and must conservatively flag the call.
        if (sourcePsi == null) return false

        // Look for an enclosing Kotlin parameter. Java has no default parameter values, so a
        // Java call site will never have a `KtParameter` ancestor and is always flagged.
        val parameter =
            PsiTreeUtil.getParentOfType(sourcePsi, KtParameter::class.java) ?: return false

        // A parameter without a default value isn't the injectable case we permit; the caller
        // is then forced to pass the system clock at every call site.
        val defaultValue = parameter.defaultValue ?: return false

        // Confirm the call actually lives inside the default-value expression rather than
        // elsewhere under the parameter (e.g. an annotation argument on the parameter).
        if (!PsiTreeUtil.isAncestor(defaultValue, sourcePsi, false)) return false

        return when (val owner = parameter.ownerFunction) {
            // Constructor parameters always belong to a class: Kotlin objects can't declare
            // constructor parameters, so reaching here implies a class.
            is KtPrimaryConstructor, is KtSecondaryConstructor -> true
            // Restrict to top-level functions: methods on classes/objects and local functions
            // are not injectable from outside.
            is KtNamedFunction -> owner.isTopLevel
            else -> false
        }
    }

    companion object {
        private const val SYSTEM_CLASS = "java.lang.System"
        private const val METHOD_NAME = "currentTimeMillis"
        private const val MESSAGE =
            "`System.currentTimeMillis()` must be injectable. Only permitted as a default value " +
                "of a parameter on a top-level function or on a class."

        @JvmField
        val ISSUE_NO_SYSTEM_CURRENT_TIME_MILLIS: Issue = Issue.create(
            id = "NoSystemCurrentTimeMillis",
            briefDescription = "`System.currentTimeMillis()` must be injectable.",
            explanation = """
                `System.currentTimeMillis()` relies on global state which is hard to control in
                tests. Restrict its use to default parameter values so callers can inject a fake
                clock. The only permitted call sites are:
                  - as a default value of a parameter on a function that is not declared inside a
                    class or object; or
                  - as a default value of a parameter on a class.
            """.trimIndent(),
            category = Category.CORRECTNESS,
            priority = 6,
            severity = Severity.WARNING,
            implementation = Implementation(
                NoSystemCurrentTimeMillisDetector::class.java,
                Scope.JAVA_FILE_SCOPE,
            ),
        )
    }
}
