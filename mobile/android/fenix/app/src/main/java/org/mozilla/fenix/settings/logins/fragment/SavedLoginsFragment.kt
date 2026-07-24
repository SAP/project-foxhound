/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.logins.fragment

import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.getSystemService
import androidx.fragment.compose.content
import androidx.navigation.NavHostController
import androidx.navigation.fragment.findNavController
import mozilla.components.concept.engine.EngineSession
import mozilla.components.lib.state.helpers.StoreProvider.Companion.fragmentStore
import org.mozilla.fenix.Config
import org.mozilla.fenix.SecureFragment
import org.mozilla.fenix.components.LogMiddleware
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.ext.hideToolbar
import org.mozilla.fenix.ext.openToBrowser
import org.mozilla.fenix.ext.requireComponents
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.settings.logins.ui.DefaultSavedLoginsStorage
import org.mozilla.fenix.settings.logins.ui.LoginsMiddleware
import org.mozilla.fenix.settings.logins.ui.LoginsSortOrder
import org.mozilla.fenix.settings.logins.ui.LoginsState
import org.mozilla.fenix.settings.logins.ui.LoginsStore
import org.mozilla.fenix.settings.logins.ui.LoginsTelemetryMiddleware
import org.mozilla.fenix.settings.logins.ui.SavedLoginsScreen
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * Defines the fragment containing the saved logins.
 */
class SavedLoginsFragment : SecureFragment() {

    override fun onResume() {
        super.onResume()
        hideToolbar()
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ) = content {
        val buildStore = { composeNavController: NavHostController ->
            val navController = findNavController()

            val store by fragmentStore(
                LoginsState.default.copy(
                    sortOrder = LoginsSortOrder.fromString(
                        value = requireContext().settings().loginsListSortOrder,
                        default = LoginsSortOrder.Alphabetical,
                    ),
                ),
            ) {
                LoginsStore(
                    initialState = it,
                    middleware = listOf(
                        LogMiddleware(
                            tag = "LoginsStore",
                            shouldIncludeDetailedData = { Config.channel.isDebug },
                        ),
                        LoginsTelemetryMiddleware(),
                        LoginsMiddleware(
                            loginsStorage = requireContext().components.core.passwordsStorage,
                            getNavController = { composeNavController },
                            exitLogins = { navController.popBackStack() },
                            persistLoginsSortOrder = { sortOrder ->
                                DefaultSavedLoginsStorage(
                                    requireContext().settings(),
                                ).savedLoginsSortOrder = sortOrder
                            },
                            openTab = { url, openInNewTab ->
                                findNavController().openToBrowser()
                                requireComponents.useCases.fenixBrowserUseCases.loadUrlOrSearch(
                                    searchTermOrURL = url,
                                    newTab = openInNewTab,
                                    flags = EngineSession.LoadUrlFlags.select(
                                        EngineSession.LoadUrlFlags.ALLOW_JAVASCRIPT_URL,
                                    ),
                                )
                            },
                            clipboardManager = requireContext().getSystemService(),
                        ),
                    ),
                )
            }
            store
        }

        FirefoxTheme {
            SavedLoginsScreen(
                buildStore = buildStore,
                exitLogins = {
                    findNavController().popBackStack()
                },
            )
        }
    }
}
