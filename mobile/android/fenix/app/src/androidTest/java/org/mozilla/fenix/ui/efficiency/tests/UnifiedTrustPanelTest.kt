package org.mozilla.fenix.ui.efficiency.tests

import org.junit.Test
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.ui.efficiency.helpers.BaseTest
import org.mozilla.fenix.ui.efficiency.selectors.UnifiedTrustPanelSelectors.CLEAR_COOKIES_AND_SITE_DATA_BUTTON

class UnifiedTrustPanelTest : BaseTest() {

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3186723
    @SmokeTest
    @Test
    fun verifyClearCookiesAndSiteDataFromQuickSettingsTest() {
        val loginPage = "https://mozilla-mobile.github.io/testapp/loginForm"
        val originWebsite = "mozilla-mobile.github.io"

        on.browserPage.navigateToPage(loginPage)
        on.unifiedTrustPanel.navigateToPage()
            .mozClick(CLEAR_COOKIES_AND_SITE_DATA_BUTTON)
        on.unifiedTrustPanel
            .verifyTheClearCookiesAndSiteDataDialog(originWebsite)
    }
}
