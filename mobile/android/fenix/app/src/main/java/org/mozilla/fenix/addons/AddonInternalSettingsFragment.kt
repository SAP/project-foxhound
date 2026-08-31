/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.addons

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.annotation.VisibleForTesting
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.lifecycle.lifecycleScope
import androidx.navigation.NavOptions
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import mozilla.components.browser.state.action.WebExtensionAction
import mozilla.components.feature.accounts.push.SendTabUseCases
import mozilla.components.support.base.feature.ViewBoundFeatureWrapper
import org.mozilla.fenix.NavGraphDirections
import org.mozilla.fenix.R
import org.mozilla.fenix.databinding.FragmentAddOnInternalSettingsBinding
import org.mozilla.fenix.e2e.SystemInsetsPaddedFragment
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.ext.requireComponents
import org.mozilla.fenix.ext.showToolbar
import org.mozilla.fenix.snackbar.FenixSnackbarDelegate
import org.mozilla.fenix.snackbar.SnackbarBinding

/**
 * A fragment to show the internal settings of an add-on.
 */
class AddonInternalSettingsFragment : AddonPopupBaseFragment(), SystemInsetsPaddedFragment {

    private val args by navArgs<AddonInternalSettingsFragmentArgs>()
    private var _binding: FragmentAddOnInternalSettingsBinding? = null
    internal val binding get() = _binding!!
    private val snackbarBinding = ViewBoundFeatureWrapper<SnackbarBinding>()
    private var navigateToDetailsJob: Job? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? {
        initializeSession()
        return inflater.inflate(R.layout.fragment_add_on_internal_settings, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        _binding = FragmentAddOnInternalSettingsBinding.bind(view)
        args.optionsPageUrl?.let {
            engineSession?.let { engineSession ->
                binding.addonSettingsEngineView.render(engineSession)
                engineSession.loadUrl(it)
            }
        } ?: findNavController().navigateUp()

        snackbarBinding.set(
            feature = SnackbarBinding(
                context = requireContext(),
                browserStore = requireComponents.core.store,
                appStore = requireComponents.appStore,
                snackbarDelegate = FenixSnackbarDelegate(provideDynamicSnackbarContainer()),
                navController = findNavController(),
                tabsUseCases = requireComponents.useCases.tabsUseCases,
                sendTabUseCases = SendTabUseCases(requireComponents.backgroundServices.accountManager),
                customTabSessionId = session?.id,
            ),
            owner = this,
            view = view,
        )
    }

    override fun provideDynamicSnackbarContainer(): ConstraintLayout {
        return binding.dynamicSnackbarContainer
    }

    override fun onResume() {
        super.onResume()
        context?.let {
            showToolbar(title = args.webExtensionName ?: "")
        }
    }

    override fun onBackPressed(): Boolean {
        // navigateToInstalledAddonDetails() routes the back action to a screen where
        // openOptionsPage is disabled, which prevents a DoS.
        // However, if the options page content has its own history, let it handle the
        // back navigation first. History flooding from the content is mitigated on the
        // Gecko side, so it is not a concern here.
        return super.onBackPressed() || navigateToInstalledAddonDetails()
    }

    @VisibleForTesting
    internal fun navigateToInstalledAddonDetails(): Boolean {
        // When the options page was opened from the details screen, that screen is still
        // on the back stack, so simply return to it.
        if (provideNavController().popBackStack(R.id.installedAddonDetailsFragment, false)) {
            return true
        }
        // Otherwise the options page was opened on its own (e.g. programmatically by the
        // extension), so resolve the add-on and navigate to its details screen, replacing
        // this options page in the back stack. Resolving the add-on is an async IO
        // operation, so guard against repeated back presses launching it more than once.
        if (navigateToDetailsJob?.isActive == true) {
            return true
        }
        val webExtensionId = args.webExtensionId
        navigateToDetailsJob = viewLifecycleOwner.lifecycleScope.launch {
            navigateToInstalledAddonDetailsFor(webExtensionId)
        }
        return true
    }

    @VisibleForTesting
    internal suspend fun navigateToInstalledAddonDetailsFor(webExtensionId: String) {
        val addon = provideAddonManager().getAddonByID(webExtensionId)
        if (addon != null) {
            provideNavController().navigate(
                NavGraphDirections.actionGlobalToInstalledAddonDetailsFragment(addon),
                NavOptions.Builder()
                    .setPopUpTo(R.id.addonInternalSettingsFragment, true)
                    .build(),
            )
        } else {
            provideNavController().navigateUp()
        }
    }

    @VisibleForTesting
    internal fun provideNavController() = findNavController()

    @VisibleForTesting
    internal fun provideAddonManager() = requireContext().components.addonManager

    override fun onDestroy() {
        super.onDestroy()

        if (isRemoving) {
            requireComponents.core.store.dispatch(
                WebExtensionAction.ClearOptionsPageSession(args.webExtensionId),
            )
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
