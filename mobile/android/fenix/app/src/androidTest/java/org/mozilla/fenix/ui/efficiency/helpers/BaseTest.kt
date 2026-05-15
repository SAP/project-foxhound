/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.helpers

import android.util.Log
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.RetryTestRule
import org.mozilla.fenix.helpers.TestSetup
import org.mozilla.fenix.ui.efficiency.logging.LoggingBridge
import org.mozilla.fenix.ui.efficiency.logging.TestLogging

/**
 * BaseTest
 *
 * Why BaseTest wires up the structured logger:
 * - Tests should only describe "what is being tested".
 * - The harness (BaseTest/BasePage/helpers) owns "how it runs": navigation, retries, selectors,
 *   and therefore it owns observability for those behaviors.
 *
 * Why we print to stdout:
 * - Instrumentation captures System.out into logcat, which can be filtered into a clean stream.
 * - This gives us a single location for human debugging locally and in CI artifacts without
 *   requiring additional infrastructure during early iteration.
 *
 * Long-term intent:
 * - This structured log stream becomes a source-of-truth execution trace that remains useful
 *   even when tests are dynamically generated (factories, reflection, CI-driven permutations).
 * - Later we can route the same events into richer sinks (files/JSON/XML) and unify with the
 *   existing Feature.spec / factory logging pipeline.
 */
abstract class BaseTest(
    private val skipOnboarding: Boolean = true,
    private val isMenuRedesignCFREnabled: Boolean = false,
    private val isPageLoadTranslationsPromptEnabled: Boolean = false,
) : TestSetup() {

    @get:Rule(order = 0)
    val composeRule: AndroidComposeTestRule<HomeActivityIntentTestRule, *> =
        AndroidComposeTestRule(
            HomeActivityIntentTestRule(
                skipOnboarding = skipOnboarding,
                isMenuRedesignCFREnabled = isMenuRedesignCFREnabled,
                isPageLoadTranslationsPromptEnabled = isPageLoadTranslationsPromptEnabled,
            ),
        ) { it.activity }

    protected val on: PageContext = PageContext(composeRule)

    @get:Rule(order = 1)
    val retryTestRule = RetryTestRule(3)

    /**
     * Reporter lifecycle:
     * - Create once if missing.
     * - Reset at the start of every test so summaries and counters are per-test.
     *
     * Why reset instead of re-creating:
     * - Keeps construction cheap and avoids wiring churn if we later attach file sinks.
     * - Makes it easier to evolve toward a more formal "test context" object later.
     */
    @Before
    override fun setUp() {
        super.setUp()
        if (TestLogging.reporter == null) {
            TestLogging.reporter = LoggingBridge.createReporter()
        }
        TestLogging.reporter?.reset()

        // State tracker is a lightweight breadcrumb used by navigation helpers.
        // Source-of-truth remains selector-based verification (mozIsOnPageNow / mozWaitForPageToLoad).
        PageStateTracker.currentPageName = "AppEntry"
        Log.i("BaseTest", "🚀 Starting test with page: AppEntry")
    }

    /**
     * Print a short per-test summary to stdout.
     *
     * Why:
     * - Helps spot where time was spent and which layer failed most often (STEP/CMD/LOC).
     * - Provides immediate value in CI where you may only have the log artifact.
     *
     * Note:
     * - "Wall time" is overall elapsed real-world time for the test (start -> end).
     * - STEP/CMD/LOC totals sum only the instrumented scopes.
     */
    @After
    fun tearDownLogging() {
        try {
            TestLogging.reporter?.printSummary()
        } catch (_: Throwable) {
            // Logging must never fail a test.
        }
    }
}
