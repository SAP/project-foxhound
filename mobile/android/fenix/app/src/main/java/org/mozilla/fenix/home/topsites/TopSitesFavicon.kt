/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.topsites

import androidx.annotation.DrawableRes
import mozilla.components.feature.top.sites.TopSite
import org.mozilla.fenix.R

/**
 * Represents the favicon of a top site.
 */
sealed class TopSitesFavicon {
    /**
     * An image URL. Image URL is only available with [TopSite.Provided].
     *
     * @property imageUrl The URL of the image to use. If empty or null, the favicon will be
     * fetched using the top site URL.
     */
    data class ImageUrl(val imageUrl: String?) : TopSitesFavicon()

    /**
     * A drawable background.
     *
     * @property drawableResId The drawable resource ID to use.
     */
    data class Drawable(
        @param:DrawableRes val drawableResId: Int,
    ) : TopSitesFavicon()
}

internal fun getTopSitesFavicon(topSite: TopSite): TopSitesFavicon {
    if (topSite is TopSite.Provided) {
        return TopSitesFavicon.ImageUrl(imageUrl = topSite.imageUrl)
    }

    return when (topSite.url) {
        "https://tenki.jp/" ->
            TopSitesFavicon.ImageUrl(imageUrl = "https://tenki.jp/favicon.ico")
        "https://m.yahoo.co.jp/" ->
            TopSitesFavicon.ImageUrl(imageUrl = "https://s.yimg.jp/c/icon/s/bsc/2.0/favicon.ico")
        "https://ameblo.jp/" ->
            TopSitesFavicon.ImageUrl(imageUrl = "https://stat100.ameba.jp/common_style/img/favicon.ico")
        "https://blog.mozilla.org/ja/firefox-ja/android-guide/" ->
            TopSitesFavicon.Drawable(R.drawable.ic_japan_onboarding_favicon)

        else -> TopSitesFavicon.ImageUrl(imageUrl = null)
    }
}
