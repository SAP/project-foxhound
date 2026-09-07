/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.thumbnails

import android.content.Context
import android.graphics.Bitmap
import androidx.annotation.VisibleForTesting
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.selector.selectedTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.ContentState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.lib.state.helpers.AbstractBinding
import mozilla.components.support.ktx.android.content.isOSOnLowMemory

typealias RequestHomepageScreenshot = (Bitmap) -> Unit

/**
 * Feature implementation for automatically taking thumbnails of homepage.
 * The feature will take a screenshot when the page finishes loading,
 * and will add it to the [ContentState.thumbnail] property.
 *
 * If the OS is under low memory conditions, the screenshot will be not taken.
 * Ideally, this should be used in conjunction with `SessionManager.onLowMemory` to allow
 * free up some [ContentState.thumbnail] from memory.
 */
class HomepageThumbnails(
    private val context: Context,
    private val store: BrowserStore,
    private val homepageUrl: String,
    mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
    private val homepageRequest: ((RequestHomepageScreenshot) -> Unit)? = null,
) : AbstractBinding<BrowserState>(store, mainDispatcher) {

    override suspend fun onState(flow: Flow<BrowserState>) {
        flow.map { it.selectedTab }
            .distinctUntilChanged()
            .collect { state ->
                if (state?.content?.url == homepageUrl) {
                    homepageRequest?.invoke(::requestHomepageScreenshot)
                }
            }
    }

    private fun requestHomepageScreenshot(bitmap: Bitmap) {
        if (!isLowOnMemory()) {
            val tabId = store.state.selectedTabId ?: return
            store.dispatch(ContentAction.UpdateThumbnailAction(tabId, bitmap))
        }
    }

    @VisibleForTesting
    internal var testLowMemory = false

    private fun isLowOnMemory() = testLowMemory || context.isOSOnLowMemory()
}
