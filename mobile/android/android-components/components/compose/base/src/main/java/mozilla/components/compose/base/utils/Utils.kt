/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.utils

import androidx.annotation.AttrRes
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalInspectionMode

/**
 * Indicates whether the app is currently running in a Composable @Preview.
 */
val inComposePreview: Boolean
    @Composable
    @ReadOnlyComposable
    get() = LocalInspectionMode.current

/**
 * Resolves and returns the resource ID referenced by the given attribute ID.
 *
 * Useful for accessing theme-defined resources like drawables or colors.
 *
 * @param attrId The attribute resource ID (e.g. R.attr.image)
 */
@Composable
fun getResolvedAttrResId(
    @AttrRes attrId: Int,
): Int {
    val typedArray = LocalContext.current.obtainStyledAttributes(intArrayOf(attrId))
    val newResId = typedArray.getResourceId(0, 0)
    typedArray.recycle()

    return newResId
}
