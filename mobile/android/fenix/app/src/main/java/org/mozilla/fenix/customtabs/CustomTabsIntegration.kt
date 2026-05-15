/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.customtabs

import android.app.Activity
import android.content.Context
import androidx.annotation.ColorInt
import androidx.annotation.VisibleForTesting
import androidx.appcompat.content.res.AppCompatResources.getDrawable
import androidx.core.graphics.ColorUtils
import mozilla.components.browser.state.selector.findCustomTabOrSelectedTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.browser.toolbar.BrowserToolbar
import mozilla.components.browser.toolbar.display.DisplayToolbar
import mozilla.components.feature.customtabs.CustomTabsColorsConfig
import mozilla.components.feature.customtabs.CustomTabsToolbarButtonConfig
import mozilla.components.feature.customtabs.CustomTabsToolbarFeature
import mozilla.components.feature.customtabs.CustomTabsToolbarListeners
import mozilla.components.feature.tabs.CustomTabsUseCases
import mozilla.components.support.base.feature.LifecycleAwareFeature
import mozilla.components.support.base.feature.UserInteractionHandler
import mozilla.components.support.utils.ColorUtils.calculateAlphaFromPercentage
import org.mozilla.fenix.R
import org.mozilla.fenix.browser.BrowserFragment.Companion.OPEN_IN_ACTION_WEIGHT
import org.mozilla.fenix.components.menu.MenuAccessPoint
import org.mozilla.fenix.components.toolbar.ToolbarMenu
import org.mozilla.fenix.components.toolbar.interactor.BrowserToolbarInteractor
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.utils.getAppNightMode
import mozilla.components.ui.icons.R as iconsR

@Suppress("LongParameterList")
class CustomTabsIntegration(
    store: BrowserStore,
    useCases: CustomTabsUseCases,
    private val browserToolbar: BrowserToolbar,
    private val sessionId: String,
    private val activity: Activity,
    private val interactor: BrowserToolbarInteractor,
    private val isSandboxCustomTab: Boolean,
    private val isPrivate: Boolean,
) : LifecycleAwareFeature, UserInteractionHandler {

    @VisibleForTesting
    internal var forwardAction: BrowserToolbar.TwoStateButton? = null

    @VisibleForTesting
    internal var backAction: BrowserToolbar.TwoStateButton? = null

    @VisibleForTesting
    internal var openInAction: BrowserToolbar.Button? = null

    init {
        // Remove toolbar shadow
        browserToolbar.elevation = 0f

        browserToolbar.display.displayIndicatorSeparator = false
        browserToolbar.display.indicators = listOf(
            DisplayToolbar.Indicators.SECURITY,
        )

        // If in private mode, override toolbar background to use private color
        // See #5334
        if (isPrivate) {
            browserToolbar.background = getDrawable(activity, R.drawable.toolbar_background)
        }
    }

    private val feature = CustomTabsToolbarFeature(
        store = store,
        toolbar = browserToolbar,
        sessionId = sessionId,
        useCases = useCases,
        menuItemIndex = START_OF_MENU_ITEMS_INDEX,
        window = activity.window,
        customTabsToolbarListeners = CustomTabsToolbarListeners(
            menuListener = {
                interactor.onMenuButtonClicked(
                    accessPoint = MenuAccessPoint.External,
                    customTabSessionId = sessionId,
                    isSandboxCustomTab = isSandboxCustomTab,
                )
            },
            shareListener = { interactor.onBrowserToolbarMenuItemTapped(ToolbarMenu.Item.Share) },
            refreshListener = {
                interactor.onBrowserToolbarMenuItemTapped(
                    ToolbarMenu.Item.Reload(
                        bypassCache = false,
                    ),
                )
            },
        ),
        closeListener = { activity.finishAndRemoveTask() },
        appNightMode = activity.settings().getAppNightMode(),
        forceActionButtonTinting = isPrivate,
        customTabsToolbarButtonConfig = CustomTabsToolbarButtonConfig(
            showMenu = true,
            showRefreshButton = false,
            allowCustomizingCloseButton = true,
        ),
        customTabsColorsConfig = getCustomTabsColorsConfig(),
    )

    private fun getCustomTabsColorsConfig() = CustomTabsColorsConfig(
        updateStatusBarColor = !isPrivate,
        updateSystemNavigationBarColor = !isPrivate,
        updateToolbarsColor = !isPrivate,
    )

    override fun start() {
        feature.start()
    }

    override fun stop() {
        feature.stop()
    }

    override fun onBackPressed() = feature.onBackPressed()

    @VisibleForTesting
    internal fun addNavigationActions(context: Context) {
        val enableTint = feature.iconColor
        val disableTint = ColorUtils.setAlphaComponent(
            feature.iconColor,
            calculateAlphaFromPercentage(DISABLED_STATE_OPACITY),
        )

        initBackwardAction(
            context = context,
            enableTint = enableTint,
            disableTint = disableTint,
        )

        initForwardAction(
            context = context,
            enableTint = enableTint,
            disableTint = disableTint,
        )
    }

    @VisibleForTesting
    internal fun initForwardAction(
        context: Context,
        @ColorInt enableTint: Int,
        @ColorInt disableTint: Int,
    ) {
        if (forwardAction == null) {
            val primaryDrawable = getDrawable(
                context,
                iconsR.drawable.mozac_ic_forward_24,
            )?.apply {
                setTint(enableTint)
            } ?: return

            val secondaryDrawable = getDrawable(
                context,
                iconsR.drawable.mozac_ic_forward_24,
            )?.apply {
                setTint(disableTint)
            } ?: return

            forwardAction = BrowserToolbar.TwoStateButton(
                primaryImage = primaryDrawable,
                primaryContentDescription = context.getString(R.string.browser_menu_forward),
                secondaryImage = secondaryDrawable,
                secondaryContentDescription = context.getString(R.string.browser_menu_forward),
                isInPrimaryState = {
                    val currentTab = context.components.core.store.state.findCustomTabOrSelectedTab(sessionId)
                    currentTab?.content?.canGoForward ?: false
                },
                disableInSecondaryState = true,
                longClickListener = {
                    interactor.onBrowserToolbarMenuItemTapped(
                        ToolbarMenu.Item.Forward(viewHistory = true, isOnToolbar = true, isCustomTab = true),
                    )
                },
                listener = {
                    interactor.onBrowserToolbarMenuItemTapped(
                        ToolbarMenu.Item.Forward(viewHistory = false, isOnToolbar = true, isCustomTab = true),
                    )
                },
            ).also {
                browserToolbar.addNavigationAction(it)
            }
        }
    }

    @VisibleForTesting
    internal fun initBackwardAction(
        context: Context,
        @ColorInt enableTint: Int,
        @ColorInt disableTint: Int,
    ) {
        if (backAction == null) {
            val primaryDrawable = getDrawable(
                context,
                iconsR.drawable.mozac_ic_back_24,
            )?.apply {
                setTint(enableTint)
            } ?: return

            val secondaryDrawable = getDrawable(
                context,
                iconsR.drawable.mozac_ic_back_24,
            )?.apply {
                setTint(disableTint)
            } ?: return

            backAction = BrowserToolbar.TwoStateButton(
                primaryImage = primaryDrawable,
                primaryContentDescription = context.getString(R.string.browser_menu_back),
                secondaryImage = secondaryDrawable,
                secondaryContentDescription = context.getString(R.string.browser_menu_back),
                isInPrimaryState = {
                    val currentTab = context.components.core.store.state.findCustomTabOrSelectedTab(sessionId)
                    currentTab?.content?.canGoBack ?: false
                },
                disableInSecondaryState = true,
                longClickListener = {
                    interactor.onBrowserToolbarMenuItemTapped(
                        ToolbarMenu.Item.Back(viewHistory = true, isOnToolbar = true, isCustomTab = true),
                    )
                },
                listener = {
                    interactor.onBrowserToolbarMenuItemTapped(
                        ToolbarMenu.Item.Back(viewHistory = false, isOnToolbar = true, isCustomTab = true),
                    )
                },
            ).also {
                browserToolbar.addNavigationAction(it)
            }
        }
    }

    @VisibleForTesting
    internal fun removeNavigationActions() {
        forwardAction?.let {
            browserToolbar.removeNavigationAction(it)
        }
        forwardAction = null

        backAction?.let {
            browserToolbar.removeNavigationAction(it)
        }
        backAction = null
    }

    @VisibleForTesting
    internal fun initOpenInAction(
        context: Context,
        @ColorInt enableTint: Int,
        @ColorInt disableTint: Int,
    ) {
        if (openInAction == null) {
            val primaryDrawable = getDrawable(
                context,
                iconsR.drawable.mozac_ic_open_in,
            )?.apply {
                setTint(enableTint)
            } ?: return

            val secondaryDrawable = getDrawable(
                context,
                iconsR.drawable.mozac_ic_open_in,
            )?.apply {
                setTint(disableTint)
            } ?: return

            openInAction = BrowserToolbar.TwoStateButton(
                primaryImage = primaryDrawable,
                primaryContentDescription = context.getString(
                    R.string.browser_menu_open_in_fenix,
                    context.getString(R.string.app_name),
                ),
                secondaryImage = secondaryDrawable,
                secondaryContentDescription = context.getString(
                    R.string.browser_menu_open_in_fenix,
                    context.getString(R.string.app_name),
                ),
                isInPrimaryState = { !isSandboxCustomTab },
                disableInSecondaryState = true,
                weight = { OPEN_IN_ACTION_WEIGHT },
                listener = {
                    interactor.onBrowserToolbarMenuItemTapped(
                        ToolbarMenu.Item.OpenInFenix(isOnToolbar = true),
                    )
                },
            ).also {
                browserToolbar.addBrowserAction(it)
            }
        }
    }

    @VisibleForTesting
    internal fun removeOpenInAction() {
        openInAction?.let {
            browserToolbar.removeBrowserAction(it)
        }
        openInAction = null
    }

    companion object {
        private const val START_OF_MENU_ITEMS_INDEX = 2
        private const val DISABLED_STATE_OPACITY = 40
    }
}
