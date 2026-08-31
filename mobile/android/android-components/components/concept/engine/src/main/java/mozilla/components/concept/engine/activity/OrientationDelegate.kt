/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.concept.engine.activity

import android.content.pm.ActivityInfo

/**
 * Notifies applications or other components of engine orientation lock events.
 */
interface OrientationDelegate {
    /**
     * The result of an orientation lock request.
     */
    enum class LockResult {
        /**
         * The orientation lock request was successful.
         */
        SUCCESS,

        /**
         * The orientation lock request was rejected.
         */
        REJECTED,

        /**
         * The orientation lock request is not supported by the platform.
         */
        NOT_SUPPORTED,
    }

    /**
     * Request to force a certain screen orientation on the current activity.
     *
     * @param requestedOrientation The screen orientation which should be set.
     * Values can be any of screen orientation values defined in [ActivityInfo].
     *
     * @return The [LockResult] of the orientation lock request.
     */
    fun onOrientationLock(requestedOrientation: Int): LockResult = LockResult.SUCCESS

    /**
     * Request to restore the natural device orientation, what it was before [onOrientationLock].
     * Implementers should usually set [ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED].
     */
    fun onOrientationUnlock() = Unit
}
