/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.base.android

import androidx.annotation.CallSuper
import androidx.appcompat.app.AppCompatDialogFragment

/**
 * [AppCompatDialogFragment] that responds to touches only if not obscured.
 */
open class NoObscuredTouchesDialogFragment : AppCompatDialogFragment() {
    @CallSuper
    override fun onStart() {
        super.onStart()
        dialog?.window?.decorView?.apply {
            filterTouchesWhenObscured = true
        }
    }
}
