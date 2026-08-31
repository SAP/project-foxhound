/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.perf

import android.app.Activity
import android.app.Application
import androidx.test.core.app.ApplicationProvider
import io.mockk.clearMocks
import io.mockk.every
import io.mockk.mockk
import mozilla.components.concept.engine.EngineSession
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AppLinkIntentLaunchTypeProviderTest {

    private lateinit var app: Application
    private lateinit var startReasonProvider: AppStartReasonProvider
    private lateinit var provider: AppLinkIntentLaunchTypeProvider

    @Before
    fun setUp() {
        app = ApplicationProvider.getApplicationContext()
        startReasonProvider = mockk(relaxed = false)
        every { startReasonProvider.reason } returns AppStartReasonProvider.StartReason.TO_BE_DETERMINED
        provider = AppLinkIntentLaunchTypeProvider(startReasonProvider)
        provider.registerInAppOnCreate(app)
        provider.resetForTests()
    }

    @After
    fun tearDown() {
        clearMocks(startReasonProvider)
        provider.resetForTests()
    }

    @Test
    fun `classify as COLD when process is fresh and no activity created yet - as long as the start reason is not non-activity`() { // the default StartReason.TO_BE_DETERMINED is being used
        val type = provider.getExternalIntentLaunchType(TestActivity::class.java)
        assertEquals(EngineSession.LoadUrlFlags.APP_LINK_LAUNCH_TYPE_COLD, type)
    }

    @Test
    fun `classify as WARM when process had an activity before but none is currently alive`() {
        val controller = Robolectric.buildActivity(TestActivity::class.java)
        controller.create().start().resume()
        controller.pause().stop().destroy() // no live activities remain; but the app had launched at least one

        val type = provider.getExternalIntentLaunchType(TestActivity::class.java)

        // process is alive (not COLD), target not live (not HOT) -> WARM
        assertEquals(EngineSession.LoadUrlFlags.APP_LINK_LAUNCH_TYPE_WARM, type)
    }

    @Test
    fun `classify as HOT when target activity instance already exists`() {
        val controller = Robolectric.buildActivity(TestActivity::class.java)
        controller.create().start().resume()

        val type = provider.getExternalIntentLaunchType(TestActivity::class.java)
        assertEquals(EngineSession.LoadUrlFlags.APP_LINK_LAUNCH_TYPE_HOT, type)
    }

    @Test
    fun `classify as HOT when process started NON_ACTIVITY, user opened UI then backgrounded it, and target exists`() {
        // 1) Process starts headlessly (NON_ACTIVITY)
        every { startReasonProvider.reason } returns AppStartReasonProvider.StartReason.NON_ACTIVITY

        // 2) User opens the UI (target activity becomes live), then backgrounds it
        val controller = Robolectric.buildActivity(TestActivity::class.java)
        controller.create().start().resume()
        controller.pause().stop() // activity is still alive, i.e. not destroyed

        // 3) App-link intent arrives: target already exists → HOT
        val type = provider.getExternalIntentLaunchType(TestActivity::class.java)
        assertEquals(EngineSession.LoadUrlFlags.APP_LINK_LAUNCH_TYPE_HOT, type)
    }

    @Test
    fun `classify as WARM when process started headless and no activity exists yet`() {
        // Headless (e.g., WorkManager) start.
        every { startReasonProvider.reason } returns AppStartReasonProvider.StartReason.NON_ACTIVITY

        val type = provider.getExternalIntentLaunchType(TestActivity::class.java)
        assertEquals(EngineSession.LoadUrlFlags.APP_LINK_LAUNCH_TYPE_WARM, type)
    }

    @Test
    fun `classify as WARM when a different activity exists but target does not`() {
        val other = Robolectric.buildActivity(OtherActivity::class.java)
        other.create().start().resume()

        val type = provider.getExternalIntentLaunchType(TestActivity::class.java)
        assertEquals(EngineSession.LoadUrlFlags.APP_LINK_LAUNCH_TYPE_WARM, type)
    }

    private class TestActivity : Activity()
    private class OtherActivity : Activity()
}
