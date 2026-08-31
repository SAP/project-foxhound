/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.summarize.settings

import mozilla.components.lib.state.State

/**
 * State for the summarize settings screen.
 *
 * @property isFeatureEnabled Whether page summarization is enabled.
 * @property isGestureEnabled Whether the shake-to-summarize gesture is enabled.
 */
data class SummarizeSettingsState(
    val isFeatureEnabled: Boolean = false,
    val isGestureEnabled: Boolean = false,
) : State
