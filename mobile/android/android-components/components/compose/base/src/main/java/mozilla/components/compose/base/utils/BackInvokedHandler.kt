/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.utils

import android.os.Build
import android.window.OnBackInvokedCallback
import android.window.OnBackInvokedDispatcher.PRIORITY_OVERLAY
import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.platform.LocalView
import mozilla.components.support.utils.ext.getActivityWindow

/**
 * [BackHandler] version specifically handling back invoked callbacks on Android 33+
 * with the advantage of also catching the back press / gesture events that would close the keyboard.
 *
 * On lower Android versions this will default to the original [BackHandler] functionality
 * which will still catch back presses or gesture events but only when the keyboard is not open.
 * @see [BackHandler]
 *
 * @param enabled Whether this functionality should be active or not
 * @param onBack The action to invoke for back presses or back gestures.
 */
@Composable
fun BackInvokedHandler(enabled: Boolean = true, onBack: () -> Unit) {
    val currentOnBack by rememberUpdatedState(onBack)
    val currentEnabledState by rememberUpdatedState(enabled)
    val localView = LocalView.current

    // The BackInvokedDispatcher API is only available on API 33 and above.
    // If available this will take precedence over the BackPressedDispatcher.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        val window = remember(localView) { localView.context.getActivityWindow() }

        DisposableEffect(window, currentEnabledState) {
            val backCallback = when (currentEnabledState) {
                true -> OnBackInvokedCallback {
                    currentOnBack()
                }
                else -> null
            }

            if (currentEnabledState && backCallback != null && window != null) {
                window.onBackInvokedDispatcher.registerOnBackInvokedCallback(PRIORITY_OVERLAY, backCallback)
            }
            onDispose {
                backCallback?.let { window?.onBackInvokedDispatcher?.unregisterOnBackInvokedCallback(it) }
            }
        }
    }
    BackHandler(currentEnabledState) {
        currentOnBack()
    }
}
