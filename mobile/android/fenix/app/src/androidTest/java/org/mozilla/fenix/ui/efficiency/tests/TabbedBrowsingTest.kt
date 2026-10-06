package org.mozilla.fenix.ui.efficiency.tests

import org.junit.Test
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.helpers.TestAssetHelper.getGenericAsset
import org.mozilla.fenix.ui.efficiency.helpers.BaseTest
import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy
import org.mozilla.fenix.ui.efficiency.selectors.SearchBarSelectors
import org.mozilla.fenix.ui.efficiency.selectors.TabDrawerSelectors

class TabbedBrowsingTest : BaseTest() {

    private val mockWebServer get() = fenixTestRule.mockWebServer

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/1046683
    @Test
    fun verifySyncedTabsWhenUserIsNotSignedInTest() {
        on.tabDrawer.navigateToPage()
            .mozVerifyElementIsNotSelected(TabDrawerSelectors.SYNCED_TABS_BUTTON)
        on.tabDrawer
            .mozClick(TabDrawerSelectors.SYNCED_TABS_BUTTON)
            .mozVerifyElementIsSelected(TabDrawerSelectors.SYNCED_TABS_BUTTON)
        on.tabDrawer
            .mozVerifyElementsByGroup("tabDrawerUnauthenticatedSyncedTabs")
            .mozClick(TabDrawerSelectors.SIGN_IN_TO_SYNC_BUTTON)
        on.settingsTurnOnSync
            .mozVerifyElementsByGroup()
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/903587
    @SmokeTest
    @Test
    fun verifyPrivateTabsTrayWithOpenTabTest() {
        val website = mockWebServer.getGenericAsset(1)

        on.tabDrawer.navigateToPage()
            .mozClick(TabDrawerSelectors.PRIVATE_TABS_PAGE_BUTTON)
            .mozClick(TabDrawerSelectors.FAB)
        on.searchBar
            .mozEnterText(website.url.toString(), SearchBarSelectors.TOOLBAR_IN_EDIT_MODE)
            .mozPressEnter(SearchBarSelectors.TOOLBAR_IN_EDIT_MODE)
        on.browserPage.navigateToPage()
        on.tabDrawer.navigateToPage()
            .mozVerifyElementIsNotSelected(TabDrawerSelectors.NORMAL_BROWSING_OPEN_TABS_BUTTON)
        on.tabDrawer.mozVerifyElementIsSelected(TabDrawerSelectors.PRIVATE_TABS_PAGE_BUTTON)
        on.tabDrawer.mozVerifyElementIsNotSelected(TabDrawerSelectors.TAB_GROUPS_BUTTON)
        on.tabDrawer.mozVerifyElementIsNotSelected(TabDrawerSelectors.SYNCED_TABS_BUTTON)
        on.tabDrawer.mozVerify(TabDrawerSelectors.THREE_DOT_BUTTON)
        on.tabDrawer.mozVerify(TabDrawerSelectors.PRIVATE_TABS_LIST)
        on.tabDrawer.mozVerify(
                Selector(
                    strategy = SelectorStrategy.COMPOSE_BY_TEXT,
                    value = website.title,
                    description = "Tab with title '${website.title}'",
                    groups = listOf(),
                ),
            )
        on.tabDrawer.mozVerify(TabDrawerSelectors.TAB_ITEM_CLOSE)
        on.tabDrawer.mozVerify(TabDrawerSelectors.TAB_ITEM_THUMBNAIL)
        on.tabDrawer.mozVerify(TabDrawerSelectors.FAB)
    }
}
