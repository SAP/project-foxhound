/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui

import android.util.Log
import androidx.test.espresso.IdlingResourceTimeoutException
import androidx.test.espresso.NoMatchingViewException
import androidx.test.filters.LargeTest
import androidx.test.uiautomator.UiObjectNotFoundException
import junit.framework.AssertionFailedError
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized
import org.mozilla.fenix.helpers.FenixTestRule
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.RetryTestRule
import org.mozilla.fenix.helpers.RetryableComposeTestRule
import org.mozilla.fenix.helpers.ThrowableCase
import java.util.concurrent.atomic.AtomicInteger
import androidx.compose.ui.test.junit4.v2.AndroidComposeTestRule as AndroidComposeTestRuleV2

@RunWith(Parameterized::class)
@LargeTest
class RetryRuleRetryableExceptionsTest(
    private val case: ThrowableCase,
) {
    @get:Rule(order = 0)
    val fenixTestRule: FenixTestRule = FenixTestRule()

    @get:Rule(order = 1)
    val retryTestRule = RetryTestRule(3)

    @get:Rule(order = 2)
    val retryableComposeTestRule = RetryableComposeTestRule {
        AndroidComposeTestRuleV2(
            HomeActivityIntentTestRule(),
        ) { it.activity }
    }

    private val attempts = AtomicInteger(0)
    private val seenInnerRules = mutableSetOf<Int>()

companion object {
    @JvmStatic
    @Parameterized.Parameters(name = "{index}: {0}")
    fun data(): Collection<Array<Any>> = listOf(
        arrayOf(
            ThrowableCase(
                "AssertionError",
            ) {
                AssertionError("Retryable AssertionError")
            },
        ),
        arrayOf(
            ThrowableCase(
                "AssertionFailedError",
            ) {
                AssertionFailedError("Retryable AssertionFailedError")
            },
        ),
        arrayOf(
            ThrowableCase(
                "UiObjectNotFoundException",
            ) {
                UiObjectNotFoundException("Retryable UiObjectNotFoundException")
            },
        ),
        arrayOf(
            ThrowableCase(
                "NoMatchingViewException",
            ) {
                NoMatchingViewException.Builder()
                    .withCause(Throwable("Retryable NoMatchingViewException"))
                    .build()
            },
        ),
        arrayOf(
            ThrowableCase(
                "IdlingResourceTimeoutException",
            ) {
                IdlingResourceTimeoutException(
                    listOf("Retryable IdlingResourceTimeoutException"),
                )
            },
        ),
        arrayOf(
            ThrowableCase(
                "RuntimeException",
            ) {
                RuntimeException("Retryable RuntimeException")
            },
        ),
        arrayOf(
            ThrowableCase(
                "NullPointerException",
            ) {
                NullPointerException("Retryable NullPointerException")
            },
        ),
    )
}

    @Test
    fun testRetryableExceptionsAreRetried() {
        Log.i("RetryTest", "Running test with ${case.name}")
        seenInnerRules.add(System.identityHashCode(retryableComposeTestRule.current))
        val attemptNum = attempts.incrementAndGet()
        // Each retry must see a freshly-constructed inner rule (the wrapper's headline
        // contract). If the wrapper stopped recreating it per attempt, this set would
        // stay size 1 while attemptNum grew.
        assertEquals(attemptNum, seenInnerRules.size)
        if (attemptNum < 2) {
            throw case.supplier.invoke()
        }
        assertTrue("Test retried and passed on attempt=$attemptNum", true)
    }
}
