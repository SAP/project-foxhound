/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.emailmasks

import mozilla.components.lib.state.State

/**
 * Represents the UI state for the Email Masks settings screen.
 *
 * @property isSuggestMasksEnabled Whether the setting to suggest using Email Masks feature is currently enabled.
 */
data class EmailMasksState(val isSuggestMasksEnabled: Boolean = false) : State
