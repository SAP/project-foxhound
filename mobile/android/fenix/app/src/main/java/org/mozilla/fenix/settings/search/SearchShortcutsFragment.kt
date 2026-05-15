/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.search

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import mozilla.components.browser.state.search.SearchEngine
import mozilla.components.support.ktx.android.view.hideKeyboard
import org.mozilla.fenix.R
import org.mozilla.fenix.databinding.FragmentSearchShortcutsBinding
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.ext.requireComponents
import org.mozilla.fenix.ext.showToolbar
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * A [Fragment] that allows user to select what search engine shortcuts will be visible in the quick
 * search menu.
 */
class SearchShortcutsFragment : Fragment(R.layout.fragment_search_shortcuts) {

    private var _binding: FragmentSearchShortcutsBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        _binding = FragmentSearchShortcutsBinding.inflate(
            inflater,
            container,
            false,
        )

        binding.root.setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed)
        binding.root.setContent {
            FirefoxTheme {
                SearchEngineShortcuts(
                    getString(R.string.preferences_category_engines_in_search_menu),
                    requireComponents.core.store,
                    onEditEngineClicked = {
                        navigateToSaveEngineFragment(it)
                    },
                    onCheckboxClicked = { engine, isEnabled ->
                        requireContext().components.useCases.searchUseCases
                            .updateDisabledSearchEngineIds(
                                engine.id,
                                isEnabled,
                            )
                    },
                    onDeleteEngineClicked = {
                        requireContext().components.useCases.searchUseCases.removeSearchEngine(it)
                    },
                    onAddEngineClicked = {
                        navigateToSaveEngineFragment()
                    },
                )
            }
        }

        return binding.root
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    private fun navigateToSaveEngineFragment(engine: SearchEngine? = null) {
        val directions = SearchShortcutsFragmentDirections
            .actionSearchShortcutsFragmentToSaveSearchEngineFragment(engine?.id)

        findNavController().navigate(directions)
    }

    override fun onResume() {
        super.onResume()
        view?.hideKeyboard()
        showToolbar(getString(R.string.preferences_manage_search_shortcuts_2))
    }
}
