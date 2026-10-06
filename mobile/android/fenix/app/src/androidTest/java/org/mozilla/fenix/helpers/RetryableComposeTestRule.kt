/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.helpers

import android.app.Activity
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.compose.ui.test.IdlingResource
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import kotlinx.coroutines.test.TestScope
import org.junit.rules.TestRule
import org.junit.runner.Description
import org.junit.runners.model.Statement
import org.mozilla.fenix.helpers.Constants.TAG

/**
 * A [TestRule] wrapper for [AndroidComposeTestRule] that supports test retries.
 *
 * Traditional Compose rules cannot be reused across multiple [Statement.evaluate] calls
 * because their internal [TestScope] and [IdlingResource] transitions to a terminal
 * state upon completion or failure.
 *
 * This rule acts as a factory, using the provided [composeRuleFactory] to instantiate
 * a fresh [AndroidComposeTestRule] and a new [Activity] for every retry attempt
 * triggered by an outer [RetryTestRule].
 *
 * The type parameters are inferred from the factory's return type at the call site, so
 * callers typically write `RetryableComposeTestRule { AndroidComposeTestRuleV2(...) { ... } }`
 * without spelling them out.
 *
 * Pair this rule with a [RetryTestRule] declared at a *lower* [order][org.junit.Rule.order]
 * value so the retry rule wraps this one and re-invokes our [evaluate] on each attempt
 * (lower [order][org.junit.Rule.order] = outermost in JUnit). Without that ordering, retries
 * re-run only the test method inside a single [evaluate], reusing the same inner rule:
 *
 * ```
 * @get:Rule(order = 1)
 * val retryTestRule = RetryTestRule(3)
 *
 * @get:Rule(order = 2)
 * val retryableComposeTestRule = RetryableComposeTestRule {
 *     AndroidComposeTestRuleV2(MyActivityTestRule()) { it.activity }
 * }
 * ```
 *
 * @param composeRuleFactory A lambda that constructs the specific Compose rule configuration.
 */
class RetryableComposeTestRule<R : TestRule, T : ComponentActivity>(
    private val composeRuleFactory: () -> AndroidComposeTestRule<R, T>,
) : TestRule {

    private var _innerRule: AndroidComposeTestRule<R, T>? = null

    /**
     * Provides access to the current instance of the compose rule.
     * Use this inside your test methods: composeTestRule.onNodeWithText(...)
     */
    val current: AndroidComposeTestRule<R, T>
        get() = _innerRule
            ?: error("RetryableComposeTestRule.current accessed before apply() initialized the inner rule")

    override fun apply(base: Statement, description: Description): Statement {
        return object : Statement() {
            override fun evaluate() {
                Log.i(TAG, "RetryableComposeTestRule: Creating new compose rule for ${description.className}.${description.methodName}")
                val rule = composeRuleFactory()
                _innerRule = rule
                Log.i(TAG, "RetryableComposeTestRule: Applying inner compose rule.")
                // Apply the new AndroidComposeTestRule to the base statement.
                //
                // Note: we deliberately do NOT clear _innerRule on exit. JUnit constructs a fresh
                // test class instance per test method, so there is no stale-state risk between
                // tests, and the next retry's evaluate overwrites the field. Leaving _innerRule
                // populated also lets an outer rule read .current after evaluate returns, should
                // a future caller ever need that.
                rule.apply(base, description).evaluate()
                // Reached only when the inner statement returned without throwing; on a failure
                // the outer RetryTestRule catches the exception, re-invokes our apply(), and
                // composeRuleFactory() builds a fresh inner rule for the next attempt.
                Log.i(TAG, "RetryableComposeTestRule: Inner compose rule evaluation completed without throwing.")
            }
        }
    }
}
