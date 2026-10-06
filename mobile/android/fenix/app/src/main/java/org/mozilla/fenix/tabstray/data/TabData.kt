/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.data

import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.TabSessionState

/**
 * Data entity emitted from the tab data store.
 *
 * @property selectedTabId The ID of the selected tab. Null when no tabs are open.
 * @property tabs The list of open tabs.
 */
data class TabData(
    val selectedTabId: String? = null,
    val tabs: List<TabSessionState> = emptyList(),
) {
    constructor(browserState: BrowserState) : this(
        selectedTabId = browserState.selectedTabId,
        tabs = browserState.tabs,
    )
}
