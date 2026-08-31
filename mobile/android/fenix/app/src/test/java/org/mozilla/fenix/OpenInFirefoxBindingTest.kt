/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix

import android.content.Intent
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import junit.framework.TestCase.assertFalse
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.feature.session.SessionFeature
import mozilla.components.feature.tabs.CustomTabsUseCases
import mozilla.components.support.base.feature.ViewBoundFeatureWrapper
import org.junit.Before
import org.junit.Test
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction

class OpenInFirefoxBindingTest {

    private val testDispatcher = StandardTestDispatcher()

    private lateinit var activity: HomeActivity
    private lateinit var customTabsUseCases: CustomTabsUseCases
    private lateinit var openInFenixIntent: Intent
    private lateinit var sessionFeature: ViewBoundFeatureWrapper<SessionFeature>

    @Before
    fun setUp() {
        activity = mockk(relaxUnitFun = true)
        customTabsUseCases = mockk()
        openInFenixIntent = mockk(relaxed = true)
        sessionFeature = mockk()
    }

    @Test
    fun `WHEN open in Firefox is requested THEN open in Firefox`() = runTest(testDispatcher) {
        val appStore = AppStore()

        val binding = OpenInFirefoxBinding(
            activity = activity,
            appStore = appStore,
            customTabSessionId = "",
            customTabsUseCases = customTabsUseCases,
            openInFenixIntent = openInFenixIntent,
            sessionFeature = sessionFeature,
            mainDispatcher = testDispatcher,
        )

        val getSessionFeature: SessionFeature = mockk(relaxUnitFun = true)
        every { sessionFeature.get() } returns getSessionFeature

        val migrateCustomTabsUseCases: CustomTabsUseCases.MigrateCustomTabUseCase = mockk(relaxed = true)
        every { customTabsUseCases.migrate } returns migrateCustomTabsUseCases

        binding.start()

        appStore.dispatch(AppAction.OpenInFirefoxStarted)

        testDispatcher.scheduler.advanceUntilIdle()

        verify { getSessionFeature.release() }
        verify { migrateCustomTabsUseCases.invoke("", select = true) }
        verify { activity.startActivity(openInFenixIntent) }
        verify {
            openInFenixIntent.apply {
                flags = flags or Intent.FLAG_ACTIVITY_NEW_TASK
            }
        }
        verify { activity.finishAndRemoveTask() }

        assertFalse(appStore.state.openInFirefoxRequested)
    }
}
