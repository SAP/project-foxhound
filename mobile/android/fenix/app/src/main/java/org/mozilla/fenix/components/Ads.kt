/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components

import android.content.Context
import mozilla.components.service.mars.MozAdsClientProvider
import org.mozilla.fenix.perf.lazyMonitored

/**
 * Provides access to Mozilla Ads related components.
 */
class Ads(
    private val context: Context,
) {

    val lazyAdsClientProvider = lazyMonitored {
        MozAdsClientProvider.also {
            it.initialize(context = context)
        }
    }
}
