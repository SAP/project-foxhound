/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.contextmenu

import android.content.Context
import android.os.Environment
import android.view.View
import mozilla.components.feature.app.links.AppLinksUseCases
import mozilla.components.feature.contextmenu.ContextMenuCandidate
import mozilla.components.feature.contextmenu.ContextMenuUseCases
import mozilla.components.feature.tabs.TabsUseCases
import mozilla.components.ui.widgets.DefaultSnackbarDelegate
import mozilla.components.ui.widgets.SnackbarDelegate

/**
 * Utility for providing context menu candidates.
 */
object ContextMenuCandidates {

    /**
     * Returns a list of context menu candidates based on whether the browser is currently
     * in a Custom Tab or a standard browser session.
     *
     * @param context The current Android context.
     * @param tabsUseCases [TabsUseCases] used to interact with browser tabs (e.g., opening links).
     * @param contextMenuUseCases [ContextMenuUseCases] used to integrate other features.
     * @param appLinksUseCases [AppLinksUseCases] used to handle external application links.
     * @param snackBarParentView The [View] to be used as a parent when displaying SnackBar notifications.
     * @param snackbarDelegate [SnackbarDelegate] responsible for showing
     * SnackBars (defaults to [DefaultSnackbarDelegate]).
     * @param isCustomTab Boolean flag indicating if the menu is being requested from a Custom Tab.
     * @return A list of [ContextMenuCandidate] objects containing the relevant menu items.
     */
    fun get(
        context: Context,
        tabsUseCases: TabsUseCases,
        contextMenuUseCases: ContextMenuUseCases,
        appLinksUseCases: AppLinksUseCases,
        snackBarParentView: View,
        snackbarDelegate: SnackbarDelegate = DefaultSnackbarDelegate(),
        isCustomTab: Boolean,
    ): List<ContextMenuCandidate> {
        return if (isCustomTab) {
            getCustomTabCandidates(
                context = context,
                contextMenuUseCases = contextMenuUseCases,
                snackBarParentView = snackBarParentView,
                snackbarDelegate = snackbarDelegate,
            )
        } else {
            getBrowserCandidates(
                context = context,
                tabsUseCases = tabsUseCases,
                contextMenuUseCases = contextMenuUseCases,
                appLinksUseCases = appLinksUseCases,
                snackBarParentView = snackBarParentView,
                snackbarDelegate = snackbarDelegate,
            )
        }
    }

    private fun getCustomTabCandidates(
        context: Context,
        contextMenuUseCases: ContextMenuUseCases,
        snackBarParentView: View,
        snackbarDelegate: SnackbarDelegate,
    ): List<ContextMenuCandidate> = listOf(
        ContextMenuCandidate.createCopyLinkCandidate(context, snackBarParentView, snackbarDelegate),
        ContextMenuCandidate.createShareLinkCandidate(context),
    ) + getMediaCandidates(context, contextMenuUseCases) + listOf(
        ContextMenuCandidate.createCopyImageLocationCandidate(
            context,
            snackBarParentView,
            snackbarDelegate,
        ),
    )

    private fun getBrowserCandidates(
        context: Context,
        tabsUseCases: TabsUseCases,
        contextMenuUseCases: ContextMenuUseCases,
        appLinksUseCases: AppLinksUseCases,
        snackBarParentView: View,
        snackbarDelegate: SnackbarDelegate,
    ): List<ContextMenuCandidate> = listOf(
        ContextMenuCandidate.createOpenInPrivateTabCandidate(
            context,
            tabsUseCases,
            snackBarParentView,
            snackbarDelegate,
        ),
        ContextMenuCandidate.createCopyLinkCandidate(context, snackBarParentView, snackbarDelegate),
        ContextMenuCandidate.createDownloadLinkCandidate(
            context = context,
            contextMenuUseCases = contextMenuUseCases,
            downloadsLocation = ::getDownloadsDirectory,
        ),
        ContextMenuCandidate.createShareLinkCandidate(context),
        ContextMenuCandidate.createShareImageCandidate(context, contextMenuUseCases),
        ContextMenuCandidate.createOpenImageInNewTabCandidate(
            context,
            tabsUseCases,
            snackBarParentView,
            snackbarDelegate,
        ),
    ) + getMediaCandidates(context, contextMenuUseCases) + listOf(
        ContextMenuCandidate.createCopyImageLocationCandidate(
            context,
            snackBarParentView,
            snackbarDelegate,
        ),
        ContextMenuCandidate.createAddContactCandidate(context),
        ContextMenuCandidate.createShareEmailAddressCandidate(context),
        ContextMenuCandidate.createCopyEmailAddressCandidate(
            context,
            snackBarParentView,
            snackbarDelegate,
        ),
        ContextMenuCandidate.createOpenInExternalAppCandidate(context, appLinksUseCases),
    )

    private fun getMediaCandidates(
        context: Context,
        contextMenuUseCases: ContextMenuUseCases,
    ): List<ContextMenuCandidate> = listOf(
        ContextMenuCandidate.createSaveImageCandidate(
            context = context,
            contextMenuUseCases = contextMenuUseCases,
            downloadsLocation = ::getDownloadsDirectory,
        ),
        ContextMenuCandidate.createSaveVideoAudioCandidate(
            context = context,
            contextMenuUseCases = contextMenuUseCases,
            downloadsLocation = ::getDownloadsDirectory,
        ),
    )

    private fun getDownloadsDirectory(): String =
        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).path
}
