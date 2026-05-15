/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.downloads.listscreen

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.compose.content
import androidx.lifecycle.viewModelScope
import androidx.navigation.fragment.findNavController
import mozilla.components.feature.downloads.AbstractFetchDownloadService
import mozilla.components.lib.state.helpers.StoreProvider.Companion.fragmentStore
import mozilla.components.lib.state.helpers.StoreProvider.Companion.storeProvider
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.SupportedMenuNotifications
import org.mozilla.fenix.compose.snackbar.Snackbar
import org.mozilla.fenix.compose.snackbar.SnackbarState
import org.mozilla.fenix.downloads.getCannotOpenFileErrorMessage
import org.mozilla.fenix.downloads.listscreen.di.DownloadUIMiddlewareProvider
import org.mozilla.fenix.downloads.listscreen.store.DownloadUIState
import org.mozilla.fenix.downloads.listscreen.store.DownloadUIStore
import org.mozilla.fenix.downloads.listscreen.store.FileItem
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.ext.hideToolbar
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * Fragment for displaying and managing the downloads list.
 */
class DownloadFragment : Fragment() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requireContext().applicationContext.components.appStore.dispatch(
            AppAction.MenuNotification.RemoveMenuNotification(
                SupportedMenuNotifications.Downloads,
            ),
        )
    }

    private val downloadStore by fragmentStore(DownloadUIState.INITIAL) {
        DownloadUIStore(
            initialState = it,
            middleware = DownloadUIMiddlewareProvider.provideMiddleware(
                coroutineScope = storeProvider.viewModelScope,
                applicationContext = requireContext().applicationContext,
                navController = findNavController(),
            ),
        )
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = content {
        FirefoxTheme {
            DownloadsScreen(
                downloadsStore = downloadStore,
                onItemClick = { openItem(it) },
            )
        }
    }

    private fun openItem(item: FileItem) {
        context?.let {
            val canOpenFile = AbstractFetchDownloadService.openFile(
                applicationContext = it.applicationContext,
                packageName = it.applicationContext.packageName,
                downloadFileName = item.fileName,
                downloadFilePath = item.filePath,
                downloadContentType = item.contentType,
            )

            val rootView = view
            if (!canOpenFile && rootView != null) {
                Snackbar.make(
                    snackBarParentView = rootView,
                    snackbarState = SnackbarState(
                        message = getCannotOpenFileErrorMessage(
                            context = it,
                            filePath = item.filePath,
                        ),
                    ),
                ).show()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        hideToolbar()
    }
}
