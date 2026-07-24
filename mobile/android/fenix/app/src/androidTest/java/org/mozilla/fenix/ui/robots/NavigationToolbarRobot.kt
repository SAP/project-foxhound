/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:Suppress("TooManyFunctions")

package org.mozilla.fenix.ui.robots

import android.net.Uri
import android.util.Log
import android.view.KeyEvent
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotDisplayed
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.junit4.ComposeTestRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performImeAction
import androidx.compose.ui.test.performTouchInput
import androidx.test.espresso.AppNotIdleException
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions
import androidx.test.espresso.action.ViewActions.pressImeActionButton
import androidx.test.espresso.assertion.PositionAssertions.isCompletelyAbove
import androidx.test.espresso.assertion.PositionAssertions.isPartiallyBelow
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.Visibility
import androidx.test.espresso.matcher.ViewMatchers.hasDescendant
import androidx.test.espresso.matcher.ViewMatchers.isCompletelyDisplayed
import androidx.test.espresso.matcher.ViewMatchers.isRoot
import androidx.test.espresso.matcher.ViewMatchers.withEffectiveVisibility
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.uiautomator.By
import androidx.test.uiautomator.By.textContains
import androidx.test.uiautomator.UiSelector
import androidx.test.uiautomator.Until
import mozilla.components.compose.browser.toolbar.concept.BrowserToolbarTestTags.ADDRESSBAR_SEARCH_BOX
import mozilla.components.compose.browser.toolbar.concept.BrowserToolbarTestTags.ADDRESSBAR_URL_BOX
import mozilla.components.compose.browser.toolbar.concept.BrowserToolbarTestTags.SEARCH_SELECTOR
import mozilla.components.compose.browser.toolbar.concept.BrowserToolbarTestTags.TABS_COUNTER
import org.hamcrest.CoreMatchers.allOf
import org.mozilla.fenix.R
import org.mozilla.fenix.helpers.Constants.LONG_CLICK_DURATION
import org.mozilla.fenix.helpers.Constants.RETRY_COUNT
import org.mozilla.fenix.helpers.Constants.TAG
import org.mozilla.fenix.helpers.DataGenerationHelper.getStringResource
import org.mozilla.fenix.helpers.MatcherHelper.assertUIObjectExists
import org.mozilla.fenix.helpers.MatcherHelper.assertUIObjectIsGone
import org.mozilla.fenix.helpers.MatcherHelper.itemWithDescription
import org.mozilla.fenix.helpers.MatcherHelper.itemWithResId
import org.mozilla.fenix.helpers.MatcherHelper.itemWithResIdAndText
import org.mozilla.fenix.helpers.MatcherHelper.itemWithResIdContainingText
import org.mozilla.fenix.helpers.SessionLoadedIdlingResource
import org.mozilla.fenix.helpers.TestAssetHelper.waitingTime
import org.mozilla.fenix.helpers.TestAssetHelper.waitingTimeShort
import org.mozilla.fenix.helpers.TestHelper.appContext
import org.mozilla.fenix.helpers.TestHelper.mDevice
import org.mozilla.fenix.helpers.TestHelper.packageName
import org.mozilla.fenix.helpers.TestHelper.waitForAppWindowToBeUpdated
import org.mozilla.fenix.helpers.ext.waitNotNull
import org.mozilla.fenix.helpers.matchers.hasItemsCount
import mozilla.components.browser.menu.R as menuR
import mozilla.components.browser.toolbar.R as toolbarR
import mozilla.components.ui.tabcounter.R as tabcounterR

/**
 * Implementation of Robot Pattern for the URL toolbar.
 */
class NavigationToolbarRobot(private val composeTestRule: ComposeTestRule) {
    fun verifyUrl(url: String) {
        Log.i(TAG, "verifyUrl: Trying to verify toolbar text matches $url")
        onView(withId(toolbarR.id.mozac_browser_toolbar_url_view)).check(matches(withText(url)))
        Log.i(TAG, "verifyUrl: Verified toolbar text matches $url")
    }

    fun verifyTabButtonShortcutMenuItems() {
        Log.i(TAG, "verifyTabButtonShortcutMenuItems: Trying to verify tab counter shortcut options")
        composeTestRule.onNodeWithText("Close tab", useUnmergedTree = true).assertIsDisplayed()
        composeTestRule.onNodeWithText("New private tab", useUnmergedTree = true).assertIsDisplayed()
        composeTestRule.onNodeWithText("New tab", useUnmergedTree = true).assertIsDisplayed()
        Log.i(TAG, "verifyTabButtonShortcutMenuItems: Verified tab counter shortcut options")
    }

    fun verifyTabButtonShortcutMenuItemsForNormalHomescreen() {
        Log.i(TAG, "verifyTabButtonShortcutMenuItemsForNormalHomescreen: Trying to verify tab counter shortcut options")
        onView(withId(menuR.id.mozac_browser_menu_recyclerView))
            .check(matches(hasItemsCount(2)))
            .check(matches(hasDescendant(withText("New tab"))))
            .check(matches(hasDescendant(withText("New private tab"))))
        Log.i(TAG, "verifyTabButtonShortcutMenuItemsForNormalHomescreen: Verified tab counter shortcut options")
    }

    fun verifyTabButtonShortcutMenuItemsForPrivateHomescreen() {
        Log.i(TAG, "verifyTabButtonShortcutMenuItemsForPrivateHomescreen: Trying to verify tab counter shortcut options")
        onView(withId(menuR.id.mozac_browser_menu_recyclerView))
            .check(matches(hasItemsCount(2)))
            .check(matches(hasDescendant(withText("New tab"))))
            .check(matches(hasDescendant(withText("New private tab"))))
        Log.i(TAG, "verifyTabButtonShortcutMenuItemsForPrivateHomescreen: Verified tab counter shortcut options")
    }

    fun verifyReaderViewToolbarButton(isDisplayed: Boolean = false) {
        waitForAppWindowToBeUpdated()
        if (isDisplayed) {
            Log.i(TAG, "verifyReaderViewToolbarButton: Trying to verify that the reader view toolbar button is displayed")
            composeTestRule.onNodeWithContentDescription(
                getStringResource(R.string.browser_menu_read),
                useUnmergedTree = true,
            ).assertIsDisplayed()
            Log.i(TAG, "verifyReaderViewToolbarButton: Verified that the reader view toolbar button is displayed")
        } else {
            Log.i(TAG, "verifyReaderViewToolbarButton: Trying to verify that the reader view toolbar button is not displayed")
            composeTestRule.onNodeWithContentDescription(
                getStringResource(R.string.browser_menu_read),
                useUnmergedTree = true,
            ).assertIsNotDisplayed()
            Log.i(TAG, "verifyReaderViewToolbarButton: Verified that the reader view toolbar button is not displayed")
        }
    }

    fun clickReaderViewToolbarButton(isReaderViewEnabled: Boolean) {
        if (isReaderViewEnabled) {
            Log.i(TAG, "clickReaderViewToolbarButton: Trying to click the \"Close reader view\" toolbar button")
            composeTestRule.onNodeWithContentDescription(
                getStringResource(R.string.browser_menu_read_close),
                useUnmergedTree = true,
            ).performClick()
            Log.i(TAG, "clickReaderViewToolbarButton: Clicked the \"Close reader view\" toolbar button")
        } else {
            Log.i(TAG, "clickReaderViewToolbarButton: Trying to click the \"Reader view\" toolbar button")
            composeTestRule.onNodeWithContentDescription(
                getStringResource(R.string.browser_menu_read),
                useUnmergedTree = true,
            ).performClick()
            Log.i(TAG, "clickReaderViewToolbarButton: Clicked the \"Reader view\" toolbar button")
        }
        waitForAppWindowToBeUpdated()
    }

    fun verifyClipboardSuggestionsAreDisplayed(shouldBeDisplayed: Boolean) {
        if (shouldBeDisplayed) {
            composeTestRule.onNodeWithText(getStringResource(R.string.awesomebar_clipboard_title))
                .assertIsDisplayed()
        } else {
            composeTestRule.onNodeWithText(getStringResource(R.string.awesomebar_clipboard_title))
                .assertIsNotDisplayed()
        }
    }

    fun longClickEditModeToolbar() {
        Log.i(TAG, "longClickEditModeToolbar: Trying to long click the edit mode toolbar")
        mDevice.findObject(By.res("$packageName:id/mozac_browser_toolbar_edit_url_view"))
            .click(LONG_CLICK_DURATION)
        Log.i(TAG, "longClickEditModeToolbar: Long clicked the edit mode toolbar")
    }

    fun clickContextMenuItem(item: String) {
        mDevice.waitNotNull(
            Until.findObject(By.text(item)),
            waitingTime,
        )
        Log.i(TAG, "clickContextMenuItem: Trying click context menu item: $item")
        mDevice.findObject(By.text(item)).click()
        Log.i(TAG, "clickContextMenuItem: Clicked context menu item: $item")
    }

    fun clickClearToolbarButton() {
        Log.i(TAG, "clickClearToolbarButton: Trying click the clear address button")
        clearAddressBarButton().click()
        Log.i(TAG, "clickClearToolbarButton: Clicked the clear address button")
    }

    fun verifyToolbarIsEmpty() =
        assertUIObjectExists(
            itemWithResIdContainingText(
                "$packageName:id/mozac_browser_toolbar_edit_url_view",
                getStringResource(R.string.search_hint),
            ),
        )

    fun verifySearchBarPlaceholder() {
        Log.i(TAG, "verifySearchBarPlaceholder: Trying to verify that the search bar place holder is \"Search or enter address\"")
        composeTestRule.onNodeWithTag(ADDRESSBAR_URL_BOX).assert(hasContentDescription("Search or enter address"))
        Log.i(TAG, "verifySearchBarPlaceholder: Verified that the search bar place holder is \"Search or enter address\"")
    }

    fun verifyDefaultSearchEngine(engineName: String) {
        Log.i(TAG, "verifyDefaultSearchEngine: Trying to verify that default search engine is: $engineName is displayed")
        composeTestRule.onNodeWithContentDescription(getStringResource(R.string.search_engine_selector_content_description, engineName)).assertIsDisplayed()
        Log.i(TAG, "verifyDefaultSearchEngine: Verified that default search engine is: $engineName is displayed")
    }

    fun verifyTextSelectionOptions(vararg textSelectionOptions: String) {
        for (textSelectionOption in textSelectionOptions) {
            mDevice.waitNotNull(Until.findObject(textContains(textSelectionOption)), waitingTime)
        }
    }

    fun verifyRedesignedNavigationToolbarItems() {
        assertUIObjectExists(
            itemWithDescription(getStringResource(R.string.browser_menu_back)),
            itemWithDescription(getStringResource(R.string.browser_menu_forward)),
            itemWithDescription(getStringResource(R.string.search_hint)),
            itemWithDescription("More options"),
            itemWithResId("$packageName:id/counter_box"),
        )
    }

    fun verifyTranslationButton(isPageTranslated: Boolean, originalLanguage: String = "", translatedLanguage: String = "") {
        if (isPageTranslated) {
            for (i in 1..RETRY_COUNT) {
                Log.i(TAG, "verifyTranslationButton: Started try #$i")
                try {
                    assertUIObjectExists(itemWithDescription("Page translated from $originalLanguage to $translatedLanguage."))

                    break
                } catch (e: AssertionError) {
                    Log.i(TAG, "verifyTranslationButton: AssertionError caught, executing fallback methods")
                    browserScreen(composeTestRule) {
                    }.openThreeDotMenu {
                    }.clickRefreshButton { }
                }
            }
        } else {
            assertUIObjectExists(itemWithDescription(getStringResource(R.string.browser_toolbar_translate)))
        }
    }

    fun verifyReaderViewNavigationToolbarButton(isReaderViewEnabled: Boolean) {
        if (isReaderViewEnabled) {
            assertUIObjectExists(itemWithDescription(getStringResource(R.string.browser_menu_read_close)))
        } else {
            assertUIObjectExists(itemWithDescription(getStringResource(R.string.browser_menu_read)))
        }
    }

    fun longTapNavButton(buttonDescription: String) {
        Log.i(TAG, "longTapNavButton: Waiting to find the nav bar $buttonDescription button.")
        mDevice.findObject(UiSelector().description("Back")).waitForExists(waitingTime)
        Log.i(TAG, "longTapNavButton: Trying to long click the nav bar $buttonDescription button.")
        mDevice.findObject(
            By.desc(buttonDescription)
                .enabled(true)
                .hasAncestor(By.res("$packageName:id/navigation_bar")),
        )
            .click(LONG_CLICK_DURATION)
        Log.i(TAG, "longTapNavButton: Long clicked the nav bar $buttonDescription button.")
    }

    fun verifyTabHistorySheetIsDisplayed(isDisplayed: Boolean) {
        assertUIObjectExists(
            itemWithResId("$packageName:id/tabHistoryRecyclerView"),
            exists = isDisplayed,
        )
    }

    fun verifyTabHistoryContainsWebsite(websiteUrl: String, isDisplayed: Boolean) {
        assertUIObjectExists(
            itemWithResIdAndText("$packageName:id/site_list_item", websiteUrl),
            exists = isDisplayed,
        )
    }

    // Verifies that the address bar is displayed separately, or merged with the navbar in landscape mode.
    fun verifyAddressBarIsDisplayedSeparately(isSeparate: Boolean, isAtTop: Boolean) {
        val addressBar = "$packageName:id/toolbar"
        val navBar = "$packageName:id/navigation_bar"

        if (isSeparate) {
            assertUIObjectExists(itemWithResId(addressBar), itemWithResId(navBar))
        } else {
            assertUIObjectIsGone(itemWithResId(if (isAtTop) navBar else addressBar))
            assertUIObjectExists(itemWithResId(if (isAtTop) addressBar else navBar))
        }
    }

    fun verifyAddressBarPosition(isAtTop: Boolean) {
        Log.i(TAG, "verifyAddressBarPosition: Trying to verify the toolbar address bar position is at the top: $isAtTop.")
        onView(withId(R.id.toolbar)).check(
            if (isAtTop) {
                isCompletelyAbove(withId(R.id.engineView))
            } else {
                isPartiallyBelow(withId(R.id.engineView))
            },
        )
        Log.i(TAG, "verifyAddressBarPosition: Verified the toolbar address bar position is at the top: $isAtTop.")
    }

    fun verifyNavBarBarPosition(isAtBottom: Boolean) {
        Log.i(TAG, "verifyNavBarBarPosition: Trying to verify the toolbar navbar position is at the bottom: $isAtBottom.")
        onView(allOf(withId(R.id.navigation_bar), isCompletelyDisplayed())).check(
            if (isAtBottom) {
                isPartiallyBelow(withId(R.id.engineView))
            } else {
                isCompletelyAbove(withId(R.id.engineView))
            },
        )
        Log.i(TAG, "verifyNavBarBarPosition: Verified the toolbar navbar position is at the bottom: $isAtBottom.")
    }

    fun verifyTheTabCounter(numberOfOpenTabs: String, isPrivateBrowsingEnabled: Boolean = false) {
        if (isPrivateBrowsingEnabled) {
            Log.i(TAG, "verifyTabCounter: Trying to verify that the number of open private tabs is : $numberOfOpenTabs")
            composeTestRule.onNodeWithContentDescription("Private Tabs Open: $numberOfOpenTabs. Tap to switch tabs.")
                .assertIsDisplayed()
            Log.i(TAG, "verifyTabCounter: Verified that the number of open private tabs is : $numberOfOpenTabs")
        } else {
            Log.i(TAG, "verifyTabCounter: Trying to verify that the number of open tabs is : $numberOfOpenTabs")
            composeTestRule.onNodeWithContentDescription("Non-private Tabs Open: $numberOfOpenTabs. Tap to switch tabs.")
                .assertIsDisplayed()
            Log.i(TAG, "verifyTabCounter: Verified that the number of open tabs is : $numberOfOpenTabs")
        }
    }

    fun verifyTheMainMenuButton() {
        Log.i(TAG, "verifyTheMainMenuButton: Trying to verify that the main menu button is displayed")
        composeTestRule.onNodeWithContentDescription(getStringResource(R.string.content_description_menu)).assertIsDisplayed()
        Log.i(TAG, "verifyTheMainMenuButton: Verified that the main menu button is displayed")
    }

    fun verifyTheNewTabButton(isPrivateModeEnabled: Boolean = false) {
        if (isPrivateModeEnabled) {
            Log.i(TAG, "verifyTheNewTabButton: Trying to verify that the \"New private tab\" button is displayed.")
            composeTestRule.onNodeWithContentDescription("New private tab").assertIsDisplayed()
            Log.i(TAG, "verifyTheNewTabButton: Verified that the \"New private tab\" button is displayed.")
        } else {
            Log.i(TAG, "verifyTheNewTabButton: Trying to verify that the \"New tab\" button is displayed.")
            composeTestRule.onNodeWithContentDescription("New tab").assertIsDisplayed()
            Log.i(TAG, "verifyTheNewTabButton: Verified that the \"New tab\" button is displayed.")
        }
    }

    class Transition(private val composeTestRule: ComposeTestRule) {
        private lateinit var sessionLoadedIdlingResource: SessionLoadedIdlingResource

        fun enterURLAndEnterToBrowser(
            url: Uri,
            interact: BrowserRobot.() -> Unit,
        ): BrowserRobot.Transition {
            Log.i(TAG, "enterURLAndEnterToBrowser: Trying to click navigation toolbar")
            itemWithResId("ADDRESSBAR_URL_BOX").click()
            Log.i(TAG, "enterURLAndEnterToBrowser: Clicked navigation toolbar")

            Log.i(TAG, "enterURLAndEnterToBrowser: Waiting for compose rule to be idle")
            composeTestRule.waitForIdle()
            Log.i(TAG, "enterURLAndEnterToBrowser: Waited for compose rule to be idle")

            Log.i(TAG, "enterURLAndEnterToBrowser: Trying to set toolbar text to: $url")
            itemWithResId("ADDRESSBAR_SEARCH_BOX").setText(url.toString())
            Log.i(TAG, "enterURLAndEnterToBrowser: Toolbar text was set to: $url")

            Log.i(TAG, "enterURLAndEnterToBrowser: Waiting for compose rule to be idle")
            composeTestRule.waitForIdle()
            Log.i(TAG, "enterURLAndEnterToBrowser: Waited for compose rule to be idle")

            runCatching {
                Log.i(TAG, "enterURLAndEnterToBrowser: Trying to perform Compose IME action perform on the toolbar")
                composeTestRule.onNodeWithTag(ADDRESSBAR_SEARCH_BOX).performImeAction()
                Log.i(TAG, "enterURLAndEnterToBrowser: Compose IME action performed on the toolbar")
            }.onFailure { throwable ->
                Log.e(TAG, "enterURLAndEnterToBrowser: Compose IME action failed with: ${throwable::class.java.simpleName} - ${throwable.message}")
                Log.d(TAG, "enterURLAndEnterToBrowser: Falling back to UiDevice pressEnter()")
                mDevice.pressEnter()
                Log.d(TAG, "enterURLAndEnterToBrowser: Fallback UiDevice pressEnter() completed")
            }

            Log.i(TAG, "enterURLAndEnterToBrowser: Waiting for compose rule to be idle")
            composeTestRule.waitForIdle()
            Log.i(TAG, "enterURLAndEnterToBrowser: Waited for compose rule to be idle")

            BrowserRobot(composeTestRule).interact()
            return BrowserRobot.Transition(composeTestRule)
        }

        fun enterURL(
            url: Uri,
            interact: BrowserRobot.() -> Unit,
        ): BrowserRobot.Transition {
            sessionLoadedIdlingResource = SessionLoadedIdlingResource()

            openEditURLView()
            Log.i(TAG, "enterURLAndEnterToBrowser: Trying to set toolbar text to: $url")
            awesomeBar().setText(url.toString())
            Log.i(TAG, "enterURLAndEnterToBrowser: Toolbar text was set to: $url")
            Log.i(TAG, "enterURLAndEnterToBrowser: Trying to press device enter button")
            pressImeActionOnAwesomeBar()
            Log.i(TAG, "enterURLAndEnterToBrowser: Pressed device enter button")

            BrowserRobot(composeTestRule).interact()
            return BrowserRobot.Transition(composeTestRule)
        }

        fun visitLinkFromClipboard(interact: BrowserRobot.() -> Unit): BrowserRobot.Transition {
            composeTestRule.onNodeWithText(getStringResource(R.string.awesomebar_clipboard_title)).assertIsDisplayed()
            Log.i(TAG, "visitLinkFromClipboard: Trying to click the fill link from clipboard button")
            composeTestRule.onNodeWithText(getStringResource(R.string.awesomebar_clipboard_title)).performClick()
            Log.i(TAG, "visitLinkFromClipboard: Clicked the fill link from clipboard button")
            waitForAppWindowToBeUpdated()
            Log.i(TAG, "visitLinkFromClipboard: Trying to press device enter button")
            onView(isRoot()).perform(ViewActions.pressKey(KeyEvent.KEYCODE_ENTER))
            Log.i(TAG, "visitLinkFromClipboard: Pressed device enter button")

            BrowserRobot(composeTestRule).interact()
            return BrowserRobot.Transition(composeTestRule)
        }

        fun goBackToHomeScreen(interact: HomeScreenRobot.() -> Unit): HomeScreenRobot.Transition {
            Log.i(TAG, "goBackToHomeScreen: Trying to click the device back button")
            mDevice.pressBack()
            Log.i(TAG, "goBackToHomeScreen: Clicked the device back button")
            Log.i(TAG, "goBackToHomeScreen: Waiting for $waitingTimeShort ms for $packageName window to be updated")
            mDevice.waitForWindowUpdate(packageName, waitingTimeShort)
            Log.i(TAG, "goBackToHomeScreen: Waited for $waitingTimeShort ms for $packageName window to be updated")

            HomeScreenRobot(composeTestRule).interact()
            return HomeScreenRobot.Transition(composeTestRule)
        }

        fun goBackToBrowserScreen(interact: BrowserRobot.() -> Unit): BrowserRobot.Transition {
            Log.i(TAG, "goBackToBrowserScreen: Trying to click the device back button")
            mDevice.pressBack()
            Log.i(TAG, "goBackToBrowserScreen: Clicked the device back button")
            Log.i(TAG, "goBackToBrowserScreen: Waiting for $waitingTimeShort ms for $packageName window to be updated")
            mDevice.waitForWindowUpdate(packageName, waitingTimeShort)
            Log.i(TAG, "goBackToBrowserScreen: Waited for $waitingTimeShort ms for $packageName window to be updated")

            BrowserRobot(composeTestRule).interact()
            return BrowserRobot.Transition(composeTestRule)
        }

        fun openTabButtonShortcutsMenu(interact: NavigationToolbarRobot.() -> Unit): Transition {
            Log.i(TAG, "openTabButtonShortcutsMenu: Trying to long click the tab counter button")
            composeTestRule.onNodeWithTag(TABS_COUNTER).performTouchInput {
                down(center)
                advanceEventTime(10000)
                up()
            }
            Log.i(TAG, "openTabButtonShortcutsMenu: Long clicked the tab counter button")

            NavigationToolbarRobot(composeTestRule).interact()
            return Transition(composeTestRule)
        }

        fun closeTabFromShortcutsMenu(interact: NavigationToolbarRobot.() -> Unit): Transition {
            Log.i(TAG, "closeTabFromShortcutsMenu: Trying to click the \"Close tab\" button")
            composeTestRule.onNodeWithText("Close tab", useUnmergedTree = true).performClick()
            Log.i(TAG, "closeTabFromShortcutsMenu: Clicked the \"Close tab\" button")

            NavigationToolbarRobot(composeTestRule).interact()
            return Transition(composeTestRule)
        }

        fun openNewTabFromShortcutsMenu(interact: SearchRobot.() -> Unit): SearchRobot.Transition {
            Log.i(TAG, "openNewTabFromShortcutsMenu: Trying to click the \"New tab\" button")
            composeTestRule.onNodeWithText("New tab", useUnmergedTree = true).performClick()
            Log.i(TAG, "openNewTabFromShortcutsMenu: Clicked the \"New tab\" button")

            SearchRobot(composeTestRule).interact()
            return SearchRobot.Transition(composeTestRule)
        }

        fun openNewPrivateTabFromShortcutsMenu(interact: SearchRobot.() -> Unit): SearchRobot.Transition {
            Log.i(TAG, "openNewPrivateTabFromShortcutsMenu: Trying to click the \"New private tab\" button")
            composeTestRule.onNodeWithText("New private tab", useUnmergedTree = true).performClick()
            Log.i(TAG, "openNewPrivateTabFromShortcutsMenu: Clicked the \"New private tab\" button")

            SearchRobot(composeTestRule).interact()
            return SearchRobot.Transition(composeTestRule)
        }

        @OptIn(ExperimentalTestApi::class)
        fun clickURLBar(interact: SearchRobot.() -> Unit): SearchRobot.Transition {
            Log.i(TAG, "clickURLBar: Waiting for $waitingTime until the URL bar to exist")
            composeTestRule.waitUntilAtLeastOneExists(hasTestTag(ADDRESSBAR_URL_BOX), waitingTime)
            Log.i(TAG, "clickURLBar: Waited for $waitingTime until the URL bar to exist")
            Log.i(TAG, "clickURLBar: Trying to click navigation toolbar")
            composeTestRule.onNodeWithTag(ADDRESSBAR_URL_BOX).performClick()
            Log.i(TAG, "clickURLBar: Clicked navigation toolbar")
            composeTestRule.waitForIdle()

            SearchRobot(composeTestRule).interact()
            return SearchRobot.Transition(composeTestRule)
        }

        fun clickSearchSelectorButton(interact: SearchRobot.() -> Unit): SearchRobot.Transition {
            Log.i(TAG, "clickSearchSelectorButton: Trying to click the search selector button")
            composeTestRule.onNodeWithTag(SEARCH_SELECTOR).performClick()
            Log.i(TAG, "clickSearchSelectorButton: Clicked the search selector button")

            SearchRobot(composeTestRule).interact()
            return SearchRobot.Transition(composeTestRule)
        }

        fun clickTranslateButton(
            isPageTranslated: Boolean = false,
            originalLanguage: String = "",
            translatedLanguage: String = "",
            interact: TranslationsRobot.() -> Unit,
        ): TranslationsRobot.Transition {
            if (isPageTranslated) {
                Log.i(TAG, "clickTranslateButton: Trying to click the translate button")
                itemWithDescription("Page translated from $originalLanguage to $translatedLanguage.").click()
                Log.i(TAG, "clickTranslateButton: Clicked the translate button")
            } else {
                Log.i(TAG, "clickTranslateButton: Trying to click the translate button")
                itemWithDescription(getStringResource(R.string.browser_toolbar_translate)).click()
                Log.i(TAG, "clickTranslateButton: Clicked the translate button")
            }

            TranslationsRobot(composeTestRule).interact()
            return TranslationsRobot.Transition(composeTestRule)
        }

        // New navbar design home screen search button
        @OptIn(ExperimentalTestApi::class)
        fun clickHomeScreenSearchButton(interact: SearchRobot.() -> Unit): SearchRobot.Transition {
            Log.i(TAG, "clickHomeScreenSearchButton: Waiting for $waitingTime ms for the search button to exist.")
            composeTestRule.waitUntilAtLeastOneExists(hasContentDescription("Search or enter address"))
            Log.i(TAG, "clickHomeScreenSearchButton: Waited for $waitingTime ms for the search button to exist.")
            Log.i(TAG, "clickHomeScreenSearchButton: Trying to click the nav bar search button.")
            composeTestRule.onNodeWithContentDescription("Search or enter address").performClick()
            Log.i(TAG, "clickHomeScreenSearchButton: Clicked the nav bar search button.")

            SearchRobot(composeTestRule).interact()
            return SearchRobot.Transition(composeTestRule)
        }

        fun openUnifiedTrustPanel(interact: UnifiedTrustPanelRobot.() -> Unit): UnifiedTrustPanelRobot.Transition {
            Log.i(TAG, "openSiteSecuritySheet: Trying to click the site security toolbar button and wait for $waitingTime ms for a new window")
            composeTestRule.onNodeWithContentDescription("Site information").performClick()
            Log.i(TAG, "openSiteSecuritySheet: Clicked the site security toolbar button and waited for $waitingTime ms for a new window")
            waitForAppWindowToBeUpdated()

            UnifiedTrustPanelRobot().interact()
            return UnifiedTrustPanelRobot.Transition()
        }

        fun clickTheNewTabButton(isPrivateModeEnabled: Boolean = false, interact: SearchRobot.() -> Unit): SearchRobot.Transition {
            if (isPrivateModeEnabled) {
                Log.i(TAG, "clickTheNewTabButton: Trying to click the \"New private tab\" button.")
                composeTestRule.onNodeWithContentDescription("New private tab").performClick()
                Log.i(TAG, "clickTheNewTabButton: Clicked the \"New private tab\" button.")
            } else {
                Log.i(TAG, "clickTheNewTabButton: Trying to click the \"New tab\" button.")
                composeTestRule.onNodeWithContentDescription("New tab").performClick()
                Log.i(TAG, "clickTheNewTabButton: Clicked the \"New tab\" button.")
            }

            SearchRobot(composeTestRule).interact()
            return SearchRobot.Transition(composeTestRule)
        }
    }
}

fun navigationToolbar(composeTestRule: ComposeTestRule, interact: NavigationToolbarRobot.() -> Unit): NavigationToolbarRobot.Transition {
    NavigationToolbarRobot(composeTestRule).interact()
    return NavigationToolbarRobot.Transition(composeTestRule)
}

fun openEditURLView() {
    Log.i(TAG, "openEditURLView: Waiting for $waitingTime ms for the toolbar to exist")
    urlBar().waitForExists(waitingTime)
    Log.i(TAG, "openEditURLView: Waited for $waitingTime ms for the toolbar to exist")
    Log.i(TAG, "openEditURLView: Trying to click the toolbar")
    urlBar().click()
    Log.i(TAG, "openEditURLView: Clicked the toolbar")
    Log.i(TAG, "openEditURLView: Waiting for $waitingTime ms for the edit mode toolbar to exist")
    itemWithResId("$packageName:id/mozac_browser_toolbar_edit_url_view").waitForExists(waitingTime)
    Log.i(TAG, "openEditURLView: Waited for $waitingTime ms for the edit mode toolbar to exist")
}

private fun urlBar() = mDevice.findObject(UiSelector().resourceId("$packageName:id/toolbar"))
private fun homeUrlBar() = mDevice.findObject(UiSelector().resourceId("$packageName:id/toolbar_text"))
private fun awesomeBar() =
    mDevice.findObject(UiSelector().resourceId("$packageName:id/mozac_browser_toolbar_edit_url_view"))
private fun pressImeActionOnAwesomeBar() {
    val context = appContext
    val resId = context.resources.getIdentifier(
        "mozac_browser_toolbar_edit_url_view",
        "id",
        packageName,
    )

    try {
        Log.i(TAG, "pressImeActionOnAwesomeBar: Trying pressImeActionButton via Espresso")
        onView(withId(resId)).perform(pressImeActionButton())
        Log.i(TAG, "pressImeActionOnAwesomeBar: Espresso IME action completed successfully")
    } catch (e: AppNotIdleException) {
        Log.w(TAG, "pressImeActionOnAwesomeBar: IME action failed (AppNotIdleException); falling back to UiAutomator pressEnter()", e)
        try {
            val field = awesomeBar()
            if (field.exists()) {
                field.click()
                mDevice.pressEnter()
                Log.i(TAG, "pressImeActionOnAwesomeBar: Fallback UiAutomator pressEnter() executed successfully")
            } else {
                Log.w(TAG, "pressImeActionOnAwesomeBar: Fallback failed: awesomeBar() not found")
            }
        } catch (fallbackEx: Exception) {
            Log.e(TAG, "pressImeActionOnAwesomeBar: Fallback UiAutomator pressEnter() failed", fallbackEx)
        }
    }
}
private fun threeDotButton() = onView(withId(toolbarR.id.mozac_browser_toolbar_menu))
private fun tabTrayButton() = onView(withId(R.id.tab_button))
private fun tabsCounter() = onView(
    allOf(
        withId(tabcounterR.id.counter_root),
        withEffectiveVisibility(Visibility.VISIBLE),
    ),
)
private fun fillLinkButton() = onView(withId(R.id.fill_link_from_clipboard))
private fun clearAddressBarButton() = itemWithResId("$packageName:id/mozac_browser_toolbar_clear_view")
private fun readerViewToggle() =
    itemWithDescription(getStringResource(R.string.browser_menu_read))

private fun searchSelectorButton() =
    mDevice.findObject(UiSelector().resourceId("$packageName:id/search_selector"))
