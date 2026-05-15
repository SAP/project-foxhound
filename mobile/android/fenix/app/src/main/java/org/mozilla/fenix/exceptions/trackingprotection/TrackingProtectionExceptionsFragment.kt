/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.exceptions.trackingprotection

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import mozilla.components.lib.state.ext.consumeFrom
import mozilla.components.lib.state.helpers.StoreProvider.Companion.fragmentStore
import org.mozilla.fenix.R
import org.mozilla.fenix.databinding.FragmentExceptionsBinding
import org.mozilla.fenix.ext.openToBrowser
import org.mozilla.fenix.ext.requireComponents
import org.mozilla.fenix.ext.showToolbar

/**
 * Displays a list of sites that are exempted from Tracking Protection,
 * along with controls to remove the exception.
 */
class TrackingProtectionExceptionsFragment : Fragment() {

    private lateinit var exceptionsStore: ExceptionsFragmentStore
    private var exceptionsView: TrackingProtectionExceptionsView? = null
    private lateinit var exceptionsInteractor: DefaultTrackingProtectionExceptionsInteractor

    override fun onResume() {
        super.onResume()
        showToolbar(getString(R.string.preference_exceptions))
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        val binding = FragmentExceptionsBinding.inflate(
            inflater,
            container,
            false,
        )
        exceptionsStore = fragmentStore(ExceptionsFragmentState(items = emptyList())) {
            ExceptionsFragmentStore(it)
        }.value

        exceptionsInteractor = DefaultTrackingProtectionExceptionsInteractor(
            exceptionsStore = exceptionsStore,
            trackingProtectionUseCases = requireComponents.useCases.trackingProtectionUseCases,
            openLearnMorePage = { url ->
                findNavController().openToBrowser()
                requireComponents.useCases.fenixBrowserUseCases.loadUrlOrSearch(
                    searchTermOrURL = url,
                    newTab = true,
                )
            },
        )
        exceptionsView = TrackingProtectionExceptionsView(
            binding.exceptionsLayout,
            exceptionsInteractor,
        )
        exceptionsInteractor.reloadExceptions()
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        consumeFrom(exceptionsStore) {
            exceptionsView?.update(it.items)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        exceptionsView = null
    }
}
