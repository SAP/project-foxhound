/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser

import android.view.Window
import androidx.annotation.ColorInt
import androidx.annotation.VisibleForTesting
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChangedBy
import mozilla.components.lib.state.helpers.AbstractBinding
import mozilla.components.support.ktx.android.view.setSystemBarsBackground
import org.mozilla.fenix.browser.store.BrowserScreenState
import org.mozilla.fenix.browser.store.BrowserScreenStore

/**
 * [BrowserScreenStore] binding for observing custom colors changes and updating with which to
 * update the system navigation bar's backgrounds.
 *
 * @param browserScreenStore [BrowserScreenStore] to observe for custom colors changes.
 * @param window [Window] allowing to update the system bars' backgrounds.
 * @param mainDispatcher The [CoroutineDispatcher] on which the state observation and updates will occur.
 *                       Defaults to [Dispatchers.Main].
 */
class CustomTabColorsBinding(
    browserScreenStore: BrowserScreenStore,
    private val window: Window? = null,
    mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
) : AbstractBinding<BrowserScreenState>(browserScreenStore, mainDispatcher) {
    override suspend fun onState(flow: Flow<BrowserScreenState>) {
        flow.distinctUntilChangedBy { it.customTabColors }
            .collect {
                val customColors = it.customTabColors ?: return@collect
                updateTheme(
                     statusBarColor = customColors.statusBarColor,
                     navigationBarColor = customColors.navigationBarColor,
                     navigationBarDividerColor = customColors.navigationBarDividerColor,
                )
            }
    }

    @VisibleForTesting
    internal fun updateTheme(
        @ColorInt statusBarColor: Int? = null,
        @ColorInt navigationBarColor: Int? = null,
        @ColorInt navigationBarDividerColor: Int? = null,
    ) {
        window?.setSystemBarsBackground(
            statusBarColor = statusBarColor,
            navigationBarColor = navigationBarColor,
            navigationBarDividerColor = navigationBarDividerColor,
        )
    }
}
