/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components

import android.content.Context
import android.content.res.Configuration
import android.graphics.Canvas
import android.view.View
import androidx.compose.material3.ColorScheme
import androidx.compose.ui.graphics.toArgb
import androidx.core.graphics.createBitmap
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.browser.thumbnails.HomepageThumbnails
import mozilla.components.browser.thumbnails.RequestHomepageScreenshot
import mozilla.components.compose.base.theme.acornDarkColorScheme
import mozilla.components.compose.base.theme.acornLightColorScheme
import mozilla.components.compose.base.theme.acornPrivateColorScheme
import mozilla.components.concept.engine.utils.ABOUT_HOME_URL
import mozilla.components.support.base.feature.LifecycleAwareFeature
import org.mozilla.fenix.browser.browsingmode.BrowsingMode
import org.mozilla.fenix.theme.Theme

/**
 * HomeFragment delegate to take screenshot of homepage when view loads and display as a thumbnail in tabstray.

 * @param context A [Context] used to check for low memory.
 * @param view The [View] to take screenshot of.
 * @param store The [BrowserStore] used to look up the current selected tab.
 * @param appStore The [AppStore] used to look up the current browsing mode.
 */
class HomepageThumbnailIntegration(
    private val context: Context,
    private val view: View,
    private val store: BrowserStore,
    private val appStore: AppStore,
) : LifecycleAwareFeature {
    private val feature by lazy {
        HomepageThumbnails(
            context = context,
            store = store,
            homepageUrl = ABOUT_HOME_URL,
            homepageRequest = ::homepageRequest,
        )
    }
    private var backgroundColor: Int = 0

    override fun start() {
        backgroundColor = getColor(context, appStore.state.mode).surface.toArgb()
        feature.start()
    }

    override fun stop() {
        feature.stop()
    }

    private fun homepageRequest(requestHomepageScreenshot: RequestHomepageScreenshot) {
        view.post {
            val bitmap = createBitmap(view.width, view.height)
            val canvas = Canvas(bitmap)
            canvas.drawColor(backgroundColor)
            view.draw(canvas)
            requestHomepageScreenshot(bitmap)
        }
    }

    /**
     * Get the color palette based on the current browsing mode.
     *
     * N.B: This logic was taken from [Theme.getTheme] in FirefoxTheme, however we cannot use it
     * directly because those functions are annotated to be Composable and refactoring that can be
     * done in a follow-up when needed.
     */
    private fun getColor(context: Context, mode: BrowsingMode): ColorScheme {
        val isDarkMode = context.resources?.configuration?.uiMode?.and(Configuration.UI_MODE_NIGHT_MASK)
        return if (mode == BrowsingMode.Private) {
            acornPrivateColorScheme()
        } else if (isDarkMode == Configuration.UI_MODE_NIGHT_YES) {
            acornDarkColorScheme()
        } else {
            acornLightColorScheme()
        }
    }
}
