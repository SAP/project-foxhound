/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.labs

import android.content.Intent
import android.os.Bundle
import android.os.Process
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.compose.content
import androidx.navigation.fragment.findNavController
import mozilla.components.lib.state.helpers.StoreProvider.Companion.fragmentStore
import org.mozilla.fenix.ext.hideToolbar
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.settings.labs.middleware.LabsMiddleware
import org.mozilla.fenix.settings.labs.store.LabsState
import org.mozilla.fenix.settings.labs.store.LabsStore
import org.mozilla.fenix.settings.labs.ui.FirefoxLabsScreen
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * Fragment for displaying the Firefox Labs screen.
 */
class FirefoxLabsFragment : Fragment() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        hideToolbar()
    }

    private val labsStore by fragmentStore(
        initialState = LabsState.INITIAL,
    ) {
        LabsStore(
            initialState = it,
            middleware = listOf(
                LabsMiddleware(
                    settings = requireContext().settings(),
                    onRestart = ::restartFenix,
                ),
            ),
        )
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View = content {
        FirefoxTheme {
            FirefoxLabsScreen(
                store = labsStore,
                onNavigationIconClick = {
                    this@FirefoxLabsFragment.findNavController().popBackStack()
                },
            )
        }
    }

    private fun restartFenix() {
        val context = activity?.applicationContext
        context?.startActivity(
            Intent.makeRestartActivityTask(
                context.packageManager.getLaunchIntentForPackage(context.packageName)?.component,
            ),
        )
        // Kill the existing process to ensure we get a clean start of the application
        Process.killProcess(Process.myPid())
    }
}
