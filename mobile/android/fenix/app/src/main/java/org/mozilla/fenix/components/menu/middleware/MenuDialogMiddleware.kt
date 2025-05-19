/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.menu.middleware

import android.app.AlertDialog
import android.app.PendingIntent
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mozilla.components.browser.state.ext.getUrl
import mozilla.components.concept.engine.webextension.InstallationMethod
import mozilla.components.concept.storage.BookmarksStorage
import mozilla.components.feature.addons.Addon
import mozilla.components.feature.addons.AddonManager
import mozilla.components.feature.addons.AddonManagerException
import mozilla.components.feature.app.links.AppLinksUseCases
import mozilla.components.feature.session.SessionUseCases
import mozilla.components.feature.top.sites.PinnedSiteStorage
import mozilla.components.feature.top.sites.TopSite
import mozilla.components.feature.top.sites.TopSitesUseCases
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.MiddlewareContext
import mozilla.components.lib.state.Store
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.ui.widgets.withCenterAlignedButtons
import org.mozilla.fenix.R
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.AppAction.BookmarkAction
import org.mozilla.fenix.components.appstate.AppAction.FindInPageAction
import org.mozilla.fenix.components.appstate.AppAction.ReaderViewAction
import org.mozilla.fenix.components.bookmarks.BookmarksUseCase
import org.mozilla.fenix.components.menu.store.BookmarkState
import org.mozilla.fenix.components.menu.store.MenuAction
import org.mozilla.fenix.components.menu.store.MenuState
import org.mozilla.fenix.utils.Settings

/**
 * [Middleware] implementation for handling [MenuAction] and managing the [MenuState] for the menu
 * dialog.
 *
 * @param appStore The [AppStore] used to dispatch actions to update the global state.
 * @param addonManager An instance of the [AddonManager] used to provide access to [Addon]s.
 * @param settings An instance of [Settings] to read and write to the [SharedPreferences]
 * properties.
 * @param bookmarksStorage An instance of the [BookmarksStorage] used
 * to query matching bookmarks.
 * @param pinnedSiteStorage An instance of the [PinnedSiteStorage] used
 * to query matching pinned shortcuts.
 * @param appLinksUseCases The [AppLinksUseCases] for opening a site in an external app.
 * @param addBookmarkUseCase The [BookmarksUseCase.AddBookmarksUseCase] for adding the
 * selected tab as a bookmark.
 * @param addPinnedSiteUseCase The [TopSitesUseCases.AddPinnedSiteUseCase] for adding the
 * selected tab as a pinned shortcut.
 * @param removePinnedSitesUseCase The [TopSitesUseCases.RemoveTopSiteUseCase] for removing the
 * selected tab from pinned shortcuts.
 * @param requestDesktopSiteUseCase The [SessionUseCases.RequestDesktopSiteUseCase] for toggling
 * desktop mode for the current session.
 * @param alertDialogBuilder The [AlertDialog.Builder] used to create a popup when trying to
 * add a shortcut after the shortcut limit has been reached.
 * @param topSitesMaxLimit The maximum number of top sites the user can have.
 * @param onDeleteAndQuit Callback invoked to delete browsing data and quit the browser.
 * @param onDismiss Callback invoked to dismiss the menu dialog.
 * @param onSendPendingIntentWithUrl Callback invoked to send the pending intent of a custom menu item
 * with the url of the custom tab.
 * @param scope [CoroutineScope] used to launch coroutines.
 */
@Suppress("LongParameterList")
class MenuDialogMiddleware(
    private val appStore: AppStore,
    private val addonManager: AddonManager,
    private val settings: Settings,
    private val bookmarksStorage: BookmarksStorage,
    private val pinnedSiteStorage: PinnedSiteStorage,
    private val appLinksUseCases: AppLinksUseCases,
    private val addBookmarkUseCase: BookmarksUseCase.AddBookmarksUseCase,
    private val addPinnedSiteUseCase: TopSitesUseCases.AddPinnedSiteUseCase,
    private val removePinnedSitesUseCase: TopSitesUseCases.RemoveTopSiteUseCase,
    private val requestDesktopSiteUseCase: SessionUseCases.RequestDesktopSiteUseCase,
    private val alertDialogBuilder: AlertDialog.Builder,
    private val topSitesMaxLimit: Int,
    private val onDeleteAndQuit: () -> Unit,
    private val onDismiss: suspend () -> Unit,
    private val onSendPendingIntentWithUrl: (intent: PendingIntent, url: String?) -> Unit,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.IO),
) : Middleware<MenuState, MenuAction> {

    private val logger = Logger("MenuDialogMiddleware")

    override fun invoke(
        context: MiddlewareContext<MenuState, MenuAction>,
        next: (MenuAction) -> Unit,
        action: MenuAction,
    ) {
        val currentState = context.state

        when (action) {
            is MenuAction.InitAction -> initialize(context.store)
            is MenuAction.AddBookmark -> addBookmark(context.store)
            is MenuAction.AddShortcut -> addShortcut(context.store)
            is MenuAction.RemoveShortcut -> removeShortcut(context.store)
            is MenuAction.DeleteBrowsingDataAndQuit -> deleteBrowsingDataAndQuit()
            is MenuAction.FindInPage -> launchFindInPage()
            is MenuAction.OpenInApp -> openInApp(context.store)
            is MenuAction.OpenInFirefox -> openInFirefox()
            is MenuAction.InstallAddon -> installAddon(action.addon)
            is MenuAction.CustomMenuItemAction -> customMenuItemAction(action.intent, action.url)
            is MenuAction.ToggleReaderView -> toggleReaderView(state = currentState)
            is MenuAction.CustomizeReaderView -> customizeReaderView()

            is MenuAction.RequestDesktopSite,
            is MenuAction.RequestMobileSite,
            -> requestSiteMode(
                tabId = currentState.browserMenuState?.selectedTab?.id,
                shouldRequestDesktopMode = !currentState.isDesktopMode,
            )

            else -> Unit
        }

        next(action)
    }

    private fun initialize(
        store: Store<MenuState, MenuAction>,
    ) = scope.launch {
        setupBookmarkState(store)
        setupPinnedState(store)
        setupExtensionState(store)
    }

    private suspend fun setupBookmarkState(
        store: Store<MenuState, MenuAction>,
    ) {
        val url = store.state.browserMenuState?.selectedTab?.content?.url ?: return
        val bookmark = bookmarksStorage.getBookmarksWithUrl(url)
            .firstOrNull { it.url == url } ?: return

        store.dispatch(
            MenuAction.UpdateBookmarkState(
                bookmarkState = BookmarkState(
                    guid = bookmark.guid,
                    isBookmarked = true,
                ),
            ),
        )
    }

    private suspend fun setupPinnedState(
        store: Store<MenuState, MenuAction>,
    ) {
        val url = store.state.browserMenuState?.selectedTab?.content?.url ?: return
        pinnedSiteStorage.getPinnedSites()
            .firstOrNull { it.url == url } ?: return

        store.dispatch(
            MenuAction.UpdatePinnedState(
                isPinned = true,
            ),
        )
    }

    private fun setupExtensionState(
        store: Store<MenuState, MenuAction>,
    ) = scope.launch {
        try {
            val addons = addonManager.getAddons()
            val recommendedAddons = addons
                .filter { !it.isInstalled() }
                .shuffled()
                .take(NUMBER_OF_RECOMMENDED_ADDONS_TO_SHOW)

            if (recommendedAddons.isNotEmpty()) {
                store.dispatch(
                    MenuAction.UpdateExtensionState(
                        recommendedAddons = recommendedAddons,
                    ),
                )
            }
        } catch (e: AddonManagerException) {
            logger.error("Failed to query extensions", e)
        }
    }

    private fun addBookmark(
        store: Store<MenuState, MenuAction>,
    ) = scope.launch {
        val browserMenuState = store.state.browserMenuState ?: return@launch

        if (browserMenuState.bookmarkState.isBookmarked) {
            return@launch
        }

        val selectedTab = browserMenuState.selectedTab
        val url = selectedTab.getUrl() ?: return@launch

        val guidToEdit = addBookmarkUseCase(
            url = url,
            title = selectedTab.content.title,
        )

        appStore.dispatch(
            BookmarkAction.BookmarkAdded(
                guidToEdit = guidToEdit,
            ),
        )

        onDismiss()
    }

    private fun addShortcut(
        store: Store<MenuState, MenuAction>,
    ) = scope.launch {
        val browserMenuState = store.state.browserMenuState ?: return@launch

        if (browserMenuState.isPinned) {
            return@launch
        }

        val numPinnedSites = pinnedSiteStorage.getPinnedSites()
            .filter { it is TopSite.Default || it is TopSite.Pinned }.size

        if (numPinnedSites >= topSitesMaxLimit) {
            alertDialogBuilder.apply {
                setTitle(R.string.shortcut_max_limit_title)
                setMessage(R.string.shortcut_max_limit_content)
                setPositiveButton(R.string.top_sites_max_limit_confirmation_button) { dialog, _ ->
                    dialog.dismiss()
                }
                create().withCenterAlignedButtons()
            }.show()

            onDismiss()

            return@launch
        }

        val selectedTab = browserMenuState.selectedTab
        val url = selectedTab.getUrl() ?: return@launch

        addPinnedSiteUseCase(
            title = selectedTab.content.title,
            url = url,
        )

        appStore.dispatch(
            AppAction.ShortcutAction.ShortcutAdded,
        )

        onDismiss()
    }

    private fun removeShortcut(
        store: Store<MenuState, MenuAction>,
    ) = scope.launch {
        val browserMenuState = store.state.browserMenuState ?: return@launch

        if (!browserMenuState.isPinned) {
            return@launch
        }

        val selectedTab = browserMenuState.selectedTab
        val url = selectedTab.getUrl() ?: return@launch
        val topSite = pinnedSiteStorage.getPinnedSites()
            .firstOrNull { it.url == url } ?: return@launch

        removePinnedSitesUseCase(topSite = topSite)

        appStore.dispatch(
            AppAction.ShortcutAction.ShortcutRemoved,
        )

        onDismiss()
    }

    private fun deleteBrowsingDataAndQuit() = scope.launch {
        onDeleteAndQuit()
        onDismiss()
    }

    private fun openInApp(
        store: Store<MenuState, MenuAction>,
    ) = scope.launch {
        val url = store.state.browserMenuState?.selectedTab?.content?.url ?: return@launch
        val redirect = appLinksUseCases.appLinkRedirect.invoke(url)

        if (!redirect.hasExternalApp()) {
            return@launch
        }

        settings.openInAppOpened = true

        redirect.appIntent?.flags = Intent.FLAG_ACTIVITY_NEW_TASK

        appLinksUseCases.openAppLink.invoke(redirect.appIntent)
    }

    private fun openInFirefox() = scope.launch {
        appStore.dispatch(AppAction.OpenInFirefoxStarted)
        onDismiss()
    }

    private fun installAddon(
        addon: Addon,
    ) = scope.launch {
        addonManager.installAddon(
            url = addon.downloadUrl,
            installationMethod = InstallationMethod.MANAGER,
            onError = { e ->
                logger.error("Failed to install addon", e)
            },
        )
    }

    private fun toggleReaderView(
        state: MenuState,
    ) = scope.launch {
        val readerState = state.browserMenuState?.selectedTab?.readerState ?: return@launch

        if (!readerState.readerable) {
            return@launch
        }

        if (readerState.active) {
            appStore.dispatch(ReaderViewAction.ReaderViewDismissed)
        } else {
            appStore.dispatch(ReaderViewAction.ReaderViewStarted)
        }

        onDismiss()
    }

    private fun customizeReaderView() = scope.launch {
        appStore.dispatch(ReaderViewAction.ReaderViewControlsShown)
        onDismiss()
    }

    private fun launchFindInPage() = scope.launch {
        appStore.dispatch(FindInPageAction.FindInPageStarted)
        onDismiss()
    }

    private fun requestSiteMode(
        tabId: String?,
        shouldRequestDesktopMode: Boolean,
    ) = scope.launch {
        if (tabId != null) {
            requestDesktopSiteUseCase(
                enable = shouldRequestDesktopMode,
                tabId = tabId,
            )
        } else {
            settings.openNextTabInDesktopMode = shouldRequestDesktopMode
        }

        onDismiss()
    }

    private fun customMenuItemAction(
        intent: PendingIntent,
        url: String?,
    ) = scope.launch {
        onSendPendingIntentWithUrl(intent, url)
        onDismiss()
    }

    companion object {
        private const val NUMBER_OF_RECOMMENDED_ADDONS_TO_SHOW = 4
    }
}
