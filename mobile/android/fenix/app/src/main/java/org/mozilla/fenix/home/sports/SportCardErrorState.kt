/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports

import org.mozilla.fenix.R

/**
 * The error states surfaced in the sports widget.
 */
enum class SportCardErrorState {
    /**
     * Match data failed to load.
     */
    LoadFailed,

    /**
     * Network connection dropped and live updates are paused.
     */
    ConnectionInterrupted,
}

internal val SportCardErrorState.titleResId: Int
    get() = when (this) {
        SportCardErrorState.LoadFailed -> R.string.sports_widget_error_load_failed_title
        SportCardErrorState.ConnectionInterrupted -> R.string.sports_widget_error_connection_offline_title
    }

internal val SportCardErrorState.messageResId: Int
    get() = when (this) {
        SportCardErrorState.LoadFailed -> R.string.sports_widget_error_load_failed_description
        SportCardErrorState.ConnectionInterrupted -> R.string.sports_widget_error_connection_offline_description
    }
