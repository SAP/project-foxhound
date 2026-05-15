/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.concept.toolbar.fake

import mozilla.components.concept.toolbar.AutocompleteDelegate
import mozilla.components.concept.toolbar.Toolbar
import org.junit.Assert.fail

/**
 * A fake implementation of [Toolbar] that mocks browser toolbar functionality and enables easier testing.
 */
@Suppress("TooManyFunctions")
class FakeToolbar(
    override var url: CharSequence = "",
    val onStopListener: (() -> Unit)? = null,
) : Toolbar {
    override var title: String = ""
    override var private: Boolean = false
    override var siteInfo: Toolbar.SiteInfo = Toolbar.SiteInfo.INSECURE
    override var highlight: Toolbar.Highlight = Toolbar.Highlight.NONE
    override var siteTrackingProtection: Toolbar.SiteTrackingProtection =
        Toolbar.SiteTrackingProtection.OFF_GLOBALLY

    var autocompleteFilter: (suspend (String, AutocompleteDelegate) -> Unit)? = null

    var onUrlCommitListener: ((String) -> Boolean)? = null
        private set

    override fun setSearchTerms(searchTerms: String) {
        fail()
    }

    override fun displayProgress(progress: Int) {
        fail()
    }

    override fun onBackPressed(): Boolean {
        fail()
        return false
    }

    override fun onStop() {
        onStopListener?.invoke()
    }

    override fun setOnUrlCommitListener(listener: (String) -> Boolean) {
        onUrlCommitListener = listener
    }

    override fun setAutocompleteListener(filter: suspend (String, AutocompleteDelegate) -> Unit) {
        autocompleteFilter = filter
    }

    override fun addBrowserAction(action: Toolbar.Action) {
        fail()
    }

    override fun removeBrowserAction(action: Toolbar.Action) {
        fail()
    }

    override fun removePageAction(action: Toolbar.Action) {
        fail()
    }

    override fun addPageAction(action: Toolbar.Action) {
        fail()
    }

    override fun addNavigationAction(action: Toolbar.Action) {
        fail()
    }

    override fun removeNavigationAction(action: Toolbar.Action) {
        fail()
    }

    override fun setOnEditListener(listener: Toolbar.OnEditListener) {
        fail()
    }

    override fun displayMode() {
        fail()
    }

    override fun editMode(cursorPlacement: Toolbar.CursorPlacement) {
        fail()
    }

    override fun addEditActionStart(action: Toolbar.Action) {
        fail()
    }

    override fun addEditActionEnd(action: Toolbar.Action) {
        fail()
    }

    override fun removeEditActionEnd(action: Toolbar.Action) {
        fail()
    }

    override fun hideMenuButton() {
        fail()
    }

    override fun showMenuButton() {
        fail()
    }

    override fun setDisplayHorizontalPadding(horizontalPadding: Int) {
        fail()
    }

    override fun invalidateActions() {
        fail()
    }

    override fun dismissMenu() {
        fail()
    }

    override fun enableScrolling() {
        fail()
    }

    override fun disableScrolling() {
        fail()
    }

    override fun collapse() {
        fail()
    }

    override fun expand() {
        fail()
    }
}
