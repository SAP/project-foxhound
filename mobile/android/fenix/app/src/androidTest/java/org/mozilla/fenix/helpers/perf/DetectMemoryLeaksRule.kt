/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.helpers.perf

import android.util.Log
import androidx.compose.ui.test.junit4.ComposeTestRule
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.platform.app.InstrumentationRegistry
import leakcanary.AppWatcher
import leakcanary.LeakCanary
import leakcanary.TestDescriptionHolder
import org.junit.rules.TestRule
import org.junit.runner.Description
import org.junit.runners.model.Statement
import org.mozilla.fenix.customannotations.SkipLeaks
import org.mozilla.fenix.helpers.Constants.TAG
import shark.AndroidReferenceMatchers

/**
 * Junit [TestRule] to detect memory leaks in the test suite. Adding this test rule to a test class
 * runs memory leak checks in all the tests in the class, unless it is annotated with [SkipLeaks]
 *
 * When the test suite uses the [ActivityScenarioRule], the order of applying
 * the [DetectMemoryLeaksRule] is important. The [ActivityScenarioRule] finishes the activity at the
 * end of each test, so, in order to detect memory leaks in the activity, this test rule has to be
 * applied after the activity scenario rule, so that it can detect leaks after the activity
 * has been destroyed.
 *
 * See [https://square.github.io/leakcanary/ui-tests/#test-rule-chains](https://square.github.io/leakcanary/ui-tests/#test-rule-chains)
 * for more.
 *
 * Sample usage:
 *
 * ```kotlin
 * class MyFeatureTest {
 *
 *   @get:Rule(order = 0)
 *   val composeTestRule = AndroidComposeTestRuleV2(MyActivityTestRule()) { it.activity }
 *
 *   @get:Rule(order = 1)
 *   val memoryLeaksRule = DetectMemoryLeaksRule(composeTestRule = { composeTestRule })
 *
 *   @Test
 *   fun testMyFeature() {
 *     // test body
 *   }
 *
 *   @Test
 *   @SkipLeaks
 *   fun testMyFeatureWithoutLeakDetection() {
 *     // test body
 *   }
 * }
 * ```
 *
 * @param tag Tag used to identify the calling code
 * @param composeTestRule Optional lambda returning the [ComposeTestRule] used by the test class.
 *   When provided, [ComposeTestRule.waitForIdle] is called after the test completes to drain
 *   pending Compose coroutines before the heap dump, preventing false-positive leak reports.
 *   The rule must be declared at a lower [order][org.junit.Rule.order] value than this rule
 *   (i.e. [order][org.junit.Rule.order] = 0 for [composeTestRule], 1 for this rule) so that
 *   Compose is still active when [waitForIdle][ComposeTestRule.waitForIdle] is called.
 */
class DetectMemoryLeaksRule(
    private val tag: String = DetectMemoryLeaksRule::class.java.simpleName,
    private val composeTestRule: (() -> ComposeTestRule)? = null,
) : TestRule {

    override fun apply(base: Statement, description: Description): Statement {
        val checkMemoryLeaks = leakDetectionEnabled(description)
        return if (checkMemoryLeaks) {
            TestDescriptionHolder.wrap(
                object : Statement() {
                    override fun evaluate() {
                        try {
                            LeakCanary.config = LeakCanary.config.copy(
                                referenceMatchers = AndroidReferenceMatchers.appDefaults + knownLeaks,
                            )
                            base.evaluate()
                            // If a composeTestRule lambda was supplied, draining is required for
                            // the leak assertion to be reliable: pending compose coroutines retain
                            // the AndroidComposeUiTestEnvironment via WindowRecomposerPolicy.factory
                            // and will trip false positives. A drain failure here likely means
                            // misconfigured rule ordering (composeTestRule rule applied at a higher
                            // order than this rule), which silently produced false-positive leaks
                            // before this check was added; fail loudly so the misconfiguration
                            // surfaces in CI rather than as flaky leak reports.
                            composeTestRule?.let { lambda ->
                                try {
                                    lambda.invoke().waitForIdle()
                                } catch (t: Throwable) {
                                    throw AssertionError(
                                        "DetectMemoryLeaksRule: waitForIdle() drain failed before leak detection. " +
                                            "Check that composeTestRule is declared at a lower @get:Rule order than " +
                                            "DetectMemoryLeaksRule so it is still active here.",
                                        t,
                                    )
                                }
                            }

                            FenixDetectLeaksAssert.assertNoLeaks(
                                tag = tag,
                                filename = "${description.className}_${description.methodName}",
                            )
                        } finally {
                            AppWatcher.objectWatcher.clearWatchedObjects()
                        }
                    }
                },
                description,
            )
        } else {
            val reason = description.skipReason()
            if (reason != null) {
                Log.i(
                    TAG,
                    "DetectMemoryLeaksRule: memory leak checks in ${description.displayName} disabled because: $reason",
                )
            }
            object : Statement() {
                override fun evaluate() {
                    base.evaluate()
                }
            }
        }
    }

    private fun Description.doesNotHaveSkipLeaksAnnotation(): Boolean {
        return annotations.none { it is SkipLeaks }
    }

    private fun hasDetectLeaksTestRunnerArg(): Boolean {
        val args = try {
            InstrumentationRegistry.getArguments()
        } catch (exception: IllegalStateException) {
            Log.e(TAG, "No instrumentation arguments registered", exception)
            null
        }

        return args?.getString(ARG_DETECT_LEAKS, "false") == "true"
    }

    /**
     * Determines whether or not leak detection is enabled
     *
     * @return true if the test is NOT annotated with @SkipLeaks AND
     * "detect-leak" argument set to "true"
     */
    private fun leakDetectionEnabled(description: Description): Boolean {
        return hasDetectLeaksTestRunnerArg() && description.doesNotHaveSkipLeaksAnnotation()
    }

    private fun Description.skipReason(): String? {
        val skipLeaksAnnotation = annotations.filterIsInstance<SkipLeaks>().firstOrNull()
        return if (skipLeaksAnnotation == null) {
            null
        } else {
            val reasons = skipLeaksAnnotation.reasons.joinToString(separator = ", ")
            reasons.ifEmpty { "has @SkipLeaks annotation" }
        }
    }

    private companion object {
        /**
         * Key identifying the test instrumentation runner argument to enable or disable
         * memory leak detection.
         */
        const val ARG_DETECT_LEAKS = "detect-leaks"
    }
}
