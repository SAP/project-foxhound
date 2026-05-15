/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser

import android.view.View
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.compose.ui.res.stringResource
import androidx.coordinatorlayout.widget.CoordinatorLayout
import androidx.core.view.isVisible
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChangedBy
import kotlinx.coroutines.flow.map
import mozilla.components.browser.state.selector.selectedTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.lib.state.ext.flowScoped
import mozilla.components.lib.state.ext.observeAsComposableState
import mozilla.components.lib.state.helpers.AbstractBinding
import mozilla.components.support.utils.KeyboardState
import mozilla.components.support.utils.keyboardAsState
import org.mozilla.fenix.R
import org.mozilla.fenix.browser.store.BrowserScreenState
import org.mozilla.fenix.browser.store.BrowserScreenStore
import org.mozilla.fenix.databinding.FragmentBrowserBinding
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.translations.TranslationToolbar

/**
 * Helper for showing the translations banner.
 *
 * @param browserStore [BrowserStore] to sync browser state changes from.
 * @param browserScreenStore [BrowserScreenStore] to sync the current translations status from.
 * @param binding [FragmentBrowserBinding] to inflate the banner into when needed.
 * @param onExpand invoked when user wants to expand the translations controls.
 * @param mainDispatcher The [CoroutineDispatcher] on which the state observation and updates will occur.
 *                       Defaults to [Dispatchers.Main].
 */
class TranslationsBannerIntegration(
    private val browserStore: BrowserStore,
    private val browserScreenStore: BrowserScreenStore,
    private val binding: FragmentBrowserBinding,
    private val onExpand: () -> Unit = {},
    mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
) : AbstractBinding<BrowserScreenState>(browserScreenStore, mainDispatcher) {

    private var browserFlowScope: CoroutineScope? = null

    private val translationsBanner: ComposeView?
        get() = (binding.root.findViewById<View>(R.id.translationsBanner) as? ComposeView)

    override fun stop() {
        super.stop()
        closeBrowserFlowScope()
    }

    override suspend fun onState(flow: Flow<BrowserScreenState>) {
        flow.distinctUntilChangedBy { it.pageTranslationStatus.isTranslated }
            .collect {
                if (it.pageTranslationStatus.isTranslated) {
                    observeFullScreenMediaState()
                    getViewOrInflate().let { banner ->
                        banner.isVisible = true
                        banner.behavior = TranslationsBannerBehavior<View>(
                            context = banner.context,
                            isAddressBarAtBottom = banner.settings().shouldUseBottomToolbar,
                            isNavBarShown = banner.context.settings().shouldUseExpandedToolbar,
                        )
                    }
                } else {
                    closeBrowserFlowScope()
                    // Ensure we're not inflating the stub just to hide it.
                    dismissBanner()
                }
            }
    }

    private fun observeFullScreenMediaState() {
        browserFlowScope = browserStore.flowScoped(dispatcher = mainDispatcher) { flow ->
            flow.map { state -> state.selectedTab?.mediaSessionState }
                .distinctUntilChangedBy { it?.fullscreen }
                .collect { mediaSessionState ->
                    val isInFullScreen = mediaSessionState?.fullscreen == true
                    translationsBanner?.apply {
                            isVisible = !isInFullScreen
                            if (!isInFullScreen) {
                                (behavior as TranslationsBannerBehavior).forceExpand(this)
                            }
                        }
                }
        }
    }

    private fun closeBrowserFlowScope() {
        browserFlowScope?.cancel()
        browserFlowScope = null
    }

    private fun dismissBanner() {
        translationsBanner?.apply {
            isVisible = false
            behavior = null
            disposeComposition()
        }
    }

    @Composable
    private fun TranslationsBannerHost() {
        val sourceLanguage = browserScreenStore.observeAsComposableState {
            it.pageTranslationStatus.fromSelectedLanguage?.localizedDisplayName ?: ""
        }.value
        val targetLanguage = browserScreenStore.observeAsComposableState {
            it.pageTranslationStatus.toSelectedLanguage?.localizedDisplayName ?: ""
        }.value

        val keyboardState by keyboardAsState()
        val isKeyboardVisible = keyboardState == KeyboardState.Opened

        if (!isKeyboardVisible) {
            FirefoxTheme {
                TranslationToolbar(
                    label = stringResource(
                        R.string.translation_toolbar_translated_from_and_to,
                        sourceLanguage,
                        targetLanguage,
                    ),
                    onExpand = onExpand,
                    onClose = {
                        closeBrowserFlowScope()
                        dismissBanner()
                    },
                )
            }
        }
    }

    private fun getViewOrInflate() = binding.root.findViewById(R.id.translationsBanner)
        ?: binding.translationsBannerStub.inflate().also {
            (it as? ComposeView)?.apply {
                setContent { TranslationsBannerHost() }
                setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed)
            }
        }

    private var View.behavior: CoordinatorLayout.Behavior<View>?
        get() = (layoutParams as? CoordinatorLayout.LayoutParams)?.behavior
        set(value) {
            (layoutParams as? CoordinatorLayout.LayoutParams)?.behavior = value
        }
}
