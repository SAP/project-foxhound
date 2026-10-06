package org.mozilla.focus.activity

import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.mozilla.focus.activity.robots.searchScreen
import org.mozilla.focus.helpers.DeleteFilesHelper.deleteFileUsingDisplayName
import org.mozilla.focus.helpers.FeatureSettingsHelper
import org.mozilla.focus.helpers.FocusTestRule
import org.mozilla.focus.helpers.MainActivityIntentsTestRule
import org.mozilla.focus.helpers.TestAssetHelper.genericAsset
import org.mozilla.focus.helpers.TestAssetHelper.pdfTestAsset
import org.mozilla.focus.helpers.TestHelper.getTargetContext
import org.mozilla.focus.helpers.TestHelper.permAllowBtn
import org.mozilla.focus.helpers.TestHelper.verifyDownloadedFileOnStorage
import org.mozilla.focus.helpers.TestHelper.waitingTime
import org.mozilla.focus.testAnnotations.SmokeTest

class PDFViewerTest {
    private val featureSettingsHelper = FeatureSettingsHelper()
    private val pdfLink = "PDF file"

    @get:Rule(order = 0)
    val focusTestRule: FocusTestRule = FocusTestRule()

    private val webServerRule get() = focusTestRule.mockWebServerRule

    @get:Rule
    val mActivityTestRule = MainActivityIntentsTestRule(showFirstRun = false)

    @Before
    fun setUp() {
        featureSettingsHelper.setCfrForTrackingProtectionEnabled(false)
    }

    @After
    fun tearDown() {
        featureSettingsHelper.resetAllFeatureFlags()
        deleteFileUsingDisplayName(getTargetContext.applicationContext, "pdfFile.pdf")
    }

    @SmokeTest
    @Test
    fun openPdfFileTest() {
        val genericPageUrl = webServerRule.server.genericAsset.url
        val pdfDoc = webServerRule.server.pdfTestAsset

        searchScreen {
        }.loadPage(genericPageUrl) {
            progressBar.waitUntilGone(waitingTime)
            clickLinkMatchingText(pdfLink)
            verifyPageURL(pdfDoc.url)
            verifyPageContent(pdfDoc.content)
        }
    }

    @SmokeTest
    @Test
    fun downloadPdfTest() {
        val pdfDoc = webServerRule.server.pdfTestAsset

        searchScreen {
        }.loadPage(pdfDoc.url) {
            verifyPageContent(pdfDoc.content)
            clickButtonWithText("Download")
            // If permission dialog appears, grant it
            if (permAllowBtn.waitForExists(waitingTime)) {
                permAllowBtn.click()
            }
            verifyDownloadedFileOnStorage(pdfDoc.title)
        }
    }
}
