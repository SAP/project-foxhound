/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.menu.store

import androidx.annotation.VisibleForTesting
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store

/**
 * The [Store] for holding the [MenuState] and applying [MenuAction]s.
 */
class MenuStore(
    initialState: MenuState,
    middleware: List<Middleware<MenuState, MenuAction>> = listOf(),
) : Store<MenuState, MenuAction>(
    initialState = initialState,
    reducer = ::reducer,
    middleware = middleware,
) {
    init {
        dispatch(MenuAction.InitAction)
    }
}

private fun reducer(state: MenuState, action: MenuAction): MenuState {
    return when (action) {
        is MenuAction.InitAction,
        is MenuAction.AddBookmark,
        is MenuAction.AddShortcut,
        is MenuAction.RemoveShortcut,
        is MenuAction.DeleteBrowsingDataAndQuit,
        is MenuAction.FindInPage,
        is MenuAction.OpenInApp,
        is MenuAction.OpenInFirefox,
        is MenuAction.InstallAddon,
        is MenuAction.CustomMenuItemAction,
        is MenuAction.ToggleReaderView,
        is MenuAction.CustomizeReaderView,
        is MenuAction.Navigate,
        -> state

        is MenuAction.RequestDesktopSite -> state.copy(isDesktopMode = true)

        is MenuAction.RequestMobileSite -> state.copy(isDesktopMode = false)

        is MenuAction.UpdateExtensionState -> state.copyWithExtensionMenuState {
            it.copy(
                recommendedAddons = action.recommendedAddons,
            )
        }

        is MenuAction.UpdateBookmarkState -> state.copyWithBrowserMenuState {
            it.copy(bookmarkState = action.bookmarkState)
        }

        is MenuAction.UpdatePinnedState -> state.copyWithBrowserMenuState {
            it.copy(isPinned = action.isPinned)
        }
    }
}

@VisibleForTesting
internal inline fun MenuState.copyWithBrowserMenuState(
    crossinline update: (BrowserMenuState) -> BrowserMenuState,
): MenuState {
    return this.copy(browserMenuState = this.browserMenuState?.let { update(it) })
}

@VisibleForTesting
internal inline fun MenuState.copyWithExtensionMenuState(
    crossinline update: (ExtensionMenuState) -> ExtensionMenuState,
): MenuState {
    return this.copy(extensionMenuState = update(this.extensionMenuState))
}
