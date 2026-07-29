/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.trackingprotection

import android.content.Context
import androidx.fragment.app.Fragment
import androidx.navigation.NavController
import androidx.navigation.NavDirections
import io.mockk.MockKAnnotations
import io.mockk.coVerify
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createTab
import mozilla.components.concept.engine.cookiehandling.CookieBannersStorage
import mozilla.components.concept.engine.permission.SitePermissions
import mozilla.components.feature.session.TrackingProtectionUseCases
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mozilla.fenix.R
import org.mozilla.fenix.components.Components
import org.mozilla.fenix.ext.components

class TrackingProtectionPanelInteractorTest {

    private lateinit var components: Components

    @RelaxedMockK
    private lateinit var navController: NavController

    @RelaxedMockK
    private lateinit var fragment: Fragment

    @RelaxedMockK
    private lateinit var sitePermissions: SitePermissions

    @RelaxedMockK
    private lateinit var store: ProtectionsStore

    @RelaxedMockK
    private lateinit var cookieBannersStorage: CookieBannersStorage
    private lateinit var interactor: TrackingProtectionPanelInteractor

    private lateinit var tab: TabSessionState
    private var learnMoreClicked = false
    private var openSettings = false
    private var gravity = 54

    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        MockKAnnotations.init(this)
        learnMoreClicked = false

        components = mockk()
        tab = createTab("https://mozilla.org", id = "testID")

        interactor = TrackingProtectionPanelInteractor(
            components = components,
            fragment = fragment,
            store = store,
            scope = mockk(),
            cookieBannersStorage = cookieBannersStorage,
            navController = { navController },
            openTrackingProtectionSettings = { openSettings = true },
            openLearnMoreLink = { learnMoreClicked = true },
            sitePermissions = sitePermissions,
            gravity = gravity,
            getCurrentTab = { tab },
        )

        val trackingProtectionUseCases: TrackingProtectionUseCases = mockk(relaxed = true)

        every { fragment.context?.components } returns components
        every { components.useCases.trackingProtectionUseCases } returns trackingProtectionUseCases
        every { components.appStore.state.isPrivateScreenLocked } returns true
    }

    @Test
    fun `WHEN openDetails is called THEN store should dispatch EnterDetailsMode action with the right category`() {
        interactor.openDetails(TrackingProtectionCategory.FINGERPRINTERS, true)

        verify {
            store.dispatch(
                ProtectionsAction.EnterDetailsMode(
                    TrackingProtectionCategory.FINGERPRINTERS,
                    true,
                ),
            )
        }

        interactor.openDetails(TrackingProtectionCategory.CRYPTOMINERS, true)

        verify {
            store.dispatch(
                ProtectionsAction.EnterDetailsMode(
                    TrackingProtectionCategory.CRYPTOMINERS,
                    true,
                ),
            )
        }
    }

    @Test
    fun `WHEN selectTrackingProtectionSettings is called THEN openTrackingProtectionSettings should be invoked`() {
        interactor.selectTrackingProtectionSettings()

        assertEquals(true, openSettings)
    }

    @Test
    fun `WHEN on the learn more link is clicked THEN onLearnMoreClicked should be invoked`() {
        interactor.onLearnMoreClicked()

        assertEquals(true, learnMoreClicked)
    }

    @Test
    fun `WHEN onBackPressed is called THEN call popBackStack and navigate`() = runTest(testDispatcher) {
        every { components.settings.shouldUseCookieBannerPrivateMode } returns false
        val directionsSlot = slot<NavDirections>()
        every { components.publicSuffixList } returns mockk()

        val interactor = TrackingProtectionPanelInteractor(
            components = components,
            fragment = fragment,
            store = store,
            scope = this,
            cookieBannersStorage = cookieBannersStorage,
            navController = { navController },
            openTrackingProtectionSettings = { openSettings = true },
            openLearnMoreLink = { learnMoreClicked = true },
            sitePermissions = sitePermissions,
            gravity = gravity,
            getCurrentTab = { tab },
            mainDispatcher = testDispatcher,
            ioDispatcher = testDispatcher,
        )

        interactor.handleNavigationAfterCheck(tab, true)
        testDispatcher.scheduler.advanceUntilIdle()

        coVerify {
            navController.popBackStack()

            navController.navigate(capture(directionsSlot))
        }

        val capturedDirections = directionsSlot.captured

        assertTrue(directionsSlot.isCaptured)
        assertEquals(
            R.id.action_global_quickSettingsSheetDialogFragment,
            capturedDirections.actionId,
        )
    }

    @Test
    fun `WHEN onExitDetailMode is called THEN store should dispatch ExitDetailsMode action`() {
        interactor.onExitDetailMode()

        verify { store.dispatch(ProtectionsAction.ExitDetailsMode) }
    }
}
