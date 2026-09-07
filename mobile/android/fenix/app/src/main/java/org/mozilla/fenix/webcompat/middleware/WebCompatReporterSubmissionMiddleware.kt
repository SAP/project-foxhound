/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.webcompat.middleware

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import mozilla.components.browser.state.selector.selectedTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.json.JSONObject
import org.mozilla.fenix.GleanMetrics.BrokenSiteReport
import org.mozilla.fenix.GleanMetrics.BrokenSiteReportBrowserInfo
import org.mozilla.fenix.GleanMetrics.BrokenSiteReportBrowserInfoApp
import org.mozilla.fenix.GleanMetrics.BrokenSiteReportBrowserInfoGraphics
import org.mozilla.fenix.GleanMetrics.BrokenSiteReportBrowserInfoPrefs
import org.mozilla.fenix.GleanMetrics.BrokenSiteReportBrowserInfoSystem
import org.mozilla.fenix.GleanMetrics.BrokenSiteReportTabInfo
import org.mozilla.fenix.GleanMetrics.BrokenSiteReportTabInfoAntitracking
import org.mozilla.fenix.GleanMetrics.BrokenSiteReportTabInfoFrameworks
import org.mozilla.fenix.GleanMetrics.Pings
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.webcompat.WebCompatReporterMoreInfoSender
import org.mozilla.fenix.webcompat.store.WebCompatReporterAction
import org.mozilla.fenix.webcompat.store.WebCompatReporterState

/**
 * [Middleware] that reacts to submission related [WebCompatReporterAction]s.
 *
 * @param appStore [AppStore] used to dispatch [AppAction]s.
 * @param browserStore [BrowserStore] used to access [BrowserState].
 * @param webCompatReporterRetrievalService The service that handles submission requests.
 * @param webCompatReporterMoreInfoSender [WebCompatReporterMoreInfoSender] used
 * to send WebCompat info to webcompat.com.
 * @param scope The [CoroutineScope] for launching coroutines.
 * @param nimbusExperimentsProvider A [NimbusExperimentsProvider] used to get active experiments.
 */
class WebCompatReporterSubmissionMiddleware(
    private val appStore: AppStore,
    private val browserStore: BrowserStore,
    private val webCompatReporterRetrievalService: WebCompatReporterRetrievalService,
    private val webCompatReporterMoreInfoSender: WebCompatReporterMoreInfoSender,
    private val scope: CoroutineScope,
    private val nimbusExperimentsProvider: NimbusExperimentsProvider,
) : Middleware<WebCompatReporterState, WebCompatReporterAction> {

    override fun invoke(
        store: Store<WebCompatReporterState, WebCompatReporterAction>,
        next: (WebCompatReporterAction) -> Unit,
        action: WebCompatReporterAction,
    ) {
        next(action)

        when (action) {
            is WebCompatReporterAction.SendReportClicked -> {
                scope.launch {
                    handleSendReport(store)
                }
            }
            is WebCompatReporterAction.OpenPreviewClicked -> {
                scope.launch {
                    handleOpenPreviewClicked(store)
                }
            }
            is WebCompatReporterAction.AddMoreInfoClicked -> {
                scope.launch {
                    handleSendMoreInfoClicked(store)
                }
            }
            else -> {}
        }
    }

    private suspend fun handleSendReport(store: Store<WebCompatReporterState, WebCompatReporterAction>) {
        val webCompatInfo = webCompatReporterRetrievalService.retrieveInfo()

        webCompatInfo?.let {
            val enteredUrlMatchesTabUrl = store.state.enteredUrl == webCompatInfo.url
            if (enteredUrlMatchesTabUrl) {
                setTabAntiTrackingMetrics(
                    antiTracking = webCompatInfo.antitracking,
                    sendBlockedUrls = store.state.includeEtpBlockedUrls,
                )
                setTabFrameworksMetrics(frameworks = webCompatInfo.frameworks)
                setTabLanguageMetrics(languages = webCompatInfo.languages)
                setTabUserAgentMetrics(userAgent = webCompatInfo.userAgent)
            }

            setBrowserInfoMetrics(browserInfo = webCompatInfo.browser)
            setDevicePixelRatioMetrics(devicePixelRatio = webCompatInfo.devicePixelRatio)
        }
        setUrlMetrics(url = store.state.enteredUrl)
        setReasonMetrics(reason = store.state.reason)
        setDescriptionMetrics(description = store.state.problemDescription)
        setExperimentMetrics()

        Pings.brokenSiteReport.submit()
        store.dispatch(WebCompatReporterAction.ReportSubmitted)
        appStore.dispatch(AppAction.WebCompatAction.WebCompatReportSent)
    }

    private suspend fun handleOpenPreviewClicked(
        store: Store<WebCompatReporterState, WebCompatReporterAction>,
    ) {
        val webCompatInfo = webCompatReporterRetrievalService.retrieveInfo()

        val webCompatJSON = generatePreviewJSON(store.state, webCompatInfo)

        store.dispatch(WebCompatReporterAction.PreviewJSONUpdated(webCompatJSON.toString()))
    }

    private fun generatePreviewJSON(
        state: WebCompatReporterState,
        webCompatInfo: WebCompatInfoDto?,
    ): JSONObject {
        return if (webCompatInfo == null) {
            JSONObject().apply {
                put("enteredUrl", state.enteredUrl)
                put("reason", state.reason)
                put("problemDescription", state.problemDescription)
            }
        } else {
            val webCompatString = Json.encodeToString(webCompatInfo)
            val webCompatJSON = JSONObject(webCompatString).apply {
                put("enteredUrl", state.enteredUrl)
                put("reason", state.reason)
                put("problemDescription", state.problemDescription)
            }

            // Note: we are removing the fields from the JSON here because when the user edits the URL in the
            // reporter, the tab-scoped diagnostics we collected (anti-tracking info, detected frameworks,
            // page languages, and the tab’s user agent) describe the *currently selected tab*, not the URL
            // the user chose to report. Browser/device info is kept because it is not origin-scoped.
            // If the entered URL matches the tab URL, we keep these fields since they accurately describe
            // the page being reported.
            if (state.enteredUrl != webCompatInfo.url) {
                webCompatJSON.apply {
                    remove("antitracking")
                    remove("frameworks")
                    remove("languages")
                    remove("userAgent")
                }
            }

            webCompatJSON
        }
    }

    private suspend fun handleSendMoreInfoClicked(
        store: Store<WebCompatReporterState, WebCompatReporterAction>,
    ) {
        webCompatReporterMoreInfoSender.sendMoreWebCompatInfo(
            reason = store.state.reason,
            problemDescription = store.state.problemDescription,
            enteredUrl = store.state.enteredUrl,
            tabUrl = store.state.tabUrl,
            engineSession = browserStore.state.selectedTab?.engineState?.engineSession,
        )

        store.dispatch(WebCompatReporterAction.SendMoreInfoSubmitted)
    }

    private fun setTabAntiTrackingMetrics(
        antiTracking: WebCompatInfoDto.WebCompatAntiTrackingDto,
        sendBlockedUrls: Boolean,
    ) {
        BrokenSiteReportTabInfoAntitracking.blockList.set(antiTracking.blockList)
        if (sendBlockedUrls) {
            BrokenSiteReportTabInfoAntitracking.blockedOrigins.set(antiTracking.blockedOrigins)
        }
        BrokenSiteReportTabInfoAntitracking.btpHasPurgedSite.set(antiTracking.btpHasPurgedSite)
        BrokenSiteReportTabInfoAntitracking.etpCategory.set(antiTracking.etpCategory)
        BrokenSiteReportTabInfoAntitracking.hasMixedActiveContentBlocked.set(
            antiTracking.hasMixedActiveContentBlocked,
        )
        BrokenSiteReportTabInfoAntitracking.hasMixedDisplayContentBlocked.set(
            antiTracking.hasMixedDisplayContentBlocked,
        )
        BrokenSiteReportTabInfoAntitracking.hasTrackingContentBlocked.set(
            antiTracking.hasTrackingContentBlocked,
        )
        BrokenSiteReportTabInfoAntitracking.isPrivateBrowsing.set(antiTracking.isPrivateBrowsing)
    }

    private fun setBrowserInfoMetrics(browserInfo: WebCompatInfoDto.WebCompatBrowserDto) {
        val addons = BrokenSiteReportBrowserInfo.AddonsObject()
        for (addon in browserInfo.addons) {
            addons.add(
                BrokenSiteReportBrowserInfo.AddonsObjectItem(
                    id = addon.id,
                    name = addon.name,
                    temporary = addon.temporary,
                    version = addon.version,
                ),
            )
        }
        BrokenSiteReportBrowserInfo.addons.set(addons)

        browserInfo.app?.let {
            BrokenSiteReportBrowserInfoApp.defaultUseragentString.set(it.defaultUserAgent)
        }

        BrokenSiteReportBrowserInfoApp.defaultLocales.set(browserInfo.locales)

        BrokenSiteReportBrowserInfoApp.fissionEnabled.set(browserInfo.platform.fissionEnabled)
        BrokenSiteReportBrowserInfoSystem.memory.set(browserInfo.platform.memoryMB)

        setBrowserInfoGraphicsMetrics(browserInfo.graphics)
        setBrowserInfoPrefsMetrics(browserInfo.prefs)
    }

    private fun setBrowserInfoGraphicsMetrics(graphicsInfo: WebCompatInfoDto.WebCompatBrowserDto.GraphicsDto?) {
        graphicsInfo?.let {
            it.devices?.let { devices ->
                BrokenSiteReportBrowserInfoGraphics.devicesJson.set(devices.toString())
            }

            BrokenSiteReportBrowserInfoGraphics.driversJson.set(it.drivers.toString())

            it.features?.let { features ->
                BrokenSiteReportBrowserInfoGraphics.featuresJson.set(features.toString())
            }

            it.hasTouchScreen?.let { hasTouchScreen ->
                BrokenSiteReportBrowserInfoGraphics.hasTouchScreen.set(hasTouchScreen)
            }

            it.monitors?.let { monitors ->
                BrokenSiteReportBrowserInfoGraphics.monitorsJson.set(monitors.toString())
            }
        }
    }

    private fun setBrowserInfoPrefsMetrics(prefsInfo: WebCompatInfoDto.WebCompatBrowserDto.PrefsDto) {
        BrokenSiteReportBrowserInfoPrefs.opaqueResponseBlocking.set(prefsInfo.browserOpaqueResponseBlocking)
        BrokenSiteReportBrowserInfoPrefs.installtriggerEnabled.set(prefsInfo.extensionsInstallTriggerEnabled)
        BrokenSiteReportBrowserInfoPrefs.softwareWebrender.set(prefsInfo.gfxWebRenderSoftware)
        BrokenSiteReportBrowserInfoPrefs.cookieBehavior.set(prefsInfo.networkCookieBehavior)
        BrokenSiteReportBrowserInfoPrefs.globalPrivacyControlEnabled.set(prefsInfo.privacyGlobalPrivacyControlEnabled)
        BrokenSiteReportBrowserInfoPrefs.resistFingerprintingEnabled.set(prefsInfo.privacyResistFingerprinting)
    }

    private fun setDevicePixelRatioMetrics(devicePixelRatio: Double) {
        BrokenSiteReportBrowserInfoGraphics.devicePixelRatio.set(devicePixelRatio.toString())
    }

    private fun setTabFrameworksMetrics(frameworks: WebCompatInfoDto.WebCompatFrameworksDto) {
        BrokenSiteReportTabInfoFrameworks.fastclick.set(frameworks.fastclick)
        BrokenSiteReportTabInfoFrameworks.marfeel.set(frameworks.marfeel)
        BrokenSiteReportTabInfoFrameworks.mobify.set(frameworks.mobify)
    }

    private fun setTabLanguageMetrics(languages: List<String>) {
        BrokenSiteReportTabInfo.languages.set(languages)
    }

    private fun setUrlMetrics(url: String) {
        BrokenSiteReport.url.set(url)
    }

    private fun setReasonMetrics(reason: WebCompatReporterState.BrokenSiteReason?) {
        reason?.let {
            BrokenSiteReport.breakageCategory.set(reason.name.lowercase())
        }
    }

    private fun setDescriptionMetrics(description: String) {
        BrokenSiteReport.description.set(description)
    }

    private fun setTabUserAgentMetrics(userAgent: String) {
        BrokenSiteReportTabInfo.useragentString.set(userAgent)
    }

    private fun setExperimentMetrics() {
        val items = mutableListOf<BrokenSiteReportBrowserInfo.ExperimentsObjectItem>()
        nimbusExperimentsProvider.activeExperiments.mapTo(items) { experiment ->
            BrokenSiteReportBrowserInfo.ExperimentsObjectItem(
                branch = nimbusExperimentsProvider.getExperimentBranch(experiment.slug),
                slug = experiment.slug,
                kind = "nimbusExperiment",
            )
        }

        BrokenSiteReportBrowserInfo.experiments.set(
            BrokenSiteReportBrowserInfo.ExperimentsObject(items),
        )
    }
}
