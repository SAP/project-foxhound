/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.navigation

import android.os.Bundle
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChangedBy
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import mozilla.components.support.base.feature.LifecycleAwareFeature
import org.mozilla.focus.settings.permissions.permissionoptions.SitePermission
import org.mozilla.focus.state.AppState
import org.mozilla.focus.state.Screen

/**
 * The [Navigator] observes changes to the [AppState] and triggers navigation
 * actions based on the current [Screen].
 *
 * It subscribes to a flow of [AppState], and whenever the [Screen] changes,
 * it calls the appropriate method on the provided [AppNavigation] implementation
 * to navigate the user to the new screen.
 *
 * @param stateFlow A [Flow] that emits the current [AppState].
 * @param navigation An implementation of [AppNavigation] that handles the actual screen transitions.
 * @param scope The [CoroutineScope] in which the state observation will run.
 */
class Navigator(
    private val stateFlow: Flow<AppState>,
    private val navigation: AppNavigation,
    private val scope: CoroutineScope,
) : LifecycleAwareFeature {
    private var navigationJob: Job? = null

    override fun start() {
        if (navigationJob?.isActive == true) return

        navigationJob = stateFlow.map { state -> state.screen }
            .distinctUntilChangedBy { screen -> screen.id }
            .onEach { screen -> navigateTo(screen) }
            .launchIn(scope)
    }

    override fun stop() {
        navigationJob?.cancel()
        navigationJob = null
    }

    private fun navigateTo(screen: Screen) {
        when (screen) {
            is Screen.Home -> navigation.navigateToHome()
            is Screen.Browser -> navigation.navigateToBrowser(screen.tabId)
            is Screen.EditUrl -> navigation.navigateToEditUrl(
                screen.tabId,
            )
            is Screen.FirstRun -> navigation.navigateToFirstRun()
            is Screen.Locked -> navigation.navigateToLockScreen(screen.bundle)
            is Screen.Settings -> navigation.navigateToSettings(screen.page)
            is Screen.SitePermissionOptionsScreen -> navigation.navigateToSitePermissionOptions(screen.sitePermission)
            is Screen.OnboardingSecondScreen -> navigation.navigateToOnboardingSecondScreen()
            is Screen.CrashListScreen -> navigation.showCrashList()
        }
    }
}

/**
 * Defines the navigation actions available within the application.
 * Each method corresponds to a specific screen or navigation flow.
 */
interface AppNavigation {
    /**
     * Navigates to the home screen.
     */
    fun navigateToHome()

    /**
     * Navigates to the browser screen with the specified tab ID.
     *
     * @param tabId The ID of the tab to navigate to.
     */
    fun navigateToBrowser(tabId: String)

    /**
     * Navigates to the edit URL screen for the given tab.
     *
     * @param tabId The ID of the tab to navigate to the edit URL screen for.
     */
    fun navigateToEditUrl(tabId: String)

    /**
     * Navigates to the first run screen.
     */
    fun navigateToFirstRun()

    /**
     * Navigates to the settings screen.
     *
     * @param page The specific settings page to navigate to.
     */
    fun navigateToSettings(page: Screen.Settings.Page)

    /**
     * Navigates to the site permission options screen.
     *
     * @param sitePermission The [SitePermission] for which the options are to be displayed.
     */
    fun navigateToSitePermissionOptions(sitePermission: SitePermission)

    /**
     * Navigates to the second screen of the onboarding flow.
     */
    fun navigateToOnboardingSecondScreen()

    /**
     * Shows lock screen.
     *
     * @param bundle Optional bundle of data to pass to the lock screen.
     */
    fun navigateToLockScreen(bundle: Bundle? = null)

    /**
     * Navigates to the crash list screen.
     */
    fun showCrashList()
}
