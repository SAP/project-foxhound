/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.toolbar

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.concept.toolbar.AutocompleteDelegate
import mozilla.components.concept.toolbar.AutocompleteResult
import mozilla.components.support.test.mock
import mozilla.components.ui.autocomplete.AutocompleteView
import mozilla.components.ui.autocomplete.InlineAutocompleteEditText
import org.junit.Assert.assertEquals
import org.junit.Assert.fail
import org.junit.Test

class AsyncFilterListenerTest {
    private val testDispatcher = StandardTestDispatcher()

    @Test
    fun `filter listener triggers filter execution`() = runTest(testDispatcher) {
        val urlView: AutocompleteView = mock()
        var capturedText = ""
        val filter: suspend (String, AutocompleteDelegate) -> Unit = { text, _ ->
            capturedText = text
        }

        val listener = AsyncFilterListener(urlView, this, filter, testDispatcher)
        listener("test")
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals("test", capturedText)
        listener.close()
    }

    @Test
    fun `filter delegate passes results to autocomplete view`() = runTest(testDispatcher) {
        val filter: suspend (String, AutocompleteDelegate) -> Unit = { query, delegate ->
            delegate.applyAutocompleteResult(
                AutocompleteResult(
                    input = query,
                    text = "testing.com",
                    url = "http://www.testing.com",
                    source = "asyncTest",
                    totalItems = 1,
                ),
            )
        }

        var didCallApply = 0
        val view = object : AutocompleteView {
            override val originalText: String = "test"
            override fun applyAutocompleteResult(result: InlineAutocompleteEditText.AutocompleteResult) {
                didCallApply++
            }
            override fun noAutocompleteResult() = fail()
        }

        val listener = AsyncFilterListener(view, this, filter, testDispatcher)
        listener("test")
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(1, didCallApply)
        listener.close()
    }

    @Test
    fun `delegate discards stale results`() = runTest(testDispatcher) {
        val filter: suspend (String, AutocompleteDelegate) -> Unit = { _, delegate ->
            delegate.applyAutocompleteResult(
                AutocompleteResult(input = "test", text = "testing.com", url = "...", source = "test", totalItems = 1),
            )
        }

        val view = object : AutocompleteView {
            // View has already moved on to a new string
            override val originalText: String = "new text"
            override fun applyAutocompleteResult(result: InlineAutocompleteEditText.AutocompleteResult) {
                fail("Should have discarded stale result")
            }
            override fun noAutocompleteResult() = fail()
        }

        val listener = AsyncFilterListener(view, this, filter, testDispatcher)
        listener("test")
        testDispatcher.scheduler.advanceUntilIdle()
        listener.close()
    }

    @Test
    fun `delegate discards results if scope was cancelled`() = runTest(testDispatcher) {
        var preservedDelegate: AutocompleteDelegate? = null
        val filter: suspend (String, AutocompleteDelegate) -> Unit = { _, delegate ->
            preservedDelegate = delegate
        }

        val view: AutocompleteView = mock()
        val listener = AsyncFilterListener(view, this, filter, testDispatcher)

        // Trigger first filter
        listener("first")
        testDispatcher.scheduler.advanceUntilIdle()

        // Trigger second filter - this cancels the scope of the first one via collectLatest
        listener("second")
        testDispatcher.scheduler.advanceUntilIdle()

        // Try to use the first delegate (which should now have a cancelled scope)
        var called = false
        preservedDelegate?.applyAutocompleteResult(
            AutocompleteResult("first", "text", "url", "source", 1),
        ) { called = true }

        testDispatcher.scheduler.advanceUntilIdle()
        // The launch inside applyAutocompleteResult should not have executed on a cancelled scope
        assertEquals(false, called)
        listener.close()
    }

    @Test
    fun `delegate passes through non-stale lack of results`() = runTest(testDispatcher) {
        val filter: suspend (String, AutocompleteDelegate) -> Unit = { query, delegate ->
            delegate.noAutocompleteResult(query)
        }

        var calledNoResults = 0
        val view = object : AutocompleteView {
            override val originalText: String = "test"
            override fun applyAutocompleteResult(result: InlineAutocompleteEditText.AutocompleteResult) = fail()
            override fun noAutocompleteResult() {
                calledNoResults++
            }
        }

        val listener = AsyncFilterListener(view, this, filter, testDispatcher)
        listener("test")
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(1, calledNoResults)
        listener.close()
    }
}
