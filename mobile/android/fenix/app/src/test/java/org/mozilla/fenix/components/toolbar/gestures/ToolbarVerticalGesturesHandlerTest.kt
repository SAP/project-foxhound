/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.toolbar.gestures

import android.graphics.PointF
import android.view.View
import androidx.core.graphics.Insets
import androidx.core.view.WindowInsetsCompat
import androidx.navigation.NavController
import androidx.navigation.NavDestination
import androidx.navigation.NavDirections
import androidx.navigation.NavOptions
import io.mockk.every
import io.mockk.mockk
import io.mockk.spyk
import io.mockk.verify
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.GleanMetrics.Events
import org.mozilla.fenix.R
import org.mozilla.fenix.browser.BrowserFragmentDirections
import org.mozilla.fenix.browser.browsingmode.BrowsingMode
import org.mozilla.fenix.browser.browsingmode.BrowsingMode.Normal
import org.mozilla.fenix.browser.browsingmode.BrowsingMode.Private
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.components.appstate.search.SearchState
import org.mozilla.fenix.components.toolbar.ToolbarPosition
import org.mozilla.fenix.components.toolbar.ToolbarPosition.BOTTOM
import org.mozilla.fenix.components.toolbar.ToolbarPosition.TOP
import org.mozilla.fenix.helpers.FenixGleanTestRule
import org.mozilla.fenix.tabstray.redux.state.Page
import org.mozilla.fenix.tabstray.ui.AccessPoint
import org.robolectric.ParameterizedRobolectricTestRunner
import kotlin.test.assertNotNull
import org.mozilla.fenix.components.toolbar.gestures.ToolbarVerticalGesturesHandlerTest.ToolbarVerticalGesturesHandlerTestScenario as Scenario
import org.mozilla.fenix.components.toolbar.gestures.ToolbarVerticalGesturesHandlerTest.ToolbarVerticalGesturesHandlerTestSwipe as Swipe

private const val SCREEN_HEIGHT = 2050
private const val SCREEN_WIDTH = 1080
private const val TOOLBAR_HEIGHT = 100

@RunWith(ParameterizedRobolectricTestRunner::class)
class ToolbarVerticalGesturesHandlerTest(private val scenario: Scenario) {
    @get:Rule
    val gleanTestRule = FenixGleanTestRule(testContext)

    private val toolbarLayout = spyk(View(testContext))
    private var navbarLayout: View? = null
    private val appStore = AppStore(
        AppState(
            mode = scenario.browsingMode,
            searchState = SearchState.EMPTY.copy(isSearchActive = scenario.isSearchActive),
        ),
    )
    private val navController: NavController = mockk(relaxed = true)

    @Before
    fun setup() {
        every { toolbarLayout.height } returns when (scenario.isNavbarShown && scenario.toolbarPosition == BOTTOM) {
            true -> TOOLBAR_HEIGHT * 2
            else -> TOOLBAR_HEIGHT
        }
        every { toolbarLayout.width } returns SCREEN_WIDTH
        if (scenario.isNavbarShown && scenario.toolbarPosition == TOP) {
            navbarLayout = spyk(View(testContext)).also {
                every { it.height } returns TOOLBAR_HEIGHT
                every { it.width } returns SCREEN_WIDTH
            }
        }

        val mockDestination: NavDestination = mockk()
        every { mockDestination.id } returns R.id.browserFragment
        every { navController.currentDestination } returns mockDestination

        val rootView = spyk(View(testContext)).also {
            every { it.height } returns SCREEN_HEIGHT
            every { it.getLocationOnScreen(any()) } answers {
                val locationArray = arg<IntArray>(0)
                locationArray[0] = 0
                locationArray[1] = 0
            }
        }
        every { toolbarLayout.rootView } returns rootView

        every { toolbarLayout.rootWindowInsets } returns WindowInsetsCompat.Builder()
            .setInsets(
                WindowInsetsCompat.Type.systemGestures(),
                Insets.of(0, 0, 0, scenario.systemGestureInsetBottom),
            )
            .build()
            .toWindowInsets()
    }

    @Test
    fun test() {
        positionToolbar()
        positionNavbar()
        val gesturesHandler = ToolbarVerticalGesturesHandler(
            appStore = appStore,
            toolbarLayout = toolbarLayout,
            navBarLayout = navbarLayout,
            toolbarPosition = scenario.toolbarPosition,
            navController = navController,
        )
        val expectedTabsTrayNavigations = if (scenario.shouldOpenTabsTray) 1 else 0
        val expectedTabsTrayPage = if (scenario.browsingMode.isPrivate) { Page.PrivateTabs } else { Page.NormalTabs }

        gesturesHandler.onSwipeStarted(
            start = scenario.initialSwipe.start,
            next = scenario.initialSwipe.end,
        )

        scenario.followupSwipe?.let {
            gesturesHandler.onSwipeStarted(
                start = it.start,
                next = it.end,
            )
        }

        if (expectedTabsTrayNavigations > 0) {
            assertNotNull(Events.toolbarTabstraySwipe.testGetValue())

            verify(exactly = expectedTabsTrayNavigations) {
                navController.navigate(
                    BrowserFragmentDirections.actionGlobalTabManagementFragment(
                        enterMultiselect = false,
                        page = expectedTabsTrayPage,
                        accessPoint = AccessPoint.None,
                    ),
                    null,
                )
            }
        } else {
            assertNull(Events.toolbarTabstraySwipe.testGetValue())

            verify(exactly = 0) { navController.navigate(any<NavDirections>(), anyNullable<NavOptions?>()) }
        }
    }

    private fun positionToolbar() {
        every { toolbarLayout.getLocationInWindow(any()) } answers {
            // Get the IntArray argument passed to the method.
            val locationArray = arg<IntArray>(0)

            locationArray[0] = 0
            locationArray[1] = when (scenario.toolbarPosition) {
                TOP -> 0
                BOTTOM -> SCREEN_HEIGHT - toolbarLayout.height
            }
        }
    }

    private fun positionNavbar() {
        if (navbarLayout != null) {
            every { navbarLayout!!.getLocationInWindow(any()) } answers {
                // Get the IntArray argument passed to the method.
                val locationArray = arg<IntArray>(0)

                locationArray[0] = 0
                locationArray[1] = SCREEN_HEIGHT - toolbarLayout.height
            }
        }
    }

    companion object {
        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}")
        fun scenarios(): List<Scenario> = listOf(
            // Swipe in all directions on the top toolbar with no navbar.
            TopToolbarSwipe.copy(
                initialSwipe = swipeDown(fromScreenTop = true),
                shouldOpenTabsTray = true,
            ),
            TopToolbarSwipe.copy(
                initialSwipe = swipeDown(fromScreenTop = true),
                browsingMode = Private,
                shouldOpenTabsTray = true,
            ),
            TopToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = true),
                shouldOpenTabsTray = false,
            ),
            TopToolbarSwipe.copy(
                initialSwipe = swipeLeft(fromScreenTop = true),
                shouldOpenTabsTray = false,
            ),
            TopToolbarSwipe.copy(
                initialSwipe = swipeRight(fromScreenTop = false),
                shouldOpenTabsTray = false,
            ),
            // Swipe in all directions on the top toolbar with navbar also shown.
            // Even with the navbar shown swiping down on the top toolbar should still show the tabs tray.
            TopToolbarSwipe.copy(
                initialSwipe = swipeDown(fromScreenTop = true),
                isNavbarShown = true,
                shouldOpenTabsTray = true,
            ),
            TopToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = true),
                isNavbarShown = true,
                shouldOpenTabsTray = false,
            ),
            TopToolbarSwipe.copy(
                initialSwipe = swipeLeft(fromScreenTop = true),
                isNavbarShown = true,
                shouldOpenTabsTray = false,
            ),
            TopToolbarSwipe.copy(
                initialSwipe = swipeRight(fromScreenTop = false),
                isNavbarShown = true,
                shouldOpenTabsTray = false,
            ),
            // Swipe in all directions on the navbar toolbar while the toolbar is also shown at the bottom.
            BottomToolbarSwipe.copy(
                initialSwipe = swipeDown(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2),
                isNavbarShown = true,
                shouldOpenTabsTray = false,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2),
                isNavbarShown = true,
                shouldOpenTabsTray = true,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2),
                isNavbarShown = true,
                browsingMode = Private,
                shouldOpenTabsTray = true,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeLeft(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2),
                isNavbarShown = true,
                shouldOpenTabsTray = false,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeRight(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2),
                isNavbarShown = true,
                shouldOpenTabsTray = false,
            ),
            // Swipe in all directions on the bottom toolbar while the navbar is also shown.
            BottomToolbarSwipe.copy(
                initialSwipe = swipeDown(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2, yOffset = -TOOLBAR_HEIGHT),
                isNavbarShown = true,
                shouldOpenTabsTray = false,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2, yOffset = -TOOLBAR_HEIGHT),
                isNavbarShown = true,
                shouldOpenTabsTray = true,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2, yOffset = -TOOLBAR_HEIGHT),
                isNavbarShown = true,
                browsingMode = Private,
                shouldOpenTabsTray = true,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeLeft(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2, yOffset = -TOOLBAR_HEIGHT),
                isNavbarShown = true,
                shouldOpenTabsTray = false,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeRight(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2, yOffset = -TOOLBAR_HEIGHT),
                isNavbarShown = true,
                shouldOpenTabsTray = false,
            ),
            // Swipe in all directions on the bottom toolbar with navbar not shown.
            BottomToolbarSwipe.copy(
                initialSwipe = swipeDown(fromScreenTop = false),
                isNavbarShown = false,
                shouldOpenTabsTray = false,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = false),
                isNavbarShown = false,
                shouldOpenTabsTray = true,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = false),
                isNavbarShown = false,
                browsingMode = Private,
                shouldOpenTabsTray = true,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeLeft(fromScreenTop = false),
                isNavbarShown = false,
                shouldOpenTabsTray = false,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeRight(fromScreenTop = false),
                isNavbarShown = false,
                shouldOpenTabsTray = false,
            ),
            // ///////////////////////////////////////////////////////////////////////////////////
            // Scenarios where the swipe starts inside the bottom system gesture inset region. //
            // A swipe up from the very bottom edge is the OS "go home/background" gesture and  //
            // must not open the tabs tray, while a swipe starting above the inset still should. //
            // ///////////////////////////////////////////////////////////////////////////////////
            // Swipe up from the bottom edge of the bottom toolbar with navbar not shown.
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = false),
                isNavbarShown = false,
                systemGestureInsetBottom = TOOLBAR_HEIGHT - 10,
                shouldOpenTabsTray = false,
            ),
            // Swipe up from the bottom edge while the navbar is also shown.
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2),
                isNavbarShown = true,
                systemGestureInsetBottom = TOOLBAR_HEIGHT - 10,
                shouldOpenTabsTray = false,
            ),
            // Swipe up starting above the inset still opens the tabs tray even when an inset is present.
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2, yOffset = -TOOLBAR_HEIGHT),
                isNavbarShown = true,
                systemGestureInsetBottom = TOOLBAR_HEIGHT - 10,
                shouldOpenTabsTray = true,
            ),
            // ///////////////////////////////////////////////////////////////////////////////////
            // Scenarios where a search is active. The toolbar expands over the search results, //
            // so an otherwise valid swipe must not open the tabs tray.                         //
            // ///////////////////////////////////////////////////////////////////////////////////
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = false),
                isNavbarShown = false,
                isSearchActive = true,
                shouldOpenTabsTray = false,
            ),
            TopToolbarSwipe.copy(
                initialSwipe = swipeDown(fromScreenTop = true),
                isSearchActive = true,
                shouldOpenTabsTray = false,
            ),
            // /////////////////////////////////////////////////////////////
            // Scenarios where the initial vertical swipe is not enough. //
            // /////////////////////////////////////////////////////////////
            // Swipe vertically on the top toolbar with no navbar.
            TopToolbarSwipe.copy(
                initialSwipe = swipeDown(fromScreenTop = true, swipeDistance = 10),
                shouldOpenTabsTray = false,
            ),
            TopToolbarSwipe.copy(
                initialSwipe = swipeDown(fromScreenTop = true, swipeDistance = 10),
                browsingMode = Private,
                shouldOpenTabsTray = false,
            ),
            TopToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = true, swipeDistance = 10),
                shouldOpenTabsTray = false,
            ),
            // Swipe vertically on the top toolbar with navbar also shown.
            // If the navbar is shown then top toolbar swiped should not show the tabs tray.
            TopToolbarSwipe.copy(
                initialSwipe = swipeDown(fromScreenTop = true, swipeDistance = 10),
                isNavbarShown = true,
                shouldOpenTabsTray = false,
            ),
            TopToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = true, swipeDistance = 10),
                isNavbarShown = true,
                shouldOpenTabsTray = false,
            ),
            // Swipe vertically on the navbar toolbar while the toolbar is also shown at the bottom.
            BottomToolbarSwipe.copy(
                initialSwipe = swipeDown(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2, swipeDistance = 10),
                isNavbarShown = true,
                shouldOpenTabsTray = false,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2, swipeDistance = 10),
                isNavbarShown = true,
                shouldOpenTabsTray = false,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2, swipeDistance = 10),
                isNavbarShown = true,
                browsingMode = Private,
                shouldOpenTabsTray = false,
            ),
            // Swipe vertically on the bottom toolbar while the navbar is also shown.
            BottomToolbarSwipe.copy(
                initialSwipe = swipeDown(
                    fromScreenTop = false,
                    toolbarHeight = TOOLBAR_HEIGHT * 2,
                    swipeDistance = 10,
                    yOffset = -TOOLBAR_HEIGHT,
                ),
                isNavbarShown = true,
                shouldOpenTabsTray = false,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(
                    fromScreenTop = false,
                    toolbarHeight = TOOLBAR_HEIGHT * 2,
                    swipeDistance = 10,
                    yOffset = -TOOLBAR_HEIGHT,
                ),
                isNavbarShown = true,
                shouldOpenTabsTray = false,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(
                    fromScreenTop = false,
                    toolbarHeight = TOOLBAR_HEIGHT * 2,
                    swipeDistance = 10,
                    yOffset = -TOOLBAR_HEIGHT,
                ),
                isNavbarShown = true,
                browsingMode = Private,
                shouldOpenTabsTray = false,
            ),
            // Swipe vertically on the bottom toolbar with navbar not shown.
            BottomToolbarSwipe.copy(
                initialSwipe = swipeDown(fromScreenTop = false, swipeDistance = 10),
                isNavbarShown = false,
                shouldOpenTabsTray = false,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = false, swipeDistance = 10),
                isNavbarShown = false,
                shouldOpenTabsTray = false,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = false, swipeDistance = 10),
                isNavbarShown = false,
                browsingMode = Private,
                shouldOpenTabsTray = false,
            ),
            // /////////////////////////////////////////////////////////////////////////////////////////////////////////
            // Scenarios where the initial vertical swipe is not enough so a new one is needed to open the tabs tray //
            // /////////////////////////////////////////////////////////////////////////////////////////////////////////
            // Swipe vertically on the top toolbar with no navbar.
            TopToolbarSwipe.copy(
                initialSwipe = swipeDown(fromScreenTop = true, swipeDistance = 10),
                followupSwipe = swipeDown(fromScreenTop = true, swipeDistance = 40),
                shouldOpenTabsTray = true,
            ),
            TopToolbarSwipe.copy(
                initialSwipe = swipeDown(fromScreenTop = true, swipeDistance = 10),
                followupSwipe = swipeDown(fromScreenTop = true, swipeDistance = 40),
                browsingMode = Private,
                shouldOpenTabsTray = true,
            ),
            TopToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = true, swipeDistance = 10),
                followupSwipe = swipeUp(fromScreenTop = true, swipeDistance = 40),
                shouldOpenTabsTray = false,
            ),
            // Swipe vertically on the top toolbar with navbar also shown.
            // Even with the navbar shown swiping down on the top toolbar should still show the tabs tray.
            TopToolbarSwipe.copy(
                initialSwipe = swipeDown(fromScreenTop = true, swipeDistance = 10),
                followupSwipe = swipeDown(fromScreenTop = true, swipeDistance = 40),
                isNavbarShown = true,
                shouldOpenTabsTray = true,
            ),
            TopToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = true, swipeDistance = 10),
                followupSwipe = swipeUp(fromScreenTop = true, swipeDistance = 40),
                isNavbarShown = true,
                shouldOpenTabsTray = false,
            ),
            // Swipe vertically on the navbar toolbar while the toolbar is also shown at the bottom.
            BottomToolbarSwipe.copy(
                initialSwipe = swipeDown(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2, swipeDistance = 10),
                followupSwipe = swipeDown(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2, swipeDistance = 40),
                isNavbarShown = true,
                shouldOpenTabsTray = false,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2, swipeDistance = 10),
                followupSwipe = swipeUp(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2, swipeDistance = 40),
                isNavbarShown = true,
                shouldOpenTabsTray = true,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2, swipeDistance = 10),
                followupSwipe = swipeUp(fromScreenTop = false, toolbarHeight = TOOLBAR_HEIGHT * 2, swipeDistance = 40),
                isNavbarShown = true,
                browsingMode = Private,
                shouldOpenTabsTray = true,
            ),
            // Swipe vertically on the bottom toolbar while the navbar is also shown.
            BottomToolbarSwipe.copy(
                initialSwipe = swipeDown(
                    fromScreenTop = false,
                    toolbarHeight = TOOLBAR_HEIGHT * 2,
                    swipeDistance = 10,
                    yOffset = -TOOLBAR_HEIGHT,
                ),
                followupSwipe = swipeDown(
                    fromScreenTop = false,
                    toolbarHeight = TOOLBAR_HEIGHT * 2,
                    swipeDistance = 40,
                    yOffset = -TOOLBAR_HEIGHT,
                ),
                isNavbarShown = true,
                shouldOpenTabsTray = false,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(
                    fromScreenTop = false,
                    toolbarHeight = TOOLBAR_HEIGHT * 2,
                    swipeDistance = 10,
                    yOffset = -TOOLBAR_HEIGHT,
                ),
                followupSwipe = swipeUp(
                    fromScreenTop = false,
                    toolbarHeight = TOOLBAR_HEIGHT * 2,
                    swipeDistance = 40,
                    yOffset = -TOOLBAR_HEIGHT,
                ),
                isNavbarShown = true,
                shouldOpenTabsTray = true,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(
                    fromScreenTop = false,
                    toolbarHeight = TOOLBAR_HEIGHT * 2,
                    swipeDistance = 10,
                    yOffset = -TOOLBAR_HEIGHT,
                ),
                followupSwipe = swipeUp(
                    fromScreenTop = false,
                    toolbarHeight = TOOLBAR_HEIGHT * 2,
                    swipeDistance = 40,
                    yOffset = -TOOLBAR_HEIGHT,
                ),
                isNavbarShown = true,
                browsingMode = Private,
                shouldOpenTabsTray = true,
            ),
            // Swipe vertically on the bottom toolbar with navbar not shown.
            BottomToolbarSwipe.copy(
                initialSwipe = swipeDown(fromScreenTop = false, swipeDistance = 10),
                followupSwipe = swipeDown(fromScreenTop = false, swipeDistance = 40),
                isNavbarShown = false,
                shouldOpenTabsTray = false,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = false, swipeDistance = 10),
                followupSwipe = swipeUp(fromScreenTop = false, swipeDistance = 40),
                isNavbarShown = false,
                shouldOpenTabsTray = true,
            ),
            BottomToolbarSwipe.copy(
                initialSwipe = swipeUp(fromScreenTop = false, swipeDistance = 10),
                followupSwipe = swipeUp(fromScreenTop = false, swipeDistance = 40),
                isNavbarShown = false,
                browsingMode = Private,
                shouldOpenTabsTray = true,
            ),
        )

        private val TopToolbarSwipe = Scenario(
            toolbarPosition = TOP,
            isNavbarShown = false,
            browsingMode = Normal,
            initialSwipe = Swipe(
                start = PointF(0f, 10f),
                end = PointF(0f, 50f),
            ),
            shouldOpenTabsTray = true,
        )

        private val BottomToolbarSwipe = Scenario(
            toolbarPosition = BOTTOM,
            isNavbarShown = false,
            browsingMode = Normal,
            initialSwipe = Swipe(
                start = PointF(0f, 10f),
                end = PointF(0f, 50f),
            ),
            shouldOpenTabsTray = true,
        )

        private fun swipeDown(
            fromScreenTop: Boolean,
            toolbarHeight: Int = TOOLBAR_HEIGHT,
            swipeDistance: Int = TOOLBAR_HEIGHT / 2,
            yOffset: Int = 0,
        ): Swipe {
            val start = when (fromScreenTop) {
                true -> PointF(SCREEN_WIDTH / 2f, 10f)
                else -> PointF(SCREEN_WIDTH / 2f, SCREEN_HEIGHT - toolbarHeight + 10f)
            }
            return Swipe(
                start = start.apply {
                    offset(0f, yOffset.toFloat())
                },
                end = PointF(start.x + 5, start.y + swipeDistance).apply {
                    offset(0f, yOffset.toFloat())
                },
            )
        }

        private fun swipeUp(
            fromScreenTop: Boolean,
            toolbarHeight: Int = TOOLBAR_HEIGHT,
            swipeDistance: Int = TOOLBAR_HEIGHT / 2,
            yOffset: Int = 0,
        ): Swipe {
            val start = when (fromScreenTop) {
                true -> PointF(SCREEN_WIDTH / 2f, toolbarHeight - 10f)
                false -> PointF(SCREEN_WIDTH / 2f, SCREEN_HEIGHT - 10f)
            }
            return Swipe(
                start = PointF(start.x, start.y + yOffset),
                end = PointF(start.x - 5f, start.y + yOffset - swipeDistance),
            )
        }

        private fun swipeLeft(
            fromScreenTop: Boolean,
            toolbarHeight: Int = TOOLBAR_HEIGHT,
            yOffset: Int = 0,
        ): Swipe {
            val start = when (fromScreenTop) {
                true -> PointF(SCREEN_WIDTH / 2f, 10f)
                else -> PointF(SCREEN_WIDTH / 2f, SCREEN_HEIGHT - toolbarHeight + 10f)
            }
            return Swipe(
                start = start.apply {
                    offset(0f, yOffset.toFloat())
                },
                end = PointF(start.x - 50, start.y - 5f).apply {
                    offset(0f, yOffset.toFloat())
                },
            )
        }

        private fun swipeRight(
            fromScreenTop: Boolean,
            toolbarHeight: Int = TOOLBAR_HEIGHT,
            yOffset: Int = 0,
        ): Swipe {
            val start = when (fromScreenTop) {
                true -> PointF(SCREEN_WIDTH / 2f, 10f)
                else -> PointF(SCREEN_WIDTH / 2f, SCREEN_HEIGHT - toolbarHeight + 10f)
            }
            return Swipe(
                start = start.apply {
                    offset(0f, yOffset.toFloat())
                },
                end = PointF(start.x + 50, start.y + 5f).apply {
                    offset(0f, yOffset.toFloat())
                },
            )
        }
    }

    data class ToolbarVerticalGesturesHandlerTestScenario(
        val toolbarPosition: ToolbarPosition,
        val isNavbarShown: Boolean,
        val browsingMode: BrowsingMode,
        val initialSwipe: Swipe,
        val followupSwipe: Swipe? = null,
        val systemGestureInsetBottom: Int = 0,
        val isSearchActive: Boolean = false,
        val shouldOpenTabsTray: Boolean,
    )

    data class ToolbarVerticalGesturesHandlerTestSwipe(
        val start: PointF,
        val end: PointF,
    )
}
