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
import com.intellij.psi.PsiMethod
import org.jetbrains.uast.UCallExpression
import java.util.EnumSet

/**
 * Detects `mockk<...>()` / `spyk<...>()` (and type-inferred equivalents) whose target type is a
 * Kotlin function type (e.g. `() -> Unit`, `(Foo) -> Bar`, `suspend () -> Unit`).
 *
 * Mocking a lambda type forces ByteBuddy to generate a subclass of
 * `kotlin.jvm.functions.FunctionN` and cache it in a `TypeCache` keyed on the sandboxed
 * classloader with a `WeakReference`. Under Robolectric's shared-sandbox classloader that weak
 * ref can be GC'd while the classloader still retains the generated class, so the next mock
 * creation hits `LinkageError: duplicate class definition for kotlin.jvm.functions.FunctionN$SubclassN`
 * and fails at test class `<init>`. The failure site is essentially random, landing on whichever
 * test's Function field initializer runs after GC clears the stale cache entry.
 *
 * Use a plain lambda instead. For call verification, record invocations into a counter or
 * `MutableList` inside the lambda body and assert on that.
 */
class NoFunctionTypeMockingDetector : Detector(), Detector.UastScanner {
    companion object {
        private val Implementation = Implementation(
            NoFunctionTypeMockingDetector::class.java,
            EnumSet.of(Scope.JAVA_FILE, Scope.TEST_SOURCES),
        )

        @JvmField
        val ISSUE_NO_FUNCTION_TYPE_MOCKING: Issue = Issue.create(
            id = "NoFunctionTypeMocking",
            briefDescription = "Avoid mockk/spyk of Kotlin function types",
            explanation = """
                Mocking a Kotlin function type (e.g. `() -> Unit`, `(Foo) -> Bar`) via `mockk<...>()`
                or `spyk<...>()` makes ByteBuddy generate a subclass of `kotlin.jvm.functions.FunctionN`.
                Robolectric's shared-sandbox classloader caches those generated classes with weak
                references; when a cache entry is GC'd but the classloader still holds the generated
                class, the next mock creation triggers `LinkageError: duplicate class definition` and
                aborts the test at class `<init>`.

                Use a plain lambda instead. If you need to verify the callback was invoked, record
                calls into a local counter or `MutableList` inside the lambda and assert on that.
            """.trimIndent(),
            category = Category.CORRECTNESS,
            priority = 7,
            severity = Severity.ERROR,
            implementation = Implementation,
        )

        private const val FUNCTION_TYPE_PREFIX = "kotlin.jvm.functions.Function"
    }

    override fun getApplicableMethodNames(): List<String> = listOf("mockk", "spyk")

    override fun visitMethodCall(context: JavaContext, node: UCallExpression, method: PsiMethod) {
        val containingClass = method.containingClass?.qualifiedName.orEmpty()
        val returnType = node.returnType?.canonicalText.orEmpty()
        if (!containingClass.startsWith("io.mockk.") || !returnType.startsWith(FUNCTION_TYPE_PREFIX)) {
            return
        }

        context.report(
            ISSUE_NO_FUNCTION_TYPE_MOCKING,
            node,
            context.getLocation(node),
            "Do not mockk/spyk a Kotlin function type. Use a plain lambda that records calls " +
                "into a counter or MutableList instead.",
        )
    }
}
