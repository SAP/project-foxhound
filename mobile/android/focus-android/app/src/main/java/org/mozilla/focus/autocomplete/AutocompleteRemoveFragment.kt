/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.autocomplete

import android.content.Context
import android.view.Menu
import android.view.MenuInflater
import android.view.MenuItem
import mozilla.components.browser.domains.CustomDomains
import org.mozilla.focus.GleanMetrics.Autocomplete
import org.mozilla.focus.R
import org.mozilla.focus.ext.requireComponents
import org.mozilla.focus.ext.showToolbar
import org.mozilla.focus.state.AppAction

/**
 * A Fragment that allows the user to select and remove custom autocomplete domains.
 *
 * This fragment extends [AutocompleteListFragment] to display the list of domains but operates
 * in a selection mode, allowing the user to pick specific items to delete from the [CustomDomains] storage.
 * It inflates a specific menu containing a removal action and handles the deletion logic asynchronously.
 */
class AutocompleteRemoveFragment : AutocompleteListFragment() {

    override fun onCreateMenu(menu: Menu, menuInflater: MenuInflater) {
        menuInflater.inflate(R.menu.menu_autocomplete_remove, menu)
    }

    override fun onMenuItemSelected(menuItem: MenuItem): Boolean = when (menuItem.itemId) {
        R.id.remove -> {
            removeSelectedDomains(requireActivity().applicationContext)
            true
        }
        else -> false
    }

    private fun removeSelectedDomains(context: Context) {
        val domains = (binding.domainList.adapter as DomainListAdapter).selection()
        if (domains.isNotEmpty()) {
            CustomDomains.remove(context, domains)
            Autocomplete.domainRemoved.add()

            requireComponents.appStore.dispatch(
                AppAction.NavigateUp(requireComponents.store.state.selectedTabId),
            )
        }
    }

    override fun isSelectionMode() = true

    override fun onResume() {
        super.onResume()
        showToolbar(getString(R.string.preference_autocomplete_title_remove))
    }
}
