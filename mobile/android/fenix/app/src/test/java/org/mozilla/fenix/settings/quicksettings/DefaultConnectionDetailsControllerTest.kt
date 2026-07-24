/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.quicksettings

import android.content.Context
import androidx.fragment.app.Fragment
import androidx.navigation.NavController
import androidx.navigation.NavDirections
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.state.createTab
import mozilla.components.feature.session.TrackingProtectionUseCases
import mozilla.components.support.test.any
import org.junit.Test
import org.mozilla.fenix.ext.components
import kotlin.coroutines.ContinuationInterceptor

class DefaultConnectionDetailsControllerTest {
    private var gravity = 54

    @Test
    fun `WHEN handleBackPressed is called THEN should call popBackStack and navigate`() = runTest {
        val trackingProtectionUseCases: TrackingProtectionUseCases = mockk(relaxed = true)
        val context: Context = mockk {
            every { components.useCases.trackingProtectionUseCases } returns trackingProtectionUseCases
            every { components.settings.shouldUseCookieBannerPrivateMode } returns false
            every { components.publicSuffixList } returns mockk()
        }

        val fragment = mockk<Fragment>()
        every { fragment.context } returns context

        val tab = createTab("https://mozilla.org")
        val navController: NavController = mockk(relaxed = true)
        val controller = DefaultConnectionDetailsController(
            fragment = fragment,
            context = context,
            scope = this,
            cookieBannersStorage = mockk(),
            navController = { navController },
            sitePermissions = mockk(),
            gravity = gravity,
            ioDispatcher = coroutineContext[ContinuationInterceptor] as CoroutineDispatcher,
            getCurrentTab = { tab },
        )

        val onComplete = slot<(Boolean) -> Unit>()
        every {
            trackingProtectionUseCases.containsException.invoke(
                any(),
                capture(onComplete),
            )
        }.answers { onComplete.captured.invoke(true) }

        controller.handleBackPressed()
        testScheduler.advanceUntilIdle()

        navController.popBackStack()

        navController.navigate(any<NavDirections>())
    }
}
