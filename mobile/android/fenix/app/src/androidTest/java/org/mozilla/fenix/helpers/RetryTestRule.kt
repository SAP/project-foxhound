/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.helpers

import android.util.Log
import androidx.compose.ui.test.ComposeTimeoutException
import androidx.test.espresso.IdlingResourceTimeoutException
import androidx.test.espresso.NoMatchingViewException
import androidx.test.uiautomator.UiObjectNotFoundException
import junit.framework.AssertionFailedError
import leakcanary.NoLeakAssertionFailedError
import org.junit.rules.TestRule
import org.junit.runner.Description
import org.junit.runners.model.Statement
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.helpers.Constants.TAG
import org.mozilla.fenix.helpers.TestHelper.appContext
import org.mozilla.fenix.helpers.TestHelper.exitMenu

/**
 *  Rule to retry flaky tests for a given number of times, catching some of the more common exceptions.
 *  The Rule doesn't clear the app state in between retries, so we are doing some cleanup here.
 *  The @Before and @After methods are not called between retries.
 *
 */
class RetryTestRule(private val retryCount: Int = 3) : TestRule {

    override fun apply(base: Statement, description: Description): Statement {
        return object : Statement() {
            override fun evaluate() {
                var lastThrowable: Throwable? = null

                for (attempt in 0 until retryCount) {
                    try {
                        Log.i(TAG, "RetryTestRule: Started try #${attempt + 1}/$retryCount for ${description.className}.${description.methodName}.")
                        base.evaluate()
                        Log.i(TAG, "RetryTestRule: Success on try ${attempt + 1}")
                        return
                    } catch (t: NoLeakAssertionFailedError) {
                        Log.i(TAG, "RetryTestRule: Memory leak detected, skipping retries.")
                        // We do NOT cleanup here because we want the heap dump to stay intact
                        throw t
                    } catch (t: Throwable) {
                        lastThrowable = t

                        if (t.isRetryable() && attempt < retryCount - 1) {
                            Log.i(TAG, "RetryTestRule: ${t::class.simpleName} caught.")
                            Log.i(TAG, "Cleaning up before next try.")
                            // Important: Perform cleanup BEFORE the next loop starts
                            cleanup(removeTabs = false)
                            Log.i(TAG, "RetryTestRule: Cleanup done.")

                            // Give the system a tiny breath between retries
                            Log.i(TAG, "RetryTestRule: Sleeping 500ms before retry.")
                            Thread.sleep(500)
                        } else {
                            Log.i(TAG, "RetryTestRule: Non-retryable error or max attempts reached.")
                            throw t
                        }
                    }
                }
                Log.i(TAG, "RetryTestRule: All retries exhausted. Throwing last error.")
                throw lastThrowable!!
            }
        }
    }

    private fun cleanup(removeTabs: Boolean = false) {
        // Only perform UI-level cleanup.
        // Don't unregister IdlingResources here;
        // let the ComposeRule handle its own lifecycle.
        try {
            exitMenu()
            if (removeTabs) {
                appContext.components.useCases.tabsUseCases.removeAllTabs()
            }
        } catch (e: Exception) {
            Log.e(TAG, "RetryTestRule: Cleanup failed", e)
        }
    }

    private fun Throwable.isRetryable(): Boolean = when (this) {
        is AssertionError,
        is AssertionFailedError,
        is UiObjectNotFoundException,
        is NoMatchingViewException,
        is IdlingResourceTimeoutException,
        is RuntimeException,
        is NullPointerException,
        is ComposeTimeoutException,
        is IllegalStateException,
             -> true // Added for Coroutine/Compose flakiness
        else -> false
    }
}

    private inline fun statement(crossinline eval: () -> Unit): Statement {
        return object : Statement() {
            override fun evaluate() = eval()
        }
    }

    /**
    * Represents a test case that supplies a Throwable to be thrown during a test.
    *
    * @property name A human-readable name for the test case.
    *                Used for display in test runner output and logs.
    * @property supplier A lambda that returns a new instance of the Throwable to throw.
    *                    It's evaluated during the test execution.
    */
    data class ThrowableCase(
        // The display name used in parameterized test output (e.g., "NullPointerException")
        val name: String,
        // Function that supplies the Throwable to throw when invoked
        val supplier: () -> Throwable,
        ) {
    /**
     * Overrides the default toString() so that the test runner displays the 'name'
     * instead of a default data class string or lambda object ID.
     */
    override fun toString(): String = name
    }
