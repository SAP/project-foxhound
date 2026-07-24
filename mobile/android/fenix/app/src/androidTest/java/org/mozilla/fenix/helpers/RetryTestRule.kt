/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.helpers

import android.util.Log
import androidx.test.espresso.IdlingResourceTimeoutException
import androidx.test.espresso.NoMatchingViewException
import androidx.test.uiautomator.UiObjectNotFoundException
import junit.framework.AssertionFailedError
import leakcanary.NoLeakAssertionFailedError
import org.junit.rules.TestRule
import org.junit.runner.Description
import org.junit.runners.model.Statement
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.helpers.IdlingResourceHelper.unregisterAllIdlingResources
import org.mozilla.fenix.helpers.TestHelper.appContext
import org.mozilla.fenix.helpers.TestHelper.exitMenu

/**
 *  Rule to retry flaky tests for a given number of times, catching some of the more common exceptions.
 *  The Rule doesn't clear the app state in between retries, so we are doing some cleanup here.
 *  The @Before and @After methods are not called between retries.
 *
 */
class RetryTestRule(private val retryCount: Int = 5) : TestRule {

    override fun apply(base: Statement, description: Description): Statement {
        return statement {
            repeat(retryCount) { attempt ->
                try {
                    Log.i(TAG, "RetryTestRule: Started try #${attempt + 1}.")
                    base.evaluate()
                    return@statement // success, exit early
                } catch (t: NoLeakAssertionFailedError) {
                    Log.i(TAG, "RetryTestRule: NoLeakAssertionFailedError caught, not retrying")
                    cleanup(true)
                    throw t
                } catch (t: Throwable) {
                    if (t.isRetryable()) {
                        Log.i(TAG, "RetryTestRule: ${t::class.simpleName} caught, retrying the UI test")
                        cleanup()
                        if (attempt == retryCount - 1) {
                            Log.i(TAG, "RetryTestRule: Max number of retries reached.")
                            throw t
                        }
                    } else {
                        throw t
                    }
                }
            }
        }
    }

    private fun cleanup(removeTabs: Boolean = false) {
        unregisterAllIdlingResources()
        if (removeTabs) {
            appContext.components.useCases.tabsUseCases.removeAllTabs()
        }
        exitMenu()
    }

    private fun Throwable.isRetryable(): Boolean = when (this) {
        is AssertionError,
        is AssertionFailedError,
        is UiObjectNotFoundException,
        is NoMatchingViewException,
        is IdlingResourceTimeoutException,
        is RuntimeException,
        is NullPointerException,
        -> true
        else -> false
    }

    companion object {
        private const val TAG = "RetryTestRule"
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
