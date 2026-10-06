/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.metrics

import android.content.Context
import com.android.installreferrer.api.InstallReferrerClient
import com.android.installreferrer.api.InstallReferrerStateListener

/**
 * Default implementation that wraps the actual InstallReferrerClient.
 */
class DefaultInstallReferrerClient(context: Context) : InstallReferrerClientWrapper {
    private val client = InstallReferrerClient.newBuilder(context).build()

    override fun startConnection(listener: InstallReferrerStateListener) {
        client.startConnection(listener)
    }

    override fun getInstallReferrer(): String? {
        return client.installReferrer?.installReferrer
    }

    override fun endConnection() {
        client.endConnection()
    }
}
