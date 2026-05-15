/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.perf

import android.os.Looper
import android.os.StrictMode
import androidx.fragment.app.FragmentManager
import io.mockk.MockKAnnotations
import io.mockk.confirmVerified
import io.mockk.impl.annotations.MockK
import io.mockk.mockk
import io.mockk.slot
import io.mockk.spyk
import io.mockk.verify
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.components.Components
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class StrictModeManagerTest {

    private lateinit var debugManager: StrictModeManager
    private lateinit var releaseManager: StrictModeManager

    @MockK(relaxUnitFun = true)
    private lateinit var fragmentManager: FragmentManager

    @MockK(relaxed = true)
    private lateinit var components: Components

    @Before
    fun setup() {
        MockKAnnotations.init(this)

        debugManager = spyk(
            StrictModeManager(true, components, mockk()),
        )

        releaseManager = spyk(
            StrictModeManager(false, components, mockk()),
        )
    }

    @Test
    fun `GIVEN we're off-main-thread WHEN we enable strict mode THEN throw`() {
        runBlocking(Dispatchers.Default) {
            assertEquals(false, Looper.getMainLooper().isCurrentThread)
            assertThrows(IllegalStateException::class.java) {
                debugManager.enableStrictMode(false)
            }
        }
    }

    @Test
    fun `GIVEN we're in a release build WHEN we enable strict mode THEN we don't set policies`() {
        releaseManager.enableStrictMode(false)
        verify(exactly = 0) { releaseManager.applyThreadPolicy(any()) }
        verify(exactly = 0) { releaseManager.applyVmPolicy(any()) }
    }

    @Test
    fun `GIVEN we're in a debug build WHEN we enable strict mode THEN we set policies`() {
        debugManager.enableStrictMode(false)
        verify { debugManager.applyThreadPolicy(any()) }
        verify { debugManager.applyVmPolicy(any()) }
    }

    @Test
    fun `GIVEN we're in a debug build WHEN we attach a listener THEN we attach to the fragment lifecycle and detach when onFragmentResumed is called`() {
        val callbacks = slot<FragmentManager.FragmentLifecycleCallbacks>()

        debugManager.attachListenerToDisablePenaltyDeath(fragmentManager)
        verify { fragmentManager.registerFragmentLifecycleCallbacks(capture(callbacks), false) }
        confirmVerified(fragmentManager)

        callbacks.captured.onFragmentResumed(fragmentManager, mockk())
        verify { fragmentManager.unregisterFragmentLifecycleCallbacks(callbacks.captured) }
    }

    @Test
    fun `GIVEN we're in a release build WHEN allowViolation is called THEN we return the value from the function block`() {
        val expected = "Hello world"
        val actual = releaseManager.allowViolation(StrictMode::allowThreadDiskReads) { expected }
        assertEquals(expected, actual)
    }

    @Test
    fun `GIVEN we're in a debug build WHEN allowViolation is called THEN we return the value from the function block`() {
        val expected = "Hello world"
        val actual = debugManager.allowViolation(StrictMode::allowThreadDiskReads) { expected }
        assertEquals(expected, actual)
    }

    @Test
    fun `GIVEN we're in a release build WHEN allowViolation is called THEN the old policy is not set`() {
        releaseManager.allowViolation(StrictMode::allowThreadDiskReads) { }
        verify(exactly = 0) { releaseManager.applyThreadPolicy(any()) }
    }

    @Test
    fun `GIVEN we're in a debug build WHEN allowViolation is called THEN the old policy is set`() {
        val expectedPolicy = StrictMode.allowThreadDiskReads()
        debugManager.allowViolation({ expectedPolicy }) { }
        verify { debugManager.applyThreadPolicy(expectedPolicy) }
    }

    @Test
    fun `GIVEN we're in a debug build WHEN allowViolation is called and an exception is thrown from the function THEN the old policy is set`() {
        val expectedPolicy = StrictMode.allowThreadDiskReads()
        assertThrows(IllegalStateException::class.java) {
            debugManager.allowViolation({ expectedPolicy }) {
                throw IllegalStateException()
            }
        }
        verify { debugManager.applyThreadPolicy(expectedPolicy) }
    }

    @Test
    fun `GIVEN we're in a debug build WHEN allowViolation is called THEN the allowFn should run`() {
        var runs = 0
        val allowFn = { runs += 1; StrictMode.allowThreadDiskReads() }
        debugManager.allowViolation(allowFn) {}
        assertEquals(1, runs)
    }

    @Test
    fun `GIVEN we're in a release build WHEN allowViolation is called THEN the allowFn should not run`() {
        var runs = 0
        val allowFn = { runs += 1; StrictMode.allowThreadDiskReads() }
        releaseManager.allowViolation(allowFn) {}
        assertEquals(0, runs)
    }

    @Test
    fun `GIVEN we're in debug mode WHEN we suppress StrictMode THEN the suppressed count increases`() {
        assertEquals(0, debugManager.suppressionCount.get())
        debugManager.allowViolation(StrictMode::allowThreadDiskReads) { }
        assertEquals(1, debugManager.suppressionCount.get())
    }
}
