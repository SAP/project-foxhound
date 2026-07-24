/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.toolbar

import android.content.Context
import android.view.ViewGroup
import android.view.ViewTreeObserver
import androidx.coordinatorlayout.widget.CoordinatorLayout
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import junit.framework.TestCase.assertEquals
import mozilla.components.concept.engine.EngineView
import mozilla.components.feature.pwa.feature.WebAppHideToolbarFeature
import mozilla.components.feature.session.FullScreenFeature
import org.junit.Before
import org.junit.Test
import org.mozilla.fenix.utils.Settings
import mozilla.components.compose.browser.toolbar.R as toolbarR

class ToolbarsIntegrationTest {
    private val fullScreenFeature: FullScreenFeature = mockk(relaxed = true)
    private val webAppHideToolbarFeature: WebAppHideToolbarFeature = mockk(relaxed = true)
    private val settings: Settings = mockk(relaxed = true)

    private val context: Context = mockk(relaxed = true)
    private val browserLayout: ViewGroup = mockk(relaxed = true)
    private val engineView: EngineView = mockk(relaxed = true)
    private val toolbar: FenixBrowserToolbarView = mockk(relaxed = true)
    private val navbar: BrowserNavigationBar = mockk(relaxed = true)
    private val onToolbarsReset: () -> Unit = mockk(relaxed = true)

    private val topToolbarHeight = 150
    private val minimalBottomToolbarHeight = 32
    private val layoutParams: CoordinatorLayout.LayoutParams = mockk(relaxed = true)
    private val viewTreeObserver: ViewTreeObserver = mockk(relaxed = true)

    private lateinit var toolbarsIntegration: ToolbarsIntegration

    @Before
    fun setUp() {
        every { browserLayout.context } returns context
        every { browserLayout.layoutParams } returns layoutParams
        every { browserLayout.viewTreeObserver } returns viewTreeObserver
        every { browserLayout.resources } returns mockk(relaxed = true) {
            every {
                getDimensionPixelSize(toolbarR.dimen.mozac_minimal_display_toolbar_height)
            } returns minimalBottomToolbarHeight
        }
        layoutParams.behavior = mockk(relaxed = true)

        toolbarsIntegration = ToolbarsIntegration(
            fullScreenFeature = { fullScreenFeature },
            webAppHideToolbarFeature = { webAppHideToolbarFeature },
            settings = settings,
            browserLayout = browserLayout,
            engineView = engineView,
            toolbar = toolbar,
            topToolbarHeight = { topToolbarHeight },
            onToolbarsReset = onToolbarsReset,
        )
    }

    @Test
    fun `GIVEN fullscreen is active WHEN keyboard is shown THEN do nothing`() {
        every { fullScreenFeature.isFullScreen } returns true
        // Set some initial margins to then check they are not changed.
        layoutParams.topMargin = 23
        layoutParams.bottomMargin = 32

        toolbarsIntegration.onKeyboardShown(isKeyboardShown = true)

        verify(exactly = 0) { onToolbarsReset() }
        verify(exactly = 0) { toolbar.enableScrolling() }
        assertEquals(23, layoutParams.topMargin)
        assertEquals(32, layoutParams.bottomMargin)
    }

    @Test
    fun `GIVEN web app toolbar should be hidden WHEN keyboard is shown THEN do nothing`() {
        every { webAppHideToolbarFeature.shouldToolbarsBeVisible } returns false
        // Set some initial margins to then check they are not changed.
        layoutParams.topMargin = 34
        layoutParams.bottomMargin = 45

        toolbarsIntegration.onKeyboardShown(isKeyboardShown = true)

        verify(exactly = 0) { onToolbarsReset() }
        assertEquals(34, layoutParams.topMargin)
        assertEquals(45, layoutParams.bottomMargin)
    }

    @Test
    fun `GIVEN a normal state WHEN keyboard is hidden THEN margins should be zeroed and toolbars reset`() {
        every { fullScreenFeature.isFullScreen } returns false
        every { webAppHideToolbarFeature.shouldToolbarsBeVisible } returns true
        // Set initial margins to non-zero values to ensure they are changed
        layoutParams.topMargin = 100
        layoutParams.bottomMargin = 100

        toolbarsIntegration.onKeyboardShown(isKeyboardShown = false)

        assertEquals(0, layoutParams.topMargin)
        assertEquals(0, layoutParams.bottomMargin)
        verify { onToolbarsReset() }
        verify { toolbar.enableScrolling() }
    }

    @Test
    fun `GIVEN a top toolbar WHEN keyboard is shown THEN restore margins for top toolbar`() {
        every { fullScreenFeature.isFullScreen } returns false
        every { webAppHideToolbarFeature.shouldToolbarsBeVisible } returns true
        every { settings.shouldUseBottomToolbar } returns false
        every { browserLayout.translationY } returns 1f

        toolbarsIntegration.onKeyboardShown(isKeyboardShown = true)

        verify { layoutParams.behavior = null }
        assertEquals(0, layoutParams.topMargin)
        assertEquals(topToolbarHeight, layoutParams.bottomMargin)
        verify { engineView.setDynamicToolbarMaxHeight(0) }
        verify { engineView.setVerticalClipping(0) }
        verify { toolbar.disableScrolling() }
        verify { toolbar.expand() }
    }

    @Test
    fun `GIVEN a bottom toolbar WHEN keyboard is shown THEN restore margins for bottom toolbar`() {
        every { fullScreenFeature.isFullScreen } returns false
        every { webAppHideToolbarFeature.shouldToolbarsBeVisible } returns true
        every { settings.shouldUseBottomToolbar } returns true
        every { browserLayout.translationY } returns 1f

        toolbarsIntegration.onKeyboardShown(isKeyboardShown = true)

        verify { layoutParams.behavior = null }
        assertEquals(0, layoutParams.topMargin)
        assertEquals(minimalBottomToolbarHeight, layoutParams.bottomMargin)
        verify { engineView.setDynamicToolbarMaxHeight(0) }
        verify { engineView.setVerticalClipping(0) }
        verify { toolbar.disableScrolling() }
        verify { toolbar.expand() }
    }
}
