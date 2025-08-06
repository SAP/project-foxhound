/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.customtabs

import android.content.Context
import androidx.core.content.ContextCompat.getColor
import mozilla.components.browser.menu.view.MenuButton
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.feature.customtabs.addCustomMenuItems
import org.mozilla.fenix.R
import org.mozilla.fenix.components.toolbar.BrowserToolbarView
import org.mozilla.fenix.theme.ThemeManager

/**
 * The index of the "Powered by .." separator in the menu items list when the toolbar is at bottom.
 * It ensures that the custom tabs menu items will appear below the "Powered by .." item.
 */
private const val START_OF_MENU_ITEMS_INDEX = 2

/**
 * Helper class to add menu items from the custom tab configuration to the menu builder
 * used by the menu of the navigation bar.
 *
 * @param context Android [Context] used for system interactions.
 * @param browserStore The [BrowserStore] containing data about the current custom tabs.
 * @param customTabSessionId ID of the custom tab session.
 * @param toolbar The [BrowserToolbarView] shown for the current custom tab that the navigation bar will match in style.
 */
internal class CustomTabsNavigationBarIntegration(
    private val context: Context,
    private val browserStore: BrowserStore,
    private val customTabSessionId: String,
    private val toolbar: BrowserToolbarView,
) {
    /**
     * Menu allowing users to interact with all options for this custom tab.
     * It includes the custom menu items specified in the custom tab configuration.
     */
    val navbarMenu by lazy(LazyThreadSafetyMode.NONE) {
        MenuButton(context).apply {
            menuBuilder = toolbar.menuToolbar.menuBuilder.addCustomMenuItems(
                context = context,
                browserStore = browserStore,
                customTabSessionId = customTabSessionId,
                customTabMenuInsertIndex = START_OF_MENU_ITEMS_INDEX,
            )

            // We have to set colorFilter manually as the button isn't being managed by a [BrowserToolbarView].
            setColorFilter(
                getColor(
                    context,
                    ThemeManager.resolveAttribute(R.attr.textPrimary, context),
                ),
            )
        }
    }
}
