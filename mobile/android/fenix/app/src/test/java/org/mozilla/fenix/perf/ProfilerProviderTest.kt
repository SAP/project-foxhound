/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.perf

import android.content.pm.ProviderInfo
import android.net.Uri
import android.os.Looper
import android.os.ParcelFileDescriptor
import androidx.test.core.app.ApplicationProvider
import io.mockk.MockKAnnotations
import io.mockk.every
import io.mockk.impl.annotations.MockK
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.unmockkAll
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.engine.gecko.profiler.Profiler
import mozilla.components.concept.engine.Engine
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.components.Core
import org.mozilla.fenix.helpers.FenixRobolectricTestApplication
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowBinder

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(application = FenixRobolectricTestApplication::class)
@org.robolectric.annotation.LooperMode(org.robolectric.annotation.LooperMode.Mode.PAUSED)
class ProfilerProviderTest {

    private val testDispatcher = StandardTestDispatcher()

    private lateinit var app: FenixRobolectricTestApplication
    private lateinit var provider: ProfilerProvider

    @RelaxedMockK
    lateinit var mockCore: Core

    @RelaxedMockK
    lateinit var mockEngine: Engine

    @MockK
    lateinit var mockProfiler: Profiler

    @Before
    fun setup() {
        MockKAnnotations.init(this, relaxUnitFun = true)
        app = ApplicationProvider.getApplicationContext()

        // Simulate shell caller for provider access restriction.
        ShadowBinder.setCallingUid(android.os.Process.SHELL_UID)

        // Wire up application.components -> core -> engine -> profiler
        every { app.components.core } returns mockCore
        every { mockCore.engine } returns mockEngine
        every { mockEngine.profiler } returns mockProfiler

        provider = ProfilerProvider()
        provider.ioDispatcher = testDispatcher
        val info = ProviderInfo().apply {
            authority = app.packageName + ".profiler"
        }
        provider.attachInfo(app, info)
    }

    @After
    fun tearDown() {
        ShadowBinder.reset()
        unmockkAll()
    }

    @Test
    fun `WHEN profiler active THEN provider invokes stopProfiler on main and returns a pipe`() = runTest(testDispatcher) {
        every { mockProfiler.isProfilerActive() } returns true
        every { mockProfiler.stopProfiler(any(), any()) } answers {
            val onSuccess = firstArg<(ByteArray?) -> Unit>()
            onSuccess("dummy".toByteArray())
        }

        provider.saveProfileUrl = { _, _ -> "https://profiler.firefox.com/test-token" }

        val uri = Uri.parse("content://${app.packageName}.profiler/stop-and-upload")
        val pfd: ParcelFileDescriptor? = provider.openFile(uri, "r")
        assertTrue("Provider should return a pipe file descriptor", pfd != null)

        advanceUntilIdle()
        Shadows.shadowOf(Looper.getMainLooper()).idle()

        io.mockk.verify { mockProfiler.stopProfiler(any(), any()) }
    }

    @Test
    fun `WHEN profiler not active THEN provider throws IllegalStateException`() {
        every { mockProfiler.isProfilerActive() } returns false

        val uri = Uri.parse("content://${app.packageName}.profiler/stop-and-upload")
        val pfd: ParcelFileDescriptor? = provider.openFile(uri, "r")
        assertTrue("Provider should return a pipe file descriptor", pfd != null)

        val exception = assertThrows(IllegalStateException::class.java) {
            runTest(testDispatcher) {
                advanceUntilIdle()
            }
        }
        assertEquals("Profiler is not active", exception.message)

        io.mockk.verify(exactly = 0) { mockProfiler.stopProfiler(any(), any()) }
    }
}
