/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home

import android.content.Context
import androidx.core.content.ContextCompat
import androidx.navigation.NavController
import mozilla.components.browser.menu.view.MenuButton
import mozilla.telemetry.glean.private.NoExtras
import org.mozilla.fenix.GleanMetrics.Events
import org.mozilla.fenix.R
import org.mozilla.fenix.components.menu.MenuAccessPoint
import org.mozilla.fenix.ext.nav
import org.mozilla.fenix.theme.ThemeManager
import java.lang.ref.WeakReference

/**
 * Helper class for building the menu button in the home toolbar.
 *
 * @param context An Android [Context].
 * @param navController [NavController] used for navigation.
 * @param menuButton The [MenuButton] that will be used to create a menu when the button is
 * clicked.
 */
class HomeMenuView(
    private val context: Context,
    private val navController: NavController,
    private val menuButton: WeakReference<MenuButton>,
) {

    /**
     * Builds the menu button in the home toolbar.
     */
    fun build() {
        menuButton.get()?.setColorFilter(
            ContextCompat.getColor(
                context,
                ThemeManager.resolveAttribute(R.attr.textPrimary, context),
            ),
        )

        menuButton.get()?.register(
            object : mozilla.components.concept.menu.MenuButton.Observer {
                override fun onShow() {
                    navController.nav(
                        R.id.homeFragment,
                        HomeFragmentDirections.actionGlobalMenuDialogFragment(
                            accesspoint = MenuAccessPoint.Home,
                        ),
                    )

                    Events.toolbarMenuVisible.record(NoExtras())
                }
            },
        )
    }
}
