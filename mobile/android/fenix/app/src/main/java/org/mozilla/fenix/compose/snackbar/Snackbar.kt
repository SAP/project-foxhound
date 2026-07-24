/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.compose.snackbar

import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.unit.dp
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.coordinatorlayout.widget.CoordinatorLayout
import androidx.core.view.setPadding
import com.google.android.material.snackbar.BaseTransientBottomBar
import kotlinx.coroutines.launch
import mozilla.components.compose.base.annotation.FlexibleWindowLightDarkPreview
import mozilla.components.compose.base.button.FilledButton
import mozilla.components.compose.base.snackbar.Snackbar
import mozilla.components.compose.base.snackbar.SnackbarVisuals
import mozilla.components.compose.base.snackbar.displaySnackbar
import org.mozilla.fenix.R
import org.mozilla.fenix.components.SnackbarBehavior
import org.mozilla.fenix.compose.core.Action
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.theme.FirefoxTheme
import com.google.android.material.snackbar.Snackbar as MaterialSnackbar

const val SNACKBAR_TEST_TAG = "snackbar"
const val SNACKBAR_BUTTON_TEST_TAG = "snackbar_button"

/**
 * A Snackbar embedded within a View. To display a Snackbar embedded in a View hierarchy, use
 * [Snackbar.make]. For rendering Snackbars within Compose, consider using [SnackbarHost] instead.
 *
 * @param content The UI of the Snackbar.
 * @param parent The parent View to embed the Snackbar in.
 * @param snackbarAnimationCallback [SnackbarAnimationCallback] used to add animations to the Snackbar.
 */
class Snackbar private constructor(
    content: ComposeView,
    parent: ViewGroup,
    snackbarAnimationCallback: SnackbarAnimationCallback,
) : BaseTransientBottomBar<Snackbar>(parent, content, snackbarAnimationCallback) {

    init {
        // Ensure the underlying background color does not show and delegate the UI
        // to [content]. Also remove any unintended padding and delegate the padding to the Composable.
        view.setBackgroundColor(android.graphics.Color.TRANSPARENT)
        view.setPadding(0)
    }

    /**
     * Snackbar helper object
     */
    companion object {
        private const val LENGTH_ACCESSIBLE = 15000 // 15 seconds in ms

        /**
         * Display a snackbar in the given View with the given [SnackbarState]. For rendering
         * Snackbars within Compose, consider using [SnackbarHost] instead.
         *
         * @param snackBarParentView The [View] to embed the Snackbar in.
         * @param snackbarState [SnackbarState] containing the data parameters of the Snackbar.
         */
        fun make(
            snackBarParentView: View,
            snackbarState: SnackbarState,
        ): Snackbar {
            val parent = findSuitableParent(snackBarParentView) ?: run {
                throw IllegalArgumentException(
                    "No suitable parent found from the given view. Please provide a valid view.",
                )
            }
            val contentView = ComposeView(context = parent.context)
            val callback = SnackbarAnimationCallback(contentView)
            val durationOrAccessibleDuration =
                if (parent.context.settings().accessibilityServicesEnabled &&
                    LENGTH_ACCESSIBLE > snackbarState.durationMs
                ) {
                    LENGTH_ACCESSIBLE
                } else {
                    snackbarState.durationMs
                }

            return Snackbar(
                content = contentView,
                parent = parent,
                snackbarAnimationCallback = callback,
            ).also { snackbar ->
                val action = snackbarState.action?.let {
                    Action(
                        label = snackbarState.action.label,
                        onClick = {
                            snackbarState.action.onClick()
                            snackbar.dismiss()
                        },
                    )
                }

                contentView.setContent {
                    FirefoxTheme {
                        Snackbar(
                            snackbarData = snackbarState.copy(
                                action = action,
                                onDismiss = {
                                    snackbar.dismiss()
                                    snackbarState.onDismiss()
                                },
                            ).toSnackbarData(),
                        )
                    }
                }

                snackbar.duration = durationOrAccessibleDuration

                if (parent.id == R.id.dynamicSnackbarContainer) {
                    (parent.layoutParams as? CoordinatorLayout.LayoutParams)?.apply {
                        behavior = SnackbarBehavior<FrameLayout>(
                            context = snackBarParentView.context,
                            toolbarPosition = snackBarParentView.context.settings().toolbarPosition,
                            shouldUseExpandedToolbar = snackBarParentView.context.settings().shouldUseExpandedToolbar,
                        )
                    }
                }
            }
        }

        /**
         * This is a re-implementation of [MaterialSnackbar.findSuitableParent].
         */
        @Suppress("ReturnCount")
        private fun findSuitableParent(view: View?): ViewGroup? {
            var currentView = view
            var fallback: ViewGroup? = null

            do {
                // A [ConstraintLayout] parent overcomes the issue with snackbars internally
                // positioning themselves above the OS navigation bar or IMEs when using edge-to-edge
                // https://github.com/material-components/material-components-android/issues/3446
                if (currentView is ConstraintLayout && currentView.id == R.id.dynamicSnackbarContainer) {
                    return currentView
                }

                if (currentView is CoordinatorLayout) {
                    return currentView
                }

                if (currentView is FrameLayout &&
                    (currentView.id == android.R.id.content || currentView.id == R.id.dynamicSnackbarContainer)
                ) {
                    return currentView
                } else if (currentView is FrameLayout) {
                    fallback = currentView
                }

                if (currentView != null) {
                    val parent = currentView.parent
                    currentView = parent as? View
                }
            } while (currentView != null)

            return fallback
        }

        private class SnackbarAnimationCallback(
            private val content: View,
        ) : com.google.android.material.snackbar.ContentViewCallback {

            override fun animateContentIn(delay: Int, duration: Int) {
                content.translationY = (content.height).toFloat()
                content.animate().apply {
                    translationY(DEFAULT_Y_TRANSLATION)
                    setDuration(ANIMATE_IN_DURATION_MS)
                    startDelay = delay.toLong()
                }
            }

            override fun animateContentOut(delay: Int, duration: Int) {
                content.translationY = DEFAULT_Y_TRANSLATION
                content.animate().apply {
                    translationY((content.height).toFloat())
                    setDuration(ANIMATE_OUT_DURATION_MS)
                    startDelay = delay.toLong()
                }
            }

            companion object {
                private const val DEFAULT_Y_TRANSLATION = 0f
                private const val ANIMATE_IN_DURATION_MS = 200L
                private const val ANIMATE_OUT_DURATION_MS = 150L
            }
        }
    }
}

@FlexibleWindowLightDarkPreview
@Composable
private fun SnackbarHostPreview() {
    val snackbarHostState = remember { SnackbarHostState() }
    var snackbarClicks by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()

    FirefoxTheme {
        Surface {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(all = 16.dp),
            ) {
                Column {
                    FilledButton(
                        text = "Show snackbar",
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        scope.launch {
                            snackbarHostState.displaySnackbar(
                                visuals = SnackbarVisuals(
                                    message = "Snackbar",
                                    subMessage = "SubMessage",
                                    actionLabel = "click me",
                                ),
                                onActionPerformed = { snackbarClicks++ },
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "Snackbar action clicks: $snackbarClicks",
                    )

                    Spacer(modifier = Modifier.height(16.dp))
                }

                SnackbarHost(
                    hostState = snackbarHostState,
                    modifier = Modifier.align(Alignment.BottomCenter),
                ) {
                    Snackbar(snackbarData = it)
                }
            }
        }
    }
}
