/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.metrics

import com.android.installreferrer.api.InstallReferrerStateListener

/**
 * Wrapper interface for InstallReferrerClient to enable testing.
 */
interface InstallReferrerClientWrapper {
    /**
     * Starts up `InstallReferrerClient` setup process asynchronously.
     */
    fun startConnection(listener: InstallReferrerStateListener)

    /**
     * Get the install referrer URL of the application.
     */
    fun getInstallReferrer(): String?

    /**
     * Close the `InstallReferrerClient` connection and release all held resources such as service connections.
     */
    fun endConnection()
}
