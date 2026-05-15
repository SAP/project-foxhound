/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.topsites.store

import mozilla.components.feature.top.sites.TopSite
import mozilla.components.lib.state.State

/**
 * The UI state of the shortcuts.
 *
 * @property topSites The list of [TopSite] to display.
 */
data class ShortcutsState(
    val topSites: List<TopSite>,
) : State
