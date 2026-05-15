/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.topsites

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.fragment.app.Fragment
import androidx.fragment.compose.content
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import kotlinx.coroutines.flow.map
import mozilla.components.feature.top.sites.presenter.DefaultTopSitesPresenter
import mozilla.components.support.base.feature.ViewBoundFeatureWrapper
import org.mozilla.fenix.components.components
import org.mozilla.fenix.ext.requireComponents
import org.mozilla.fenix.home.topsites.controller.DefaultTopSiteController
import org.mozilla.fenix.home.topsites.controller.TopSiteController
import org.mozilla.fenix.home.topsites.interactor.DefaultTopSiteInteractor
import org.mozilla.fenix.home.topsites.interactor.TopSiteInteractor
import org.mozilla.fenix.home.topsites.store.ShortcutsState
import org.mozilla.fenix.home.topsites.ui.ShortcutsScreen
import org.mozilla.fenix.theme.FirefoxTheme
import java.lang.ref.WeakReference

/**
 * A [Fragment] displaying the shortcuts screen.
 */
class ShortcutsFragment : Fragment() {

    private val topSitesBinding = ViewBoundFeatureWrapper<TopSitesBinding>()

    private lateinit var interactor: TopSiteInteractor
    private lateinit var controller: TopSiteController

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        controller = DefaultTopSiteController(
            activityRef = WeakReference(requireActivity()),
            store = requireComponents.core.store,
            navControllerRef = WeakReference(findNavController()),
            settings = requireComponents.settings,
            addTabUseCase = requireComponents.useCases.tabsUseCases.addTab,
            selectTabUseCase = requireComponents.useCases.tabsUseCases.selectTab,
            fenixBrowserUseCases = requireComponents.useCases.fenixBrowserUseCases,
            topSitesUseCases = requireComponents.useCases.topSitesUseCase,
            marsUseCases = requireComponents.useCases.marsUseCases,
            mozAdsUseCases = requireComponents.useCases.mozAdsUseCases,
            viewLifecycleScope = viewLifecycleOwner.lifecycleScope,
        )

        interactor = DefaultTopSiteInteractor(
            controller = controller,
        )

        topSitesBinding.set(
            feature = TopSitesBinding(
                browserStore = requireComponents.core.store,
                presenter = DefaultTopSitesPresenter(
                    view = DefaultTopSitesView(
                        appStore = requireComponents.appStore,
                        settings = requireComponents.settings,
                    ),
                    storage = requireComponents.core.topSitesStorage,
                    config = getTopSitesConfig(
                        settings = requireComponents.settings,
                        store = requireComponents.core.store,
                    ),
                ),
            ),
            owner = viewLifecycleOwner,
            view = view,
        )
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View = content {
        FirefoxTheme {
            val appStore = components.appStore
            val topSites by remember { appStore.stateFlow.map { state -> state.topSites } }
                .collectAsState(initial = emptyList())

            ShortcutsScreen(
                state = ShortcutsState(topSites = topSites),
                interactor = interactor,
                onNavigationIconClick = {
                    this@ShortcutsFragment.findNavController().popBackStack()
                },
            )
        }
    }
}
