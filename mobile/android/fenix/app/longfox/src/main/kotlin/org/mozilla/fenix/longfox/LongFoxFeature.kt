/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.longfox

import android.content.Context
import android.content.ContextWrapper
import android.view.ViewGroup
import androidx.activity.ComponentDialog
import androidx.activity.compose.BackHandler
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import org.mozilla.fenix.longfox.GleanMetrics.Longfox

/**
 * Defines the api for using Long Fox.
 */
interface LongFoxFeatureApi {

    /**
     * Shows the game in its own window, hosted on the activity backing [context].
     * @param context an activity [Context] the game should be shown over
     */
    fun start(context: Context)

    /**
     * Call this if you want to send a telemetry event when the entry point is shown.
     */
    fun onEntryPointShown()
}

/**
 * Initialises Long Fox feature 🟧🟧🟧🟧🦊
 *
 */
class LongFoxFeature : LongFoxFeatureApi {

    /**
     *  Shows the game in its own window, hosted on the activity backing [context].
     *  Using a separate window keeps accessibility services (TalkBack, the Accessibility Scanner)
     *  scoped to the game rather than reading through the opaque canvas to the UI behind it.
     *  When back is pressed, the game window is dismissed.
     *  @param context an activity [Context] the game should be shown over.
     */
    override fun start(context: Context) {
        Longfox.gameLaunched.record()

        val dialog = ComponentDialog(context, android.R.style.Theme_Translucent_NoTitleBar)
        dialog.window?.apply {
            setLayout(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
        }

        dialog.setContentView(
            ComposeView(context).apply {
                setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed)
                setContent {
                    MaterialTheme {
                        LongFoxGameScreen()
                    }
                    BackHandler {
                        dialog.dismiss()
                    }
                }
            },
        )

        // On destroy, dismiss the window with the host so it can't leak if the activity goes away mid-game.
        context.findLifecycleOwner()?.lifecycle?.let { lifecycle ->
            val observer = object : DefaultLifecycleObserver {
                override fun onDestroy(owner: LifecycleOwner) {
                    dialog.dismiss()
                }
            }
            lifecycle.addObserver(observer)
            dialog.setOnDismissListener { lifecycle.removeObserver(observer) }
        }

        dialog.show()
    }

    /**
     * When the entry point is shown, send a glean telemetry event.
     */
    override fun onEntryPointShown() {
        Longfox.entryPointShown.record()
    }
}

private tailrec fun Context.findLifecycleOwner(): LifecycleOwner? = when (this) {
    is LifecycleOwner -> this
    is ContextWrapper -> baseContext.findLifecycleOwner()
    else -> null
}
