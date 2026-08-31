/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.icons.preparer

import android.content.Context
import androidx.core.net.toUri
import mozilla.components.browser.icons.IconRequest
import mozilla.components.browser.icons.ext.hostWithCommonDomain
import mozilla.components.service.merino.manifest.MerinoManifestProvider
import mozilla.components.support.ktx.android.net.hostWithoutCommonPrefixes
import mozilla.components.support.ktx.android.net.isHttpOrHttps

/**
 * [IconPreprarer] implementation that looks up the host in the Merino manifest. If it can find a
 * match then it inserts the icon URL into the request.
 */
class MerinoManifestIconPreparer(
    private val manifestProvider: MerinoManifestProvider,
) : IconPreprarer {
    override fun prepare(context: Context, request: IconRequest): IconRequest {
        val uri = request.url.toUri()
        if (!uri.isHttpOrHttps) {
            return request
        }

        val host = uri.hostWithCommonDomain ?: uri.hostWithoutCommonPrefixes

        return if (host != null) {
            val iconUrl = manifestProvider.getIconUrl(host) ?: return request
            val resource = IconRequest.Resource(
                url = iconUrl,
                type = IconRequest.Resource.Type.MERINO_MANIFEST,
            )
            request.copy(resources = request.resources + resource)
        } else {
            request
        }
    }
}
