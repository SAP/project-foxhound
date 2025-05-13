/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.utils

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Build
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.PopupWindow
import androidx.annotation.VisibleForTesting
import androidx.core.view.isVisible
import com.google.android.material.snackbar.Snackbar
import mozilla.components.browser.state.selector.findCustomTab
import mozilla.components.browser.state.selector.selectedTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.base.log.logger.Logger
import mozilla.telemetry.glean.private.NoExtras
import org.mozilla.fenix.GleanMetrics.Events
import org.mozilla.fenix.R
import org.mozilla.fenix.components.FenixSnackbar
import org.mozilla.fenix.databinding.BrowserToolbarPopupWindowBinding
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.ext.isToolbarAtBottom
import java.lang.ref.WeakReference

/**
 * Since Android 12 reading the clipboard triggers an OS notification.
 * As such it is important that we do not read it prematurely and only when the user trigger a paste action.
 */
object ToolbarPopupWindow {
    /**
     * Show a contextual menu with text/URL related options.
     *
     * @param toolbarLayout Toolbar layout to anchor the popup window to.
     * @param snackbarParent Parent view to in which to show a snackbar.
     * @param customTabId ID of the custom tab, if this will be shown for a custom tab.
     * @param handlePasteAndGo Callback to handle the paste and go action.
     * @param handlePaste Callback to handle the paste action.
     * @param copyVisible Whether the copy option should be visible.
     */
    fun show(
        toolbarLayout: WeakReference<View>,
        snackbarParent: WeakReference<ViewGroup>,
        customTabId: String? = null,
        handlePasteAndGo: (String) -> Unit,
        handlePaste: (String) -> Unit,
        copyVisible: Boolean = true,
    ) {
        val context = toolbarLayout.get()?.context ?: return
        val isCustomTabSession = customTabId != null
        val clipboard = context.components.clipboardHandler

        val containsText = clipboard.containsText()
        val containsUrl = clipboard.containsURL()
        val pasteDeactivated = isCustomTabSession || (!containsText && !containsUrl)
        if (!copyVisible && pasteDeactivated) return

        val binding = BrowserToolbarPopupWindowBinding.inflate(LayoutInflater.from(context))
        val popupWindow = PopupWindow(
            binding.root,
            LinearLayout.LayoutParams.WRAP_CONTENT,
            context.resources.getDimensionPixelSize(R.dimen.context_menu_height),
            true,
        )
        popupWindow.elevation =
            context.resources.getDimension(R.dimen.mozac_browser_menu_elevation)

        // This is a workaround for SDK<23 to allow popup dismissal on outside or back button press
        // See: https://github.com/mozilla-mobile/fenix/issues/10027
        popupWindow.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        binding.copy.isVisible = copyVisible
        binding.paste.isVisible = containsText && !isCustomTabSession
        binding.pasteAndGo.isVisible = containsUrl && !isCustomTabSession

        if (copyVisible) {
            binding.copy.setOnClickListener { copyView ->
                popupWindow.dismiss()
                clipboard.text = getUrlForClipboard(
                    copyView.context.components.core.store,
                    customTabId,
                )

                // Android 13+ shows by default a popup for copied text.
                // Avoid overlapping popups informing the user when the URL is copied to the clipboard.
                // and only show our snackbar when Android will not show an indication by default.                 *
                // See https://developer.android.com/develop/ui/views/touch-and-input/copy-paste#duplicate-notifications).
                if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.S_V2) {
                    snackbarParent.get()?.let { snackbarParent ->
                        FenixSnackbar.make(
                            view = snackbarParent,
                            duration = Snackbar.LENGTH_SHORT,
                        )
                            .setText(context.getString(R.string.browser_toolbar_url_copied_to_clipboard_snackbar))
                            .show()
                    }
                }
                Events.copyUrlTapped.record(NoExtras())
            }
        }

        if (binding.paste.isVisible) {
            binding.paste.setOnClickListener {
                popupWindow.dismiss()
                handlePaste(clipboard.text.orEmpty())
            }
        }

        if (binding.pasteAndGo.isVisible) {
            binding.pasteAndGo.setOnClickListener {
                popupWindow.dismiss()
                clipboard.extractURL()?.also {
                    handlePasteAndGo(it)
                } ?: run {
                    Logger("ToolbarPopupWindow").error("Clipboard contains URL but unable to read text")
                }
            }
        }

        val popupVerticalOffset = calculatePopupVerticalOffset(context, toolbarLayout, popupWindow)

        toolbarLayout.get()?.let {
            popupWindow.showAsDropDown(
                it,
                context.resources.getDimensionPixelSize(R.dimen.context_menu_x_offset),
                popupVerticalOffset,
                Gravity.START,
            )
        }
    }

    /**
     * Calculates if the popup should be shown above or below the toolbar.
     */
    private fun calculatePopupVerticalOffset(
        context: Context,
        toolbarLayout: WeakReference<View>,
        popupWindow: PopupWindow,
    ): Int {
        return if (context.isToolbarAtBottom()) {
            toolbarLayout.get()?.let { toolbar ->
                -(toolbar.height + popupWindow.height)
            } ?: 0
        } else {
            0
        }
    }

    @VisibleForTesting
    internal fun getUrlForClipboard(
        store: BrowserStore,
        customTabId: String? = null,
    ): String? {
        return if (customTabId != null) {
            val customTab = store.state.findCustomTab(customTabId)
            customTab?.content?.url
        } else {
            val selectedTab = store.state.selectedTab
            selectedTab?.readerState?.activeUrl ?: selectedTab?.content?.url
        }
    }
}
