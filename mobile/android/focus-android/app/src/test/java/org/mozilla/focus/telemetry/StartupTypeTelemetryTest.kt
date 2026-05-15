/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.telemetry

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.support.ktx.kotlin.crossProduct
import mozilla.components.support.test.any
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import mozilla.telemetry.glean.testing.GleanTestRule
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.spy
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mozilla.focus.GleanMetrics.PerfStartup
import org.mozilla.focus.activity.MainActivity
import org.mozilla.focus.telemetry.startuptelemetry.StartupPathProvider
import org.mozilla.focus.telemetry.startuptelemetry.StartupPathProvider.StartupPath
import org.mozilla.focus.telemetry.startuptelemetry.StartupStateProvider
import org.mozilla.focus.telemetry.startuptelemetry.StartupStateProvider.StartupState
import org.mozilla.focus.telemetry.startuptelemetry.StartupTypeTelemetry
import org.mozilla.focus.telemetry.startuptelemetry.StartupTypeTelemetry.StartupTypeLifecycleObserver
import org.robolectric.RobolectricTestRunner

private val validTelemetryLabels = run {
    val allStates = listOf("cold", "warm", "hot", "unknown")
    val allPaths = listOf("main", "view", "unknown")

    allStates.crossProduct(allPaths) { state, path -> "${state}_$path" }.toSet()
}

private val activityClass = MainActivity::class.java

@RunWith(RobolectricTestRunner::class)
class StartupTypeTelemetryTest {

    private lateinit var telemetry: StartupTypeTelemetry
    private lateinit var callbacks: StartupTypeLifecycleObserver
    private var stateProvider: StartupStateProvider = mock()
    private var pathProvider: StartupPathProvider = mock()
    private var lifecycleOwner: LifecycleOwner = mock()

    @get:Rule
    val gleanTestRule = GleanTestRule(testContext)

    @Before
    fun setUp() {
        telemetry = spy(StartupTypeTelemetry(stateProvider, pathProvider))
        callbacks = telemetry.getTestCallbacks()
    }

    @Test
    fun `WHEN attach is called THEN it is registered to the lifecycle`() = runTest {
        doReturn(this).`when`(telemetry).getScope(any())

        val lifecycle = mock<Lifecycle>()

        telemetry.attachOnMainActivityOnCreate(lifecycle)

        verify(lifecycle).addObserver(any())
    }

    @Test
    fun `GIVEN all possible path and state combinations WHEN record telemetry THEN the labels are incremented the appropriate number of times`() = runTest {
        doReturn(this).`when`(telemetry).getScope(any())

        val allPossibleInputArgs = StartupState.entries.crossProduct(
            StartupPath.entries,
        ) { state, path ->
            Pair(state, path)
        }

        allPossibleInputArgs.forEach { (state, path) ->
            doReturn(state).`when`(stateProvider).getStartupStateForStartedActivity(activityClass)
            doReturn(path).`when`(pathProvider).startupPathForActivity

            telemetry.recordStartupTelemetry(lifecycleOwner, StandardTestDispatcher(this.testScheduler))
            testScheduler.advanceUntilIdle()
        }

        validTelemetryLabels.forEach { label ->
            // Path == NOT_SET gets bucketed with Path == UNKNOWN so we'll increment twice for those.
            val expected = if (label.endsWith("unknown")) 2 else 1
            assertEquals("label: $label", expected, PerfStartup.startupType[label].testGetValue())
        }

        // All invalid labels go to a single bucket: let's verify it has no value.
        assertNull(PerfStartup.startupType["__other__"].testGetValue())
    }

    @Test
    fun `WHEN record is called THEN telemetry is recorded with the appropriate label`() = runTest {
        doReturn(this).`when`(telemetry).getScope(any())

        doReturn(StartupState.COLD).`when`(stateProvider).getStartupStateForStartedActivity(activityClass)
        doReturn(StartupPath.MAIN).`when`(pathProvider).startupPathForActivity

        telemetry.recordStartupTelemetry(lifecycleOwner, StandardTestDispatcher(this.testScheduler))
        testScheduler.advanceUntilIdle()

        assertEquals(1, PerfStartup.startupType["cold_main"].testGetValue())
    }

    @Test
    fun `GIVEN the activity is launched WHEN onResume is called THEN we record the telemetry`() = runTest {
        doReturn(this).`when`(telemetry).getScope(any())

        launchApp()
        this.testScheduler.advanceUntilIdle() // Ensure coroutine from onResume completes
        verify(telemetry).recordStartupTelemetry(any(), any())
    }

    @Test
    fun `GIVEN the activity is launched WHEN the activity is paused and resumed THEN record is not called`() = runTest {
        doReturn(this).`when`(telemetry).getScope(any())

        // This part of the test duplicates another test but it's needed to initialize the state of this test.
        launchApp()
        this.testScheduler.advanceUntilIdle() // Ensure coroutine from initial onResume completes
        verify(telemetry).recordStartupTelemetry(any(), any())

        callbacks.onPause(mock())
        callbacks.onResume(mock()) // This onResume will not record due to hasRecordedOnce flag
        this.testScheduler.advanceUntilIdle() // Ensure any potential coroutine from second onResume completes

        verify(telemetry).recordStartupTelemetry(any(), any()) // i.e. this shouldn't be called again.
    }

    @Test
    fun `GIVEN the activity is launched WHEN the activity is stopped and resumed THEN record is called again`() = runTest {
        doReturn(this).`when`(telemetry).getScope(any())

        // This part of the test duplicates another test but it's needed to initialize the state of this test.
        launchApp()
        this.testScheduler.advanceUntilIdle() // Ensure coroutine from initial onResume completes
        verify(telemetry).recordStartupTelemetry(any(), any())

        callbacks.onPause(mock())
        callbacks.onStop(mock()) // This resets hasRecordedOnce
        callbacks.onStart(mock())
        callbacks.onResume(mock()) // This onResume will record again
        this.testScheduler.advanceUntilIdle() // Ensure coroutine from second onResume completes

        verify(telemetry, times(2)).recordStartupTelemetry(any(), any())
    }

    private fun launchApp() {
        // What these return isn't important.
        doReturn(StartupState.COLD).`when`(stateProvider).getStartupStateForStartedActivity(activityClass)
        doReturn(StartupPath.MAIN).`when`(pathProvider).startupPathForActivity

        callbacks.onCreate(mock())
        callbacks.onStart(mock())
        callbacks.onResume(mock())
    }
}
