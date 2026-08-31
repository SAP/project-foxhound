/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.tooling.lint

import com.android.tools.lint.checks.infrastructure.LintDetectorTest
import com.android.tools.lint.checks.infrastructure.TestFiles
import com.android.tools.lint.detector.api.Detector
import com.android.tools.lint.detector.api.Issue
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class PixelSizeForDetectorTest : LintDetectorTest() {
    override fun getDetector(): Detector = PixelSizeForDetector()

    override fun getIssues(): List<Issue> = listOf(PixelSizeForDetector.ISSUE_USE_PIXEL_SIZE_FOR)

    private val resourcesStub = TestFiles.java(
        """
        package android.content.res;
        public class Resources {
            public int getDimensionPixelSize(int id) { return 0; }
            public float getDimension(int id) { return 0f; }
        }
        """,
    ).indented()

    private val contextStub = TestFiles.java(
        """
        package android.content;
        import android.content.res.Resources;
        public class Context {
            public Resources getResources() { return null; }
        }
        """,
    ).indented()

    @Test
    fun `getDimensionPixelSize in fenix package reports warning`() {
        lint()
            .allowMissingSdk()
            .files(
                resourcesStub,
                contextStub,
                TestFiles.kotlin(
                    """
                    package org.mozilla.fenix.foo
                    import android.content.Context

                    class MyClass(private val context: Context) {
                        fun foo() {
                            context.resources.getDimensionPixelSize(42)
                        }
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectWarningCount(1)
            .expectContains("Use the pixelSizeFor() extension on Context/View/Fragment")
    }

    @Test
    fun `getDimensionPixelSize outside fenix package is clean`() {
        lint()
            .allowMissingSdk()
            .files(
                resourcesStub,
                contextStub,
                TestFiles.kotlin(
                    """
                    package mozilla.components.browser.icons
                    import android.content.Context

                    class MyClass(private val context: Context) {
                        fun foo() {
                            context.resources.getDimensionPixelSize(42)
                        }
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectClean()
    }

    @Test
    fun `getDimension on resources is clean`() {
        lint()
            .allowMissingSdk()
            .files(
                resourcesStub,
                contextStub,
                TestFiles.kotlin(
                    """
                    package org.mozilla.fenix.foo
                    import android.content.Context

                    class MyClass(private val context: Context) {
                        fun foo() {
                            context.resources.getDimension(42)
                        }
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectClean()
    }

    @Test
    fun `getDimensionPixelSize on unrelated class is clean`() {
        lint()
            .allowMissingSdk()
            .files(
                TestFiles.kotlin(
                    """
                    package org.mozilla.fenix.foo

                    class NotResources {
                        fun getDimensionPixelSize(id: Int): Int = 0
                    }

                    fun foo() {
                        NotResources().getDimensionPixelSize(42)
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectClean()
    }

    @Test
    fun `getDimensionPixelSize from Java in fenix package reports warning`() {
        lint()
            .allowMissingSdk()
            .files(
                resourcesStub,
                contextStub,
                TestFiles.java(
                    """
                    package org.mozilla.fenix.foo;
                    import android.content.Context;

                    public class MyClass {
                        private final Context context;
                        public MyClass(Context context) { this.context = context; }
                        public void foo() {
                            context.getResources().getDimensionPixelSize(42);
                        }
                    }
                    """,
                ).indented(),
            )
            .run()
            .expectWarningCount(1)
            .expectContains("Use the pixelSizeFor() extension on Context/View/Fragment")
    }
}
