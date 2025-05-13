/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.toolbar.navbar

import android.content.res.Configuration
import androidx.annotation.ColorInt
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.Icon
import androidx.compose.material.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import mozilla.components.browser.menu.view.MenuButton
import mozilla.components.browser.state.selector.findCustomTab
import mozilla.components.browser.state.selector.normalTabs
import mozilla.components.browser.state.selector.privateTabs
import mozilla.components.browser.state.selector.selectedTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.lib.state.ext.observeAsState
import mozilla.components.ui.tabcounter.TabCounterMenu
import org.mozilla.fenix.R
import org.mozilla.fenix.browser.browsingmode.BrowsingMode
import org.mozilla.fenix.components.components
import org.mozilla.fenix.components.toolbar.NewTabMenu
import org.mozilla.fenix.compose.LongPressIconButton
import org.mozilla.fenix.compose.annotation.LightDarkPreview
import org.mozilla.fenix.compose.utils.KeyboardState
import org.mozilla.fenix.compose.utils.keyboardAsState
import org.mozilla.fenix.search.SearchDialogFragment
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.Theme
import org.mozilla.fenix.theme.ThemeManager

/**
 * Top-level UI for displaying the navigation bar.
 *
 * @param isPrivateMode If browsing in [BrowsingMode.Private].
 * @param isFeltPrivateBrowsingEnabled Whether the felt private browsing feature is enabled.
 * @param browserStore The [BrowserStore] instance used to observe tabs state.
 * @param menuButton A [MenuButton] to be used as an [AndroidView]. The view implementation
 * contains the builder for the menu, so for the time being we are not implementing it as a composable.
 * @param newTabMenu A [TabCounterMenu] to be used as an [AndroidView] for when the user
 * long taps on the new tab button.
 * @param tabsCounterMenu A [TabCounterMenu] to be used as an [AndroidView] for when the user
 * long taps on the tab counter.
 * @param onBackButtonClick Invoked when the user clicks on the back button in the navigation bar.
 * @param onBackButtonLongPress Invoked when the user long-presses the back button in the navigation bar.
 * @param onForwardButtonClick Invoked when the user clicks on the forward button in the navigation bar.
 * @param onForwardButtonLongPress Invoked when the user long-presses the forward button in the navigation bar.
 * @param onNewTabButtonClick Invoked when the user click on the new tab button in the navigation bar.
 * @param onNewTabButtonLongPress Invoked when the user long-presses the new tab button in the navigation bar.
 * @param onTabsButtonClick Invoked when the user clicks on the tabs button in the navigation bar.
 * @param onTabsButtonLongPress Invoked when the user long-presses the tabs button in the navigation bar.
 * @param onMenuButtonClick Invoked when the user clicks on the menu button in the navigation bar.
 * @param isMenuRedesignEnabled Whether or not the menu redesign is enabled.
 */
@Suppress("LongParameterList")
@Composable
fun BrowserNavBar(
    isPrivateMode: Boolean,
    isFeltPrivateBrowsingEnabled: Boolean,
    browserStore: BrowserStore,
    menuButton: MenuButton,
    newTabMenu: TabCounterMenu,
    tabsCounterMenu: TabCounterMenu,
    onBackButtonClick: () -> Unit,
    onBackButtonLongPress: () -> Unit,
    onForwardButtonClick: () -> Unit,
    onForwardButtonLongPress: () -> Unit,
    onNewTabButtonClick: () -> Unit,
    onNewTabButtonLongPress: () -> Unit,
    onTabsButtonClick: () -> Unit,
    onTabsButtonLongPress: () -> Unit,
    onMenuButtonClick: () -> Unit,
    isMenuRedesignEnabled: Boolean = components.settings.enableMenuRedesign,
) {
    val tabCount = browserStore.observeAsState(initialValue = 0) { browserState ->
        if (isPrivateMode) {
            browserState.privateTabs.size
        } else {
            browserState.normalTabs.size
        }
    }.value
    val canGoBack by browserStore.observeAsState(initialValue = false) { it.selectedTab?.content?.canGoBack ?: false }
    val canGoForward by browserStore.observeAsState(initialValue = false) {
        it.selectedTab?.content?.canGoForward ?: false
    }

    NavBar {
        BackButton(
            onBackButtonClick = onBackButtonClick,
            onBackButtonLongPress = onBackButtonLongPress,
            enabled = canGoBack,
        )

        ForwardButton(
            onForwardButtonClick = onForwardButtonClick,
            onForwardButtonLongPress = onForwardButtonLongPress,
            enabled = canGoForward,
        )

        NewTabButton(
            onClick = onNewTabButtonClick,
            menu = newTabMenu,
            onLongPress = onNewTabButtonLongPress,
        )

        ToolbarTabCounterButton(
            tabCount = tabCount,
            isPrivateMode = isPrivateMode,
            isFeltPrivateBrowsingEnabled = isFeltPrivateBrowsingEnabled,
            onClick = onTabsButtonClick,
            menu = tabsCounterMenu,
            onLongPress = onTabsButtonLongPress,
        )

        MenuButton(
            menuButton = menuButton,
            isMenuRedesignEnabled = isMenuRedesignEnabled,
            onMenuButtonClick = onMenuButtonClick,
        )
    }
}

/**
 * Top-level UI for displaying the navigation bar.
 *
 * @param isPrivateMode If browsing in [BrowsingMode.Private].
 * @param isFeltPrivateBrowsingEnabled Whether the felt private browsing feature is enabled.
 * @param browserStore The [BrowserStore] instance used to observe tabs state.
 * @param menuButton A [MenuButton] to be used as an [AndroidView]. The view implementation
 * contains the builder for the menu, so for the time being we are not implementing it as a composable.
 * @param tabsCounterMenu A [TabCounterMenu] to be used as an [AndroidView] for when the user
 * long taps on the tab counter.
 * @param onSearchButtonClick Invoked when the user clicks the search button in the nav bar. The button
 * is visible only on home screen and activates [SearchDialogFragment].
 * @param onTabsButtonClick Invoked when the user clicks the tabs button in the nav bar.
 * @param onTabsButtonLongPress Invoked when the user long-presses the tabs button in the nav bar.
 * @param onMenuButtonClick Invoked when the user clicks on the menu button in the navigation bar.
 * @param isMenuRedesignEnabled Whether or not the menu redesign is enabled.
 */
@Suppress("LongParameterList")
@Composable
fun HomeNavBar(
    isPrivateMode: Boolean,
    isFeltPrivateBrowsingEnabled: Boolean,
    browserStore: BrowserStore,
    menuButton: MenuButton,
    tabsCounterMenu: TabCounterMenu,
    onSearchButtonClick: () -> Unit,
    onTabsButtonClick: () -> Unit,
    onTabsButtonLongPress: () -> Unit,
    onMenuButtonClick: () -> Unit,
    isMenuRedesignEnabled: Boolean = components.settings.enableMenuRedesign,
) {
    val tabCount = browserStore.observeAsState(initialValue = 0) { browserState ->
        if (isPrivateMode) {
            browserState.privateTabs.size
        } else {
            browserState.normalTabs.size
        }
    }.value

    NavBar {
        BackButton(
            onBackButtonClick = {
                // no-op
            },
            onBackButtonLongPress = {
                // no-op
            },
            // Nav buttons are disabled on the home screen
            enabled = false,
        )

        ForwardButton(
            onForwardButtonClick = {
                // no-op
            },
            onForwardButtonLongPress = {
                // no-op
            },
            // Nav buttons are disabled on the home screen
            enabled = false,
        )

        SearchWebButton(
            onSearchButtonClick = onSearchButtonClick,
        )

        ToolbarTabCounterButton(
            tabCount = tabCount,
            isPrivateMode = isPrivateMode,
            isFeltPrivateBrowsingEnabled = isFeltPrivateBrowsingEnabled,
            onClick = onTabsButtonClick,
            menu = tabsCounterMenu,
            onLongPress = onTabsButtonLongPress,
        )

        MenuButton(
            menuButton = menuButton,
            isMenuRedesignEnabled = isMenuRedesignEnabled,
            onMenuButtonClick = onMenuButtonClick,
        )
    }
}

/**
 * Top-level UI for displaying the CustomTab navigation bar.
 *
 * @param customTabSessionId the tab's session.
 * @param browserStore The [BrowserStore] instance used to observe tabs state.
 * @param menuButton A [MenuButton] to be used as an [AndroidView]. The view implementation
 * contains the builder for the menu, so for the time being we are not implementing it as a composable.
 * @param onBackButtonClick Invoked when the user clicks the back button in the nav bar.
 * @param onBackButtonLongPress Invoked when the user long-presses the back button in the nav bar.
 * @param onForwardButtonClick Invoked when the user clicks the forward button in the nav bar.
 * @param onForwardButtonLongPress Invoked when the user long-presses the forward button in the nav bar.
 * @param onOpenInBrowserButtonClick Invoked when the user clicks the open in fenix button in the nav bar.
 * @param onMenuButtonClick Invoked when the user clicks on the menu button in the navigation bar.
 * @param backgroundColor Custom background color of the navigation bar.
 * When `null`, [FirefoxTheme.layer1] will be used.
 * @param buttonTint Custom button tint color of the navigation bar. When `null`, [Color.White] will be used.
 * @param isMenuRedesignEnabled Whether or not the menu redesign is enabled.
 */
@Composable
@Suppress("LongParameterList")
fun CustomTabNavBar(
    customTabSessionId: String,
    browserStore: BrowserStore,
    menuButton: MenuButton,
    onBackButtonClick: () -> Unit,
    onBackButtonLongPress: () -> Unit,
    onForwardButtonClick: () -> Unit,
    onForwardButtonLongPress: () -> Unit,
    onOpenInBrowserButtonClick: () -> Unit,
    onMenuButtonClick: () -> Unit,
    @ColorInt backgroundColor: Int? = null,
    @ColorInt buttonTint: Int? = null,
    isMenuRedesignEnabled: Boolean = components.settings.enableMenuRedesign,
) {
    // A follow up: https://bugzilla.mozilla.org/show_bug.cgi?id=1888573
    val canGoBack by browserStore.observeAsState(initialValue = false) {
        it.findCustomTab(customTabSessionId)?.content?.canGoBack ?: false
    }
    val canGoForward by browserStore.observeAsState(initialValue = false) {
        it.findCustomTab(customTabSessionId)?.content?.canGoForward ?: false
    }
    val background = backgroundColor?.let { Color(it) } ?: FirefoxTheme.colors.layer1
    val iconTint = buttonTint?.let { Color(it) } ?: FirefoxTheme.colors.iconPrimary

    NavBar(
        background = background,
    ) {
        BackButton(
            onBackButtonClick = onBackButtonClick,
            onBackButtonLongPress = onBackButtonLongPress,
            enabled = canGoBack,
            buttonEnabledTint = iconTint,
        )

        ForwardButton(
            onForwardButtonClick = onForwardButtonClick,
            onForwardButtonLongPress = onForwardButtonLongPress,
            enabled = canGoForward,
            buttonEnabledTint = iconTint,
        )

        OpenInBrowserButton(
            onOpenInBrowserButtonClick = onOpenInBrowserButtonClick,
            tint = iconTint,
        )

        MenuButton(
            menuButton = menuButton,
            isMenuRedesignEnabled = isMenuRedesignEnabled,
            onMenuButtonClick = onMenuButtonClick,
            tint = iconTint,
        )
    }
}

@Composable
private fun NavBar(
    background: Color = FirefoxTheme.colors.layer1,
    content: @Composable RowScope.() -> Unit,
) {
    val keyboardState by keyboardAsState()
    if (keyboardState == KeyboardState.Closed) {
        Row(
            modifier = Modifier
                .background(background)
                .height(dimensionResource(id = R.dimen.browser_navbar_height))
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
            content = content,
        )
    }
}

@Composable
private fun BackButton(
    onBackButtonClick: () -> Unit,
    onBackButtonLongPress: () -> Unit,
    enabled: Boolean,
    buttonEnabledTint: Color = FirefoxTheme.colors.iconPrimary,
) {
    LongPressIconButton(
        onClick = onBackButtonClick,
        onLongClick = onBackButtonLongPress,
        enabled = enabled,
        modifier = Modifier.size(48.dp),
    ) {
        Icon(
            painter = painterResource(R.drawable.mozac_ic_back_24),
            stringResource(id = R.string.browser_menu_back),
            tint = if (enabled) buttonEnabledTint else FirefoxTheme.colors.iconDisabled,
        )
    }
}

@Composable
private fun ForwardButton(
    onForwardButtonClick: () -> Unit,
    onForwardButtonLongPress: () -> Unit,
    enabled: Boolean,
    buttonEnabledTint: Color = FirefoxTheme.colors.iconPrimary,
) {
    LongPressIconButton(
        onClick = onForwardButtonClick,
        onLongClick = onForwardButtonLongPress,
        enabled = enabled,
        modifier = Modifier.size(48.dp),
    ) {
        Icon(
            painter = painterResource(R.drawable.mozac_ic_forward_24),
            stringResource(id = R.string.browser_menu_forward),
            tint = if (enabled) buttonEnabledTint else FirefoxTheme.colors.iconDisabled,
        )
    }
}

@Composable
private fun SearchWebButton(
    onSearchButtonClick: () -> Unit,
) {
    IconButton(
        onClick = onSearchButtonClick,
    ) {
        Icon(
            painter = painterResource(R.drawable.mozac_ic_search_24),
            stringResource(id = R.string.search_hint),
            tint = FirefoxTheme.colors.iconPrimary,
        )
    }
}

@Composable
private fun MenuButton(
    menuButton: MenuButton,
    isMenuRedesignEnabled: Boolean,
    onMenuButtonClick: () -> Unit,
    tint: Color = FirefoxTheme.colors.iconPrimary,
) {
    if (isMenuRedesignEnabled) {
        IconButton(
            onClick = onMenuButtonClick,
            modifier = Modifier.size(48.dp),
        ) {
            Icon(
                painter = painterResource(R.drawable.mozac_ic_ellipsis_vertical_24),
                contentDescription = stringResource(id = R.string.mozac_browser_menu_button),
                tint = tint,
            )
        }
    } else {
        AndroidView(
            modifier = Modifier.size(48.dp),
            factory = { _ -> menuButton },
        )
    }
}

@Composable
private fun OpenInBrowserButton(
    tint: Color = FirefoxTheme.colors.iconPrimary,
    onOpenInBrowserButtonClick: () -> Unit,
) {
    IconButton(
        onClick = onOpenInBrowserButtonClick,
    ) {
        Icon(
            painter = painterResource(R.drawable.mozac_ic_open_in),
            stringResource(R.string.browser_menu_open_in_fenix, R.string.app_name),
            tint = tint,
        )
    }
}

@Composable
private fun HomeNavBarPreviewRoot(
    isPrivateMode: Boolean,
    isFeltPrivateBrowsingEnabled: Boolean = false,
) {
    val context = LocalContext.current
    val colorId = if (isPrivateMode) {
        // private mode preview keeps using black colour as textPrimary
        ThemeManager.resolveAttribute(R.attr.textOnColorPrimary, context)
    } else {
        ThemeManager.resolveAttribute(R.attr.textPrimary, context)
    }
    val menuButton = MenuButton(context).apply {
        setColorFilter(
            ContextCompat.getColor(
                context,
                colorId,
            ),
        )
    }
    val tabsCounterMenu = TabCounterMenu(context, onItemTapped = {})

    HomeNavBar(
        isPrivateMode = isPrivateMode,
        isFeltPrivateBrowsingEnabled = isFeltPrivateBrowsingEnabled,
        browserStore = BrowserStore(),
        menuButton = menuButton,
        tabsCounterMenu = tabsCounterMenu,
        onSearchButtonClick = {},
        onTabsButtonClick = {},
        onTabsButtonLongPress = {},
        onMenuButtonClick = {},
        isMenuRedesignEnabled = false,
    )
}

@Composable
private fun OpenTabNavBarNavBarPreviewRoot(isPrivateMode: Boolean) {
    val context = LocalContext.current
    val colorId = if (isPrivateMode) {
        // private mode preview keeps using black colour as textPrimary
        ThemeManager.resolveAttribute(R.attr.textOnColorPrimary, context)
    } else {
        ThemeManager.resolveAttribute(R.attr.textPrimary, context)
    }
    val menuButton = MenuButton(context).apply {
        setColorFilter(
            ContextCompat.getColor(
                context,
                colorId,
            ),
        )
    }
    val tabsCounterMenu = TabCounterMenu(context, onItemTapped = {})
    val newTabMenu = NewTabMenu(context, onItemTapped = {})

    BrowserNavBar(
        isPrivateMode = false,
        isFeltPrivateBrowsingEnabled = false,
        browserStore = BrowserStore(),
        menuButton = menuButton,
        newTabMenu = newTabMenu,
        tabsCounterMenu = tabsCounterMenu,
        onBackButtonClick = {},
        onBackButtonLongPress = {},
        onForwardButtonClick = {},
        onForwardButtonLongPress = {},
        onNewTabButtonClick = {},
        onNewTabButtonLongPress = {},
        onTabsButtonClick = {},
        onTabsButtonLongPress = {},
        onMenuButtonClick = {},
        isMenuRedesignEnabled = false,
    )
}

@Composable
private fun CustomTabNavBarPreviewRoot(isPrivateMode: Boolean) {
    val context = LocalContext.current
    val menuButtonTint = if (isPrivateMode) {
        // private mode preview keeps using black colour as textPrimary
        ThemeManager.resolveAttribute(R.attr.textOnColorPrimary, context)
    } else {
        ThemeManager.resolveAttribute(R.attr.textPrimary, context)
    }
    val menuButton = MenuButton(context).apply {
        setColorFilter(
            ContextCompat.getColor(
                context,
                menuButtonTint,
            ),
        )
    }

    CustomTabNavBar(
        customTabSessionId = "",
        browserStore = BrowserStore(),
        menuButton = menuButton,
        onBackButtonClick = {},
        onBackButtonLongPress = {},
        onForwardButtonClick = {},
        onForwardButtonLongPress = {},
        onOpenInBrowserButtonClick = {},
        onMenuButtonClick = {},
        isMenuRedesignEnabled = false,
        backgroundColor = FirefoxTheme.colors.layer1.toArgb(),
        buttonTint = FirefoxTheme.colors.iconPrimary.toArgb(),
    )
}

@LightDarkPreview
@Composable
private fun HomeNavBarPreview() {
    FirefoxTheme {
        HomeNavBarPreviewRoot(isPrivateMode = false)
    }
}

@Preview(uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
private fun HomeNavBarPrivatePreview() {
    FirefoxTheme(theme = Theme.Private) {
        HomeNavBarPreviewRoot(isPrivateMode = true)
    }
}

@Preview
@Composable
private fun HomeNavBarWithFeltPrivateBrowsingPreview() {
    FirefoxTheme(theme = Theme.Private) {
        HomeNavBarPreviewRoot(isPrivateMode = true, isFeltPrivateBrowsingEnabled = true)
    }
}

@LightDarkPreview
@Composable
private fun OpenTabNavBarPreview() {
    FirefoxTheme {
        OpenTabNavBarNavBarPreviewRoot(isPrivateMode = false)
    }
}

@Preview(uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
private fun OpenTabNavBarPrivatePreview() {
    FirefoxTheme(theme = Theme.Private) {
        OpenTabNavBarNavBarPreviewRoot(isPrivateMode = true)
    }
}

@LightDarkPreview
@Composable
private fun CustomTabNavBarPreview() {
    FirefoxTheme {
        CustomTabNavBarPreviewRoot(isPrivateMode = false)
    }
}

@Preview(uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
private fun CustomTabNavBarPrivatePreview() {
    FirefoxTheme(theme = Theme.Private) {
        CustomTabNavBarPreviewRoot(isPrivateMode = true)
    }
}
