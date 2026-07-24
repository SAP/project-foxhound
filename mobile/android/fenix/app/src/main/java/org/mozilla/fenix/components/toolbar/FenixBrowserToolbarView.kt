/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.toolbar

import android.view.View
import android.view.ViewGroup
import androidx.annotation.VisibleForTesting
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.ComposeView
import androidx.coordinatorlayout.widget.CoordinatorLayout
import androidx.core.view.isVisible
import mozilla.components.browser.state.state.CustomTabSessionState
import mozilla.components.browser.state.state.ExternalAppType
import mozilla.components.concept.engine.EngineView
import mozilla.components.concept.toolbar.ScrollableToolbar
import mozilla.components.support.ktx.android.view.findViewInHierarchy
import mozilla.components.support.utils.KeyboardState
import mozilla.components.support.utils.ext.isKeyboardVisible
import mozilla.components.support.utils.keyboardAsState
import mozilla.components.ui.widgets.behavior.DependencyGravity.Bottom
import mozilla.components.ui.widgets.behavior.DependencyGravity.Top
import mozilla.components.ui.widgets.behavior.EngineViewScrollingBehavior
import mozilla.components.ui.widgets.behavior.EngineViewScrollingBehaviorFactory
import org.mozilla.fenix.utils.Settings

/**
 * Base class for the browser toolbar implementations.
 *
 * @param parent The [ViewGroup] into which the toolbar will be added.
 * @param settings [Settings] object to get the toolbar position and other settings.
 * @param customTabSession [CustomTabSessionState] if the toolbar is shown in a custom tab.
 */
abstract class FenixBrowserToolbarView(
    private val parent: ViewGroup,
    private val settings: Settings,
    private val customTabSession: CustomTabSessionState?,
) : ScrollableToolbar {

    init {
        if (!settings.shouldUseMinimalBottomToolbarWhenEnteringText) {
            setupShowingToolbarsAfterKeyboardHidden()
        }
    }

    abstract val layout: View

    @VisibleForTesting
    internal val isPwaTabOrTwaTab: Boolean
        get() = customTabSession?.config?.externalAppType == ExternalAppType.PROGRESSIVE_WEB_APP ||
            customTabSession?.config?.externalAppType == ExternalAppType.TRUSTED_WEB_ACTIVITY

    /**
     * Configure the toolbar top/bottom divider
     *
     * @param isVisible `true` if the toolbar divider should be visible, `false` otherwise.
     */
    abstract fun updateDividerVisibility(isVisible: Boolean)

    override fun expand() {
        // expand only for normal tabs and custom tabs not for PWA or TWA
        if (isPwaTabOrTwaTab) {
            return
        }

        (layout.layoutParams as CoordinatorLayout.LayoutParams).apply {
            (behavior as? EngineViewScrollingBehavior)?.forceExpand()
        }
    }

    override fun collapse() {
        // collapse only for normal tabs and custom tabs not for PWA or TWA. Mirror expand()
        if (isPwaTabOrTwaTab) {
            return
        }

        (layout.layoutParams as CoordinatorLayout.LayoutParams).apply {
            (behavior as? EngineViewScrollingBehavior)?.forceCollapse()
        }
    }

    override fun enableScrolling() {
        if (!parent.isKeyboardVisible()) {
            (layout.layoutParams as CoordinatorLayout.LayoutParams).apply {
                (behavior as? EngineViewScrollingBehavior)?.enableScrolling()
            }
        }
    }

    override fun disableScrolling() {
        (layout.layoutParams as CoordinatorLayout.LayoutParams).apply {
            (behavior as? EngineViewScrollingBehavior)?.disableScrolling()
        }
    }

    internal fun gone() {
        layout.isVisible = false
    }

    internal fun visible() {
        layout.isVisible = true
    }

    /**
     * Sets whether the toolbar will have a dynamic behavior (to be scrolled) or not.
     *
     * This will intrinsically check and disable the dynamic behavior if
     *  - this is disabled in app settings
     *  - toolbar is placed at the bottom and tab shows a PWA or TWA
     *
     *  Also if the user has not explicitly set a toolbar position and has a screen reader enabled
     *  the toolbar will be placed at the top and in a fixed position.
     *
     * @param toolbarPosition [ToolbarPosition] to set the toolbar to.
     * @param shouldDisableScroll force disable of the dynamic behavior irrespective of the intrinsic checks.
     */
    fun setToolbarBehavior(toolbarPosition: ToolbarPosition, shouldDisableScroll: Boolean = false) {
        when (toolbarPosition) {
            ToolbarPosition.BOTTOM -> {
                if (settings.isDynamicToolbarEnabled &&
                    !settings.shouldUseFixedTopToolbar
                ) {
                    setDynamicToolbarBehavior(true)
                } else {
                    expandToolbarAndMakeItFixed()
                }
            }
            ToolbarPosition.TOP -> {
                if (settings.shouldUseFixedTopToolbar ||
                    !settings.isDynamicToolbarEnabled ||
                    shouldDisableScroll
                ) {
                    expandToolbarAndMakeItFixed()
                } else {
                    setDynamicToolbarBehavior(false)
                }
            }
        }
    }

    @VisibleForTesting
    internal fun expandToolbarAndMakeItFixed() {
        expand()
        (layout.layoutParams as CoordinatorLayout.LayoutParams).apply {
            behavior = null
        }
    }

    @VisibleForTesting
    internal fun setDynamicToolbarBehavior(isToolbarAtBottom: Boolean) {
        (parent.findViewInHierarchy { it is EngineView } as? EngineView)?.let { engineView ->
            (layout.layoutParams as CoordinatorLayout.LayoutParams).apply {
                behavior = EngineViewScrollingBehaviorFactory(
                    useScrollData = settings.useNewDynamicToolbarBehaviour,
                ).build(
                    engineView = engineView,
                    dependency = layout,
                    dependencyGravity = when (isToolbarAtBottom) {
                        true -> Bottom
                        false -> Top
                    },
                )
            }
        }
    }

    protected fun shouldShowTabStrip() = customTabSession == null && settings.isTabStripEnabled

    private fun setupShowingToolbarsAfterKeyboardHidden() {
        parent.addView(
            ComposeView(parent.context).apply {
                setContent {
                    val keyboardState by keyboardAsState()
                    LaunchedEffect(keyboardState) {
                        if (keyboardState == KeyboardState.Closed) {
                            expand()
                        }
                    }
                }
            },
        )
    }
}
