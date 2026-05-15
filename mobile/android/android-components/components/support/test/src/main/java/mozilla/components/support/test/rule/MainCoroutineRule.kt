/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.test.rule

import android.annotation.SuppressLint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.rules.TestWatcher
import org.junit.runner.Description

/**
 * JUnit Test Rule that sets `Dispatchers.Main` to a [TestDispatcher] for testing coroutines.
 *
 * This rule is essential for tests involving `kotlinx.coroutines` that utilize `Dispatchers.Main`
 * (e.g., in `ViewModel.viewModelScope`, `LifecycleOwner.lifecycleScope`). It allows for
 * deterministic execution of these coroutines, control over their timing, and the ability
 * to advance virtual time for delays.
 *
 * **When to Use `MainCoroutineRule`:**
 * - When your code under test launches coroutines on `Dispatchers.Main`.
 * - When you need to test the logic *within* these coroutines.
 * - When you require control over the execution order of main thread coroutines or need to manage
 *   virtual time (e.g., using `StandardTestDispatcher` and `TestCoroutineScheduler.advanceUntilIdle()`).
 *
 * **Example Usage:**
 *
```kotlin
 * @get:Rule
 * val mainCoroutineRule = MainCoroutineRule() // Uses UnconfinedTestDispatcher by default
 *
 * @Test
 * fun myViewModelTest() = runTest(mainCoroutineRule.testDispatcher) {
 * // Or simply runTest {} if using StandardTestDispatcher with new runTest
 *     // viewModel.launchSomethingOnMain()
 *     // advanceUntilIdle() // If using StandardTestDispatcher and not UnconfinedTestDispatcher
 *     // Assert results
 * }
 *```
 *
 * **Note on [MainLooperTestRule]:**
 * For tests, particularly in Robolectric, that need to manage tasks posted directly to the
 * Android `Looper.getMainLooper()` via `Handler.post()` (rather than `Dispatchers.Main` coroutines),
 * consider using `MainLooperTestRule`. See `MainLooperTestRule` documentation for more details
 * on when it's appropriate.
 *
 * @param testDispatcher The [TestDispatcher] to use.
 * Defaults to [UnconfinedTestDispatcher] which will eagerly enter `launch` or `async` blocks.
 * For more control over the execution order,you can provide a [StandardTestDispatcher].
 */
@OptIn(ExperimentalCoroutinesApi::class) // resetMain, setMain, UnconfinedTestDispatcher
@SuppressLint("NoDispatchersSetMainInTests")
class MainCoroutineRule(val testDispatcher: TestDispatcher = UnconfinedTestDispatcher()) : TestWatcher() {
    /**
     * Get a [TestScope] that integrates with `runTest` and can be passed as an argument
     * to the code under test when a [CoroutineScope] is required.
     *
     * This will rely on [testDispatcher] for controlling entering `launch` or `async` blocks.
     */
    val scope by lazy { TestScope(testDispatcher) }

    override fun starting(description: Description) {
        Dispatchers.setMain(testDispatcher)
        super.starting(description)
    }

    override fun finished(description: Description) {
        Dispatchers.resetMain()
        super.finished(description)
    }
}
