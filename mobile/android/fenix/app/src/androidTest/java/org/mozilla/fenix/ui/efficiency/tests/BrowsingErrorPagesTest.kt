package org.mozilla.fenix.ui.efficiency.tests

import org.junit.Test
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.helpers.DataGenerationHelper.getStringResource
import org.mozilla.fenix.ui.efficiency.helpers.BaseTest
import mozilla.components.browser.errorpages.R as errorpagesR

class BrowsingErrorPagesTest : BaseTest() {
    private val malwareWarning =
        getStringResource(errorpagesR.string.mozac_browser_errorpages_safe_browsing_malware_uri_title)
    private val phishingWarning =
        getStringResource(errorpagesR.string.mozac_browser_errorpages_safe_phishing_uri_title)
    private val unwantedSoftwareWarning =
        getStringResource(errorpagesR.string.mozac_browser_errorpages_safe_browsing_unwanted_uri_title)
    private val harmfulSiteWarning =
        getStringResource(errorpagesR.string.mozac_browser_errorpages_safe_harmful_uri_title)

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2326774
    @SmokeTest
    @Test
    fun verifyMalwareWebsiteWarningMessageTest() {
        val malwareURl = "http://itisatrap.org/firefox/its-an-attack.html"

        on.browserPage.navigateToPage(malwareURl)
            .verifyPageContent(malwareWarning)
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2326773
    @SmokeTest
    @Test
    fun verifyPhishingWebsiteWarningMessageTest() {
        val phishingURl = "http://itisatrap.org/firefox/its-a-trap.html"

        on.browserPage.navigateToPage(phishingURl)
            .verifyPageContent(phishingWarning)
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2326772
    @SmokeTest
    @Test
    fun verifyUnwantedSoftwareWebsiteWarningMessageTest() {
        val unwantedURl = "http://itisatrap.org/firefox/unwanted.html"

        on.browserPage.navigateToPage(unwantedURl)
            .verifyPageContent(unwantedSoftwareWarning)
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/329877
    @SmokeTest
    @Test
    fun verifyHarmfulWebsiteWarningMessageTest() {
        val harmfulURl = "https://itisatrap.org/firefox/harmful.html"

        on.browserPage.navigateToPage(harmfulURl)
            .verifyPageContent(harmfulSiteWarning)
    }
}
