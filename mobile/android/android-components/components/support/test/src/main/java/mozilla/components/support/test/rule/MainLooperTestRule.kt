/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.test.rule

import android.annotation.SuppressLint
import android.os.Handler
import android.os.Looper
import android.os.Looper.getMainLooper
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.android.asCoroutineDispatcher
import kotlinx.coroutines.test.TestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.rules.TestWatcher
import org.junit.runner.Description
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowLooper

/**
 * A JUnit Test Rule for managing the main Android [Looper] in Robolectric unit tests.
 *
 * This rule is particularly useful for tests where code under test (or components it interacts with)
 * posts [Runnable]'s directly to `Looper.getMainLooper()` using `Handler.post()`,
 * `View.post()`, `Activity.runOnUiThread()`, etc. That means tests for components that interact with the
 * Store, since the store's `DefaultStoreDispatcher` uses `Handler(Looper.getMainLooper()).post(...)`
 *
 * It provides a way to ensure these tasks are executed deterministically, often by using the [idle]
 * method, which leverages Robolectric's `ShadowLooper.idle()`.
 *
 * **When to Use `MainLooperTestRule`:**
 * - In **Robolectric unit tests**.
 * - When testing code that posts `Runnable`s or `Message`s to `Looper.getMainLooper()`.
 * - When you need to ensure all tasks currently queued on the main `Looper` are executed
 *   before making assertions (e.g., after dispatching an action to a Store that notifies
 *   observers via `Handler.post()`).
 * - ** Example (like `DefaultStoreDispatcher`):**
 *   If a component, such as a `Store` using `DefaultStoreDispatcher`, handles internal operations
 *   (like processing actions) and then needs to propagate results or errors back to the main
 *   thread, it might do so via `Handler(Looper.getMainLooper()).post(...)`.
 *   The `DefaultStoreDispatcher`'s [CoroutineExceptionHandler], for instance, explicitly uses
 *   `Handler(Looper.getMainLooper()).postAtFrontOfQueue { throw StoreException(...) }`.
 *   To test this exception scenario correctly (i.e., to ensure the [Runnable] posting the
 *   exception executes so your test can catch it), you **must** use [MainLooperTestRule]
 *   (or equivalent [ShadowLooper] control) to flush this posted [Runnable].
 *   [MainCoroutineRule] alone would not typically execute this [Handler]-posted task.
 *
 * **When to use [MainLooperTestRule] vs. [MainCoroutineRule]:**
 * - **[MainLooperTestRule] Focuses on direct `Looper.getMainLooper()` interactions,
 *   typically via `Handler.post()`. Essential in Robolectric for ensuring these non-coroutine
 *   tasks on the main thread queue are executed. Use its `idle()` method to wait for the
 *   main looper to process pending tasks.
 * - **[MainCoroutineRule]:** Focuses on managing `kotlinx.coroutines` dispatched to `Dispatchers.Main`.
 *   It replaces `Dispatchers.Main` with a `TestDispatcher` to control coroutine execution.
 *   If your main thread interactions are *exclusively* via `Dispatchers.Main` coroutines,
 *   [MainCoroutineRule] is usually sufficient.
 *
 * **Why Not Just Use [MainCoroutineRule] for Everything?**
 *   `MainCoroutineRule` controls the [CoroutineDispatcher]. While its [TestDispatcher] can be configured
 *   to use Robolectric's main [Looper], relying on it to also execute all raw [Handler] posts
 *   is less direct. [MainLooperTestRule] provides explicit control for these [Looper]-queued tasks,
 *   which is clearer and more reliable for such scenarios.
 *   For example, if a Store notifies observers via `Handler(Looper.getMainLooper()).post { ... }`,
 *   `mainLooperRule.idle()` directly ensures these notifications run. This is often more straightforward
 *   than configuring and solely relying on [MainCoroutineRule]'s `testScheduler.advanceUntilIdle()`
 *   for such [Handler]-specific tasks.
 *
 * **Can I use both?**
 *   Yes, if your code has a mix of `Dispatchers.Main` coroutines and direct `Handler.post()` calls
 *   to `Looper.getMainLooper()`. `MainCoroutineRule` would manage the coroutines, and
 *   [MainLooperTestRule] would manage the direct Looper posts.
 *
 * **When NOT to use these rules:**
 * - For pure JVM/Kotlin unit tests not involving Android [Looper] or coroutines.
 * - Generally not needed in Espresso instrumented tests, as Espresso has its own UI thread synchronization.
 *
 * This rule also sets [Dispatchers.Main] to a dispatcher that posts to the Robolectric main looper.
 * This ensures that if any coroutines are launched on [Dispatchers.Main] during the test, they are
 * also processed when the main looper is idled. For more advanced coroutine control (like virtual
 * time or a specific [TestDispatcher]), consider using [MainCoroutineRule] alongside or instead of this rule
 * if your primary concern is coroutine testing rather than direct Looper interactions.
 */
@OptIn(ExperimentalCoroutinesApi::class) // resetMain, setMain
@SuppressLint("NoDispatchersSetMainInTests")
class MainLooperTestRule : TestWatcher() {

    private val mainLooper = getMainLooper()

    /**
     * A coroutine dispatcher that posts to the main looper.
     *
     * This dispatcher is used to set the main dispatcher to the Robolectric main looper dispatcher
     * before each test.
     */
    private val mainLooperDispatcher =
        Handler(mainLooper).asCoroutineDispatcher("MainLooperCoroutineDispatcher")

    override fun starting(description: Description) {
        super.starting(description)
        Dispatchers.setMain(mainLooperDispatcher)
    }

    override fun finished(description: Description) {
        super.finished(description)
        Dispatchers.resetMain()
    }

    /**
     * Waits for the main looper to become idle by executing all pending tasks in its queue.
     *
     * This method is useful for tests that need to wait for asynchronous operations (posted via
     * `Handler.post()` or similar direct Looper interactions) to complete before asserting results.
     * It relies on Robolectric's `ShadowLooper.idle()`.
     */
    fun idle() {
        shadowOf(mainLooper).idle()
    }
}
