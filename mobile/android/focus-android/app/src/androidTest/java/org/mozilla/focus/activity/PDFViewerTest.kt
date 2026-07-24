package org.mozilla.focus.activity

import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.mozilla.focus.activity.robots.searchScreen
import org.mozilla.focus.helpers.DeleteFilesHelper.deleteFileUsingDisplayName
import org.mozilla.focus.helpers.FeatureSettingsHelper
import org.mozilla.focus.helpers.MainActivityIntentsTestRule
import org.mozilla.focus.helpers.MockWebServerHelper
import org.mozilla.focus.helpers.TestAssetHelper.genericAsset
import org.mozilla.focus.helpers.TestAssetHelper.pdfTestAsset
import org.mozilla.focus.helpers.TestHelper.getTargetContext
import org.mozilla.focus.helpers.TestHelper.permAllowBtn
import org.mozilla.focus.helpers.TestHelper.verifyDownloadedFileOnStorage
import org.mozilla.focus.helpers.TestHelper.waitingTime
import org.mozilla.focus.helpers.TestSetup
import org.mozilla.focus.testAnnotations.SmokeTest

class PDFViewerTest : TestSetup() {
    private lateinit var webServer: MockWebServer
    private val featureSettingsHelper = FeatureSettingsHelper()
    private val pdfLink = "PDF file"

    @get:Rule
    val mActivityTestRule = MainActivityIntentsTestRule(showFirstRun = false)

    @Before
    override fun setUp() {
        super.setUp()
        featureSettingsHelper.setCfrForTrackingProtectionEnabled(false)
        webServer = MockWebServer().apply {
            dispatcher = MockWebServerHelper.AndroidAssetDispatcher()
            start()
        }
    }

    @After
    fun tearDown() {
        webServer.shutdown()
        featureSettingsHelper.resetAllFeatureFlags()
        deleteFileUsingDisplayName(getTargetContext.applicationContext, "pdfFile.pdf")
    }

    @SmokeTest
    @Test
    fun openPdfFileTest() {
        val genericPageUrl = webServer.genericAsset.url
        val pdfDoc = webServer.pdfTestAsset

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
        val pdfDoc = webServer.pdfTestAsset

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
