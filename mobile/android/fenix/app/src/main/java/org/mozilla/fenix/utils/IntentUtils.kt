/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.utils

import android.app.PendingIntent

object IntentUtils {

    /**
     * FLAG_IMMUTABLE -> Flag indicating that the created PendingIntent should be immutable.
     */
    const val DEFAULT_PENDING_INTENT_FLAGS = PendingIntent.FLAG_IMMUTABLE
}
