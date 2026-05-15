/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.trustpanel.middleware

import android.net.Uri
import android.util.Base64
import androidx.navigation.NavController
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mozilla.components.feature.tabs.TabsUseCases
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.R
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.ext.nav
import org.mozilla.fenix.ext.openToBrowser
import org.mozilla.fenix.settings.trustpanel.TrustPanelFragmentDirections
import org.mozilla.fenix.settings.trustpanel.store.TrustPanelAction
import org.mozilla.fenix.settings.trustpanel.store.TrustPanelState
import org.mozilla.fenix.settings.trustpanel.store.TrustPanelStore

/**
 * [Middleware] implementation for handling navigating events based on [TrustPanelAction]s that are
 * dispatched to the [TrustPanelStore].
 *
 * @param navController [NavController] used for navigation.
 * @param privacySecurityPrefKey Preference key used to scroll to the Privacy and security category within settings.
 * @param appStore [AppStore] used to access the current browsing mode.
 * @param tabsUseCases [TabsUseCases] used to add tabs.
 * @param scope [CoroutineScope] used to launch coroutines.
 */
class TrustPanelNavigationMiddleware(
    private val navController: NavController,
    private val privacySecurityPrefKey: String,
    private val appStore: AppStore,
    private val tabsUseCases: TabsUseCases,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.Main),
) : Middleware<TrustPanelState, TrustPanelAction> {

    @Suppress("CyclomaticComplexMethod")
    override fun invoke(
        store: Store<TrustPanelState, TrustPanelAction>,
        next: (TrustPanelAction) -> Unit,
        action: TrustPanelAction,
    ) {
        next(action)

        scope.launch {
            when (action) {
                is TrustPanelAction.Navigate.PrivacySecuritySettings -> navController.nav(
                    R.id.trustPanelFragment,
                    TrustPanelFragmentDirections.actionGlobalTrackingProtectionFragment(
                        preferenceToScrollTo = privacySecurityPrefKey,
                    ),
                )

                is TrustPanelAction.Navigate.ManagePhoneFeature -> navController.nav(
                    R.id.trustPanelFragment,
                    TrustPanelFragmentDirections.actionGlobalSitePermissionsManagePhoneFeature(action.phoneFeature),
                )

                is TrustPanelAction.Navigate.SecurityCertificate -> {
                    val bytes = store.state.websiteInfoState.certificate?.encoded ?: return@launch
                    val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP or Base64.NO_PADDING)
                    navController.openToBrowser()
                    tabsUseCases.addTab(
                        "about:certificate?cert=${Uri.encode(base64)}",
                        parentId = store.state.sessionState?.id,
                        contextId = store.state.sessionState?.contextId,
                        private = appStore.state.mode.isPrivate,
                    )
                }

                else -> Unit
            }
        }
    }
}
