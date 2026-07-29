/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.studies

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import org.mozilla.fenix.databinding.SettingsStudiesBinding
import org.mozilla.fenix.e2e.SystemInsetsPaddedFragment
import org.mozilla.fenix.ext.openToBrowser
import org.mozilla.fenix.ext.requireComponents

/**
 * Lets the users control studies settings.
 */
class StudiesFragment : Fragment(), SystemInsetsPaddedFragment {
    private var _binding: SettingsStudiesBinding? = null

    // This property is only valid between onCreateView and
    // onDestroyView.
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        val experiments = requireComponents.nimbus.sdk
        _binding = SettingsStudiesBinding.inflate(inflater, container, false)
        val interactor = DefaultStudiesInteractor(
            openUrlInBrowser = { url ->
                findNavController().openToBrowser()
                requireComponents.useCases.fenixBrowserUseCases.loadUrlOrSearch(
                    searchTermOrURL = url,
                    newTab = true,
                )
            },
            experiments = experiments,
        )
        StudiesView(
            lifecycleScope,
            requireContext(),
            binding,
            interactor,
            requireComponents.settings,
            experiments,
            isAttached = ::isAttached,
        ).bind()

        return binding.root
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    private fun isAttached(): Boolean = context != null
}
