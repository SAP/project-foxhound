/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.ui

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.unit.Dp
import mozilla.components.browser.state.state.TabSessionState
import org.mozilla.fenix.R
import org.mozilla.fenix.tabstray.Page

/**
 * An abstraction for handling the shared element transition within the Tab Manager.
 */
internal interface TabManagerAnimationHelper {

    /**
     * The currently-selected tab. Null otherwise.
     */
    val selectedTab: TabSessionState?

    /**
     * Whether the Tab Manager transition animations are enabled.
     */
    val animationsEnabled: Boolean

    /**
     * The current [TabManagerAnimationState].
     */
    var state: TabManagerAnimationState

    /**
     * Whether the Tab Manager should perform the shared element transition when it's first opened.
     */
    val shouldAnimateOnTabManagerOpen: Boolean

    /**
     * The [PaddingValues] to use in the Tab Manager which account for the visual Chrome present in
     * the screen where the Tab Manager was opened.
     *
     * Note: this should only be non-zero in the Homescreen + Browser.
     */
    val transitionPaddingValues: PaddingValues

    /**
     * Invoked to trigger the transition from the Tab Manager UI to the fullscreen thumbnail of the
     * provided [tab].
     *
     * @param tab The [TabSessionState] of the tab being transitioned to.
     */
    fun transitionToThumbnail(tab: TabSessionState)

    /**
     * Invoked to trigger the transition from the Tab Manager UI to the fullscreen thumbnail of the selected tab.
     */
    fun leaveTabManager()

    /**
     * Invoked to trigger the transition from the fullscreen thumbnail to the Tab Manager UI.
     */
    fun transitionToTabManager()
}

/**
 * An abstraction of the Tab Manager's shared element transition animation states.
 */
sealed interface TabManagerAnimationState {

    /**
     * [TabManagerAnimationState] indicating the transition from the Tab Manager to the fullscreen thumbnail
     * during the shared element transition.
     *
     * @property tab The [TabSessionState] used to obtain the thumbnail bitmap.
     */
    data class TabManagerToThumbnail(val tab: TabSessionState) : TabManagerAnimationState

    /**
     * [TabManagerAnimationState] indicating the transition from the fullscreen thumbnail to the Tab Manager
     * during the shared element transition.
     */
    data object ThumbnailToTabManager : TabManagerAnimationState
}

/**
 * The default implementation of [TabManagerAnimationHelper].
 *
 * @property selectedTab The currently-selected tab. Null otherwise.
 * @property animationsEnabled Whether the Tab Manager transition animations are enabled.
 * @param initialPage The [Page] the Tab Manager is being opened to when launched.
 * @param previousDestinationId The ID of the screen that launched the Tab Manager.
 * @param homepageAsANewTabEnabled Whether HNT is enabled and there are homepage tabs.
 * @param topToolbarHeight The height of the top toolbar in [Dp].
 * @param bottomToolbarHeight The height of the bottom toolbar in [Dp].
 */
@Suppress("LongParameterList")
class DefaultTabManagerAnimationHelper(
    override val selectedTab: TabSessionState?,
    override val animationsEnabled: Boolean,
    private val initialPage: Page,
    private val previousDestinationId: Int?,
    private val homepageAsANewTabEnabled: Boolean,
    private val topToolbarHeight: Dp,
    private val bottomToolbarHeight: Dp,
) : TabManagerAnimationHelper {

    override val shouldAnimateOnTabManagerOpen: Boolean = when {
        !animationsEnabled -> false
        // Do not transition when the Tab Manager is opening to the Synced page.
        initialPage == Page.SyncedTabs -> false
        // Do not transition when there is no selected tab.
        selectedTab == null -> false
        // Do not transition when the selected tab is Private but the Tab Manager is opening to the Normal page.
        selectedTab.content.private && initialPage == Page.NormalTabs -> false
        // Do not transition when the selected tab is Normal but the Tab Manager is opening to the Private page.
        !selectedTab.content.private && initialPage == Page.PrivateTabs -> false
        // Do not transition when the Tab Manager is opened from the Homescreen and HNT is disabled.
        previousDestinationId == R.id.homeFragment && homepageAsANewTabEnabled -> true
        // Always transition from the Browser.
        previousDestinationId == R.id.browserFragment -> true
        else -> false
    }

    /**
     * The initial [TabManagerAnimationState].
     *
     * [TabManagerAnimationState.TabManagerToThumbnail] when the animation should run,
     * [TabManagerAnimationState.ThumbnailToTabManager] otherwise.
     */
    private val initialAnimationState: TabManagerAnimationState =
        if (shouldAnimateOnTabManagerOpen && selectedTab != null) {
            TabManagerAnimationState.TabManagerToThumbnail(tab = selectedTab)
        } else {
            TabManagerAnimationState.ThumbnailToTabManager
        }

    override var state: TabManagerAnimationState by mutableStateOf(initialAnimationState)

    override val transitionPaddingValues: PaddingValues
        get() {
            val isPreviousDestinationHomeOrBrowser = previousDestinationId == R.id.homeFragment ||
                    previousDestinationId == R.id.browserFragment
            return if (isPreviousDestinationHomeOrBrowser) {
                PaddingValues(top = topToolbarHeight, bottom = bottomToolbarHeight)
            } else {
                PaddingValues()
            }
        }

    override fun leaveTabManager() {
        selectedTab ?: return
        transitionToThumbnail(tab = selectedTab)
    }

    override fun transitionToTabManager() {
        state = TabManagerAnimationState.ThumbnailToTabManager
    }

    override fun transitionToThumbnail(tab: TabSessionState) {
        state = TabManagerAnimationState.TabManagerToThumbnail(tab = tab)
    }
}
