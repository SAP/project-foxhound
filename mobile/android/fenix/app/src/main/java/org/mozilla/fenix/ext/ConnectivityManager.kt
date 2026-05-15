/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ext

import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities

/**
 * Checks for availability of network and if there's internet flowing through it or not.
 */
fun ConnectivityManager.isOnline(network: Network? = null): Boolean {
    return getNetworkCapabilities(network ?: activeNetwork)?.let {
            it.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            it.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        } ?: false
}
