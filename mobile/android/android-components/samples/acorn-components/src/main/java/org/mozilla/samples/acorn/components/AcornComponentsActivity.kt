/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.samples.acorn.components

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import mozilla.components.compose.base.theme.AcornTheme
import org.mozilla.samples.acorn.components.ui.BannerScreen
import org.mozilla.samples.acorn.components.ui.ButtonsScreen
import org.mozilla.samples.acorn.components.ui.ColorsScreen
import org.mozilla.samples.acorn.components.ui.ComponentListScreen
import org.mozilla.samples.acorn.components.ui.IconsScreen
import org.mozilla.samples.acorn.components.ui.SnackbarScreen

/**
 * Activity demonstrating the Acorn Design System components.
 */
class AcornComponentsActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            AcornTheme {
                val navController = rememberNavController()

                NavHost(
                    navController = navController,
                    startDestination = Destinations.ROOT,
                ) {
                    composable(Destinations.ROOT) {
                        ComponentListScreen(onNavigate = { navController.navigate(it) })
                    }
                    composable(Destinations.BANNER) {
                        BannerScreen(onNavigateUp = { navController.popBackStack() })
                    }
                    composable(Destinations.BUTTONS) {
                        ButtonsScreen(onNavigateUp = { navController.popBackStack() })
                    }
                    composable(Destinations.COLORS) {
                        ColorsScreen(onNavigateUp = { navController.popBackStack() })
                    }
                    composable(Destinations.ICONS) {
                        IconsScreen(onNavigateUp = { navController.popBackStack() })
                    }
                    composable(Destinations.SNACKBAR) {
                        SnackbarScreen(onNavigateUp = { navController.popBackStack() })
                    }
                }
            }
        }
    }
}

internal object Destinations {
    const val ROOT = "root"
    const val BANNER = "banner"
    const val BUTTONS = "buttons"
    const val COLORS = "colors"
    const val ICONS = "icons"
    const val SNACKBAR = "snackbar"
}
