/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.iconpicker

import androidx.annotation.StringRes

/**
 * Type that represents an icon group title in the icon picker UI.
 *
 * @property titleId A string resource describing the group title.
 */
data class IconGroupTitle(
    @param:StringRes val titleId: Int,
)
