package org.mozilla.fenix.ui.efficiency.pageObjects

import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.ui.efficiency.helpers.BasePage
import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.navigation.NavigationRegistry
import org.mozilla.fenix.ui.efficiency.navigation.NavigationStep
import org.mozilla.fenix.ui.efficiency.selectors.ToolbarSelectors
import org.mozilla.fenix.ui.efficiency.selectors.UnifiedTrustPanelSelectors
import org.mozilla.fenix.ui.efficiency.selectors.UnifiedTrustPanelSelectors.CLEAR_COOKIES_AND_SITE_DATA_DIALOG_CANCEL_BUTTON
import org.mozilla.fenix.ui.efficiency.selectors.UnifiedTrustPanelSelectors.CLEAR_COOKIES_AND_SITE_DATA_DIALOG_CLEAR_BUTTON
import org.mozilla.fenix.ui.efficiency.selectors.UnifiedTrustPanelSelectors.CLEAR_COOKIES_AND_SITE_DATA_DIALOG_DESCRIPTION
import org.mozilla.fenix.ui.efficiency.selectors.UnifiedTrustPanelSelectors.CLEAR_COOKIES_AND_SITE_DATA_DIALOG_TITLE

class UnifiedTrustPanelPage(composeRule: AndroidComposeTestRule<HomeActivityIntentTestRule, *>) : BasePage(composeRule) {
    override val pageName = "UnifiedTrustPanelPage"

    init {
        NavigationRegistry.register(
            from = "BrowserPage",
            to = pageName,
            steps = listOf(
                NavigationStep.Click(ToolbarSelectors.SITE_INFORMATION_BUTTON),
            ),
        )
    }

    override fun navigateToPage(url: String, forceNavigation: Boolean): UnifiedTrustPanelPage {
        super.navigateToPage(url = url.ifBlank { "example.com" }, forceNavigation = forceNavigation)
        return this
    }

    override fun mozGetSelectorsByGroup(group: String): List<Selector> {
        return UnifiedTrustPanelSelectors.all.filter { it.groups.contains(group) }
    }

    fun verifyTheClearCookiesAndSiteDataDialog(webSite: String): UnifiedTrustPanelPage {
        mozVerify(CLEAR_COOKIES_AND_SITE_DATA_DIALOG_TITLE)
        mozVerify(CLEAR_COOKIES_AND_SITE_DATA_DIALOG_DESCRIPTION(webSite))
        mozVerify(CLEAR_COOKIES_AND_SITE_DATA_DIALOG_CLEAR_BUTTON)
        mozVerify(CLEAR_COOKIES_AND_SITE_DATA_DIALOG_CANCEL_BUTTON)

        return this
    }
}
