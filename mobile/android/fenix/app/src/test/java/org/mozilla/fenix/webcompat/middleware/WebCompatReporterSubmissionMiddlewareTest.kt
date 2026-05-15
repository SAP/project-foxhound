/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.webcompat.middleware

import androidx.test.ext.junit.runners.AndroidJUnit4
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.addJsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.EngineSession
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import mozilla.telemetry.glean.private.NoReasonCodes
import mozilla.telemetry.glean.private.PingType
import mozilla.telemetry.glean.testing.GleanTestRule
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.experiments.nimbus.internal.EnrolledExperiment
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
import org.mozilla.fenix.webcompat.fake.FakeWebCompatReporterMoreInfoSender
import org.mozilla.fenix.webcompat.store.WebCompatReporterAction
import org.mozilla.fenix.webcompat.store.WebCompatReporterState
import org.mozilla.fenix.webcompat.store.WebCompatReporterStore

@RunWith(AndroidJUnit4::class) // for GleanTestRule
class WebCompatReporterSubmissionMiddlewareTest {
    private val appStore: AppStore = mockk(relaxed = true)

    @get:Rule
    val gleanTestRule = GleanTestRule(testContext)

    @Before
    fun setUp() {
        // TODO(bug 1934931): Glean currently does not re-register custom pings
        // when the GleanTestRule automatically resets Glean after each test.
        // We do it manually here for the tests to work.
        val brokenSiteReport: PingType<NoReasonCodes> = PingType<NoReasonCodes>(
            name = "broken-site-report",
            includeClientId = false,
            sendIfEmpty = false,
            preciseTimestamps = true,
            includeInfoSections = true,
            enabled = true,
            schedulesPings = listOf(),
            reasonCodes = listOf(),
            followsCollectionEnabled = true,
            uploaderCapabilities = listOf(),
        )
    }

    @Test
    fun `GIVEN the URL is not changed WHEN WebCompatInfo is retrieved successfully THEN all report broken site pings are submitted`() = runTest {
        val nimbusExperimentsProvider: NimbusExperimentsProvider = FakeNimbusExperimentsProvider(
            activeExperiments = listOf(
                EnrolledExperiment(
                    featureIds = listOf(),
                    slug = "slug1",
                    userFacingName = "",
                    userFacingDescription = "",
                    branchSlug = "",
                ),
                EnrolledExperiment(
                    featureIds = listOf(),
                    slug = "slug2",
                    userFacingName = "",
                    userFacingDescription = "",
                    branchSlug = "",
                ),
            ),
            experimentBranchLambda = { it },
        )

        val store = createStore(
            enteredUrl = "https://www.mozilla.org",
            nimbusExperimentsProvider = nimbusExperimentsProvider,
            scope = this,
        )

        val job = Pings.brokenSiteReport.testBeforeNextSubmit {
            assertEquals(
                "basic",
                BrokenSiteReportTabInfoAntitracking.blockList.testGetValue(),
            )
            assertEquals(
                false,
                BrokenSiteReportTabInfoAntitracking.btpHasPurgedSite.testGetValue(),
            )
            assertEquals(
                "standard",
                BrokenSiteReportTabInfoAntitracking.etpCategory.testGetValue(),
            )
            assertEquals(
                false,
                BrokenSiteReportTabInfoAntitracking.hasMixedActiveContentBlocked.testGetValue(),
            )
            assertEquals(
                false,
                BrokenSiteReportTabInfoAntitracking.hasMixedDisplayContentBlocked.testGetValue(),
            )
            assertEquals(
                false,
                BrokenSiteReportTabInfoAntitracking.hasTrackingContentBlocked.testGetValue(),
            )
            assertEquals(
                false,
                BrokenSiteReportTabInfoAntitracking.isPrivateBrowsing.testGetValue(),
            )

            assertEquals(
                buildJsonArray {
                    addJsonObject {
                        put("id", "id.temp")
                        put("name", "name1")
                        put("temporary", true)
                        put("version", "version1")
                    }

                    addJsonObject {
                        put("id", "id.perm")
                        put("name", "name2")
                        put("temporary", false)
                        put("version", "version2")
                    }
                },
                BrokenSiteReportBrowserInfo.addons.testGetValue(),
            )

            assertEquals(
                buildJsonArray {
                    addJsonObject {
                        put("branch", "slug1")
                        put("kind", "nimbusExperiment")
                        put("slug", "slug1")
                    }

                    addJsonObject {
                        put("branch", "slug2")
                        put("kind", "nimbusExperiment")
                        put("slug", "slug2")
                    }
                },
                BrokenSiteReportBrowserInfo.experiments.testGetValue(),
            )

            assertEquals(
                "testDefaultUserAgent",
                BrokenSiteReportBrowserInfoApp.defaultUseragentString.testGetValue(),
            )

            assertEquals(
                """[{"id":"device1"},{"id":"device2"},{"id":"device3"}]""",
                BrokenSiteReportBrowserInfoGraphics.devicesJson.testGetValue(),
            )
            assertEquals(
                """[{"id":"driver1"},{"id":"driver2"},{"id":"driver3"}]""",
                BrokenSiteReportBrowserInfoGraphics.driversJson.testGetValue(),
            )
            assertEquals(
                """{"id":"feature1"}""",
                BrokenSiteReportBrowserInfoGraphics.featuresJson.testGetValue(),
            )
            assertEquals(
                true,
                BrokenSiteReportBrowserInfoGraphics.hasTouchScreen.testGetValue(),
            )
            assertEquals(
                """[{"id":"monitor1"},{"id":"monitor2"},{"id":"monitor3"}]""",
                BrokenSiteReportBrowserInfoGraphics.monitorsJson.testGetValue(),
            )

            assertEquals(
                listOf("en-CA", "en-US"),
                BrokenSiteReportBrowserInfoApp.defaultLocales.testGetValue(),
            )

            assertEquals(
                false,
                BrokenSiteReportBrowserInfoApp.fissionEnabled.testGetValue(),
            )
            assertEquals(
                1L,
                BrokenSiteReportBrowserInfoSystem.memory.testGetValue(),
            )

            assertEquals(
                false,
                BrokenSiteReportBrowserInfoPrefs.opaqueResponseBlocking.testGetValue(),
            )
            assertEquals(
                false,
                BrokenSiteReportBrowserInfoPrefs.installtriggerEnabled.testGetValue(),
            )
            assertEquals(
                false,
                BrokenSiteReportBrowserInfoPrefs.softwareWebrender.testGetValue(),
            )
            assertEquals(
                1L,
                BrokenSiteReportBrowserInfoPrefs.cookieBehavior.testGetValue(),
            )
            assertEquals(
                false,
                BrokenSiteReportBrowserInfoPrefs.globalPrivacyControlEnabled.testGetValue(),
            )
            assertEquals(
                false,
                BrokenSiteReportBrowserInfoPrefs.resistFingerprintingEnabled.testGetValue(),
            )

            assertEquals(
                "1.5",
                BrokenSiteReportBrowserInfoGraphics.devicePixelRatio.testGetValue(),
            )

            assertEquals(
                true,
                BrokenSiteReportTabInfoFrameworks.fastclick.testGetValue(),
            )
            assertEquals(
                true,
                BrokenSiteReportTabInfoFrameworks.marfeel.testGetValue(),
            )
            assertEquals(
                true,
                BrokenSiteReportTabInfoFrameworks.mobify.testGetValue(),
            )

            assertEquals(
                listOf("en-CA", "en-US"),
                BrokenSiteReportTabInfo.languages.testGetValue(),
            )

            assertEquals(
                "testUserAgent",
                BrokenSiteReportTabInfo.useragentString.testGetValue(),
            )

            assertEquals(store.state.enteredUrl, BrokenSiteReport.url.testGetValue())
            assertEquals(
                store.state.reason?.name?.lowercase(),
                BrokenSiteReport.breakageCategory.testGetValue(),
            )
            assertEquals(
                store.state.problemDescription,
                BrokenSiteReport.description.testGetValue(),
            )
        }

        store.dispatch(WebCompatReporterAction.SendReportClicked)
        testScheduler.advanceUntilIdle()
        job.join()
    }

    @Test
    fun `WHEN the report is sent successfully THEN appState is updated`() = runTest {
        val store = createStore(scope = this)

        store.dispatch(WebCompatReporterAction.SendReportClicked)
        testScheduler.advanceUntilIdle()

        verify { appStore.dispatch(AppAction.WebCompatAction.WebCompatReportSent) }
    }

    @Test
    fun `GIVEN the URL is changed WHEN WebCompatInfo is retrieved successfully THEN only non tab related report broken site pings are submitted`() = runTest {
        val nimbusExperimentsProvider: NimbusExperimentsProvider = FakeNimbusExperimentsProvider(
            activeExperiments = listOf(
                EnrolledExperiment(
                    featureIds = listOf(),
                    slug = "slug1",
                    userFacingName = "",
                    userFacingDescription = "",
                    branchSlug = "",
                ),
                EnrolledExperiment(
                    featureIds = listOf(),
                    slug = "slug2",
                    userFacingName = "",
                    userFacingDescription = "",
                    branchSlug = "",
                ),
            ),
            experimentBranchLambda = { it },
        )

        val store = createStore(
            enteredUrl = "https://example.com",
            scope = this,
            nimbusExperimentsProvider = nimbusExperimentsProvider,
        )

        val job = Pings.brokenSiteReport.testBeforeNextSubmit {
            assertNull(BrokenSiteReportTabInfoAntitracking.blockList.testGetValue())
            assertNull(BrokenSiteReportTabInfoAntitracking.btpHasPurgedSite.testGetValue())
            assertNull(BrokenSiteReportTabInfoAntitracking.etpCategory.testGetValue())
            assertNull(BrokenSiteReportTabInfoAntitracking.hasMixedActiveContentBlocked.testGetValue())
            assertNull(BrokenSiteReportTabInfoAntitracking.hasMixedDisplayContentBlocked.testGetValue())
            assertNull(BrokenSiteReportTabInfoAntitracking.hasTrackingContentBlocked.testGetValue())
            assertNull(BrokenSiteReportTabInfoAntitracking.isPrivateBrowsing.testGetValue())

            assertEquals(
                buildJsonArray {
                    addJsonObject {
                        put("id", "id.temp")
                        put("name", "name1")
                        put("temporary", true)
                        put("version", "version1")
                    }

                    addJsonObject {
                        put("id", "id.perm")
                        put("name", "name2")
                        put("temporary", false)
                        put("version", "version2")
                    }
                },
                BrokenSiteReportBrowserInfo.addons.testGetValue(),
            )

            assertEquals(
                buildJsonArray {
                    addJsonObject {
                        put("branch", "slug1")
                        put("kind", "nimbusExperiment")
                        put("slug", "slug1")
                    }

                    addJsonObject {
                        put("branch", "slug2")
                        put("kind", "nimbusExperiment")
                        put("slug", "slug2")
                    }
                },
                BrokenSiteReportBrowserInfo.experiments.testGetValue(),
            )

            assertEquals(
                "testDefaultUserAgent",
                BrokenSiteReportBrowserInfoApp.defaultUseragentString.testGetValue(),
            )

            assertEquals(
                """[{"id":"device1"},{"id":"device2"},{"id":"device3"}]""",
                BrokenSiteReportBrowserInfoGraphics.devicesJson.testGetValue(),
            )
            assertEquals(
                """[{"id":"driver1"},{"id":"driver2"},{"id":"driver3"}]""",
                BrokenSiteReportBrowserInfoGraphics.driversJson.testGetValue(),
            )
            assertEquals(
                """{"id":"feature1"}""",
                BrokenSiteReportBrowserInfoGraphics.featuresJson.testGetValue(),
            )
            assertEquals(
                true,
                BrokenSiteReportBrowserInfoGraphics.hasTouchScreen.testGetValue(),
            )
            assertEquals(
                """[{"id":"monitor1"},{"id":"monitor2"},{"id":"monitor3"}]""",
                BrokenSiteReportBrowserInfoGraphics.monitorsJson.testGetValue(),
            )

            assertEquals(
                listOf("en-CA", "en-US"),
                BrokenSiteReportBrowserInfoApp.defaultLocales.testGetValue(),
            )

            assertEquals(
                false,
                BrokenSiteReportBrowserInfoApp.fissionEnabled.testGetValue(),
            )
            assertEquals(
                1L,
                BrokenSiteReportBrowserInfoSystem.memory.testGetValue(),
            )

            assertEquals(
                false,
                BrokenSiteReportBrowserInfoPrefs.opaqueResponseBlocking.testGetValue(),
            )
            assertEquals(
                false,
                BrokenSiteReportBrowserInfoPrefs.installtriggerEnabled.testGetValue(),
            )
            assertEquals(
                false,
                BrokenSiteReportBrowserInfoPrefs.softwareWebrender.testGetValue(),
            )
            assertEquals(
                1L,
                BrokenSiteReportBrowserInfoPrefs.cookieBehavior.testGetValue(),
            )
            assertEquals(
                false,
                BrokenSiteReportBrowserInfoPrefs.globalPrivacyControlEnabled.testGetValue(),
            )
            assertEquals(
                false,
                BrokenSiteReportBrowserInfoPrefs.resistFingerprintingEnabled.testGetValue(),
            )

            assertEquals(
                "1.5",
                BrokenSiteReportBrowserInfoGraphics.devicePixelRatio.testGetValue(),
            )

            assertNull(BrokenSiteReportTabInfoFrameworks.fastclick.testGetValue())
            assertNull(BrokenSiteReportTabInfoFrameworks.marfeel.testGetValue())
            assertNull(BrokenSiteReportTabInfoFrameworks.mobify.testGetValue())

            assertNull(BrokenSiteReportTabInfo.languages.testGetValue())

            assertNotEquals(store.state.tabUrl, BrokenSiteReport.url.testGetValue())
            assertEquals(store.state.enteredUrl, BrokenSiteReport.url.testGetValue())
            assertEquals(
                store.state.reason?.name?.lowercase(),
                BrokenSiteReport.breakageCategory.testGetValue(),
            )
            assertEquals(
                store.state.problemDescription,
                BrokenSiteReport.description.testGetValue(),
            )

            assertNull(BrokenSiteReportTabInfo.useragentString.testGetValue())
        }

        store.dispatch(WebCompatReporterAction.SendReportClicked)
        testScheduler.advanceUntilIdle()

        job.join()
    }

    @Test
    fun `GIVEN WebCompatInfo is not retrieved successfully THEN only the form fields and active experiments are submitted`() = runTest {
        val webCompatReporterRetrievalService = object : WebCompatReporterRetrievalService {
            override suspend fun retrieveInfo(): WebCompatInfoDto? = null
        }

        val nimbusExperimentsProvider: NimbusExperimentsProvider = FakeNimbusExperimentsProvider(
            activeExperiments = listOf(
                EnrolledExperiment(
                    featureIds = listOf(),
                    slug = "slug1",
                    userFacingName = "",
                    userFacingDescription = "",
                    branchSlug = "",
                ),
            ),
            experimentBranchLambda = { it },
        )

        val store = createStore(
            service = webCompatReporterRetrievalService,
            scope = this,
            nimbusExperimentsProvider = nimbusExperimentsProvider,
        )

        val job = Pings.brokenSiteReport.testBeforeNextSubmit {
            assertNull(BrokenSiteReportTabInfoAntitracking.blockList.testGetValue())
            assertNull(BrokenSiteReportTabInfoAntitracking.btpHasPurgedSite.testGetValue())
            assertNull(BrokenSiteReportTabInfoAntitracking.etpCategory.testGetValue())
            assertNull(BrokenSiteReportTabInfoAntitracking.hasMixedActiveContentBlocked.testGetValue())
            assertNull(BrokenSiteReportTabInfoAntitracking.hasMixedDisplayContentBlocked.testGetValue())
            assertNull(BrokenSiteReportTabInfoAntitracking.hasTrackingContentBlocked.testGetValue())
            assertNull(BrokenSiteReportTabInfoAntitracking.isPrivateBrowsing.testGetValue())

            assertNull(BrokenSiteReportBrowserInfo.addons.testGetValue())

            assertNull(BrokenSiteReportBrowserInfoApp.defaultUseragentString.testGetValue())

            assertNull(BrokenSiteReportBrowserInfoGraphics.devicesJson.testGetValue())
            assertNull(BrokenSiteReportBrowserInfoGraphics.driversJson.testGetValue())
            assertNull(BrokenSiteReportBrowserInfoGraphics.featuresJson.testGetValue())
            assertNull(BrokenSiteReportBrowserInfoGraphics.hasTouchScreen.testGetValue())
            assertNull(BrokenSiteReportBrowserInfoGraphics.monitorsJson.testGetValue())
            assertNull(BrokenSiteReportBrowserInfoApp.defaultLocales.testGetValue())

            assertNull(BrokenSiteReportBrowserInfoApp.fissionEnabled.testGetValue())
            assertNull(BrokenSiteReportBrowserInfoSystem.memory.testGetValue())

            assertNull(BrokenSiteReportBrowserInfoPrefs.opaqueResponseBlocking.testGetValue())
            assertNull(BrokenSiteReportBrowserInfoPrefs.installtriggerEnabled.testGetValue())
            assertNull(BrokenSiteReportBrowserInfoPrefs.softwareWebrender.testGetValue())
            assertNull(BrokenSiteReportBrowserInfoPrefs.cookieBehavior.testGetValue())
            assertNull(BrokenSiteReportBrowserInfoPrefs.globalPrivacyControlEnabled.testGetValue())
            assertNull(BrokenSiteReportBrowserInfoPrefs.resistFingerprintingEnabled.testGetValue())

            assertNull(BrokenSiteReportBrowserInfoGraphics.devicePixelRatio.testGetValue())

            assertNull(BrokenSiteReportTabInfoFrameworks.fastclick.testGetValue())
            assertNull(BrokenSiteReportTabInfoFrameworks.marfeel.testGetValue())
            assertNull(BrokenSiteReportTabInfoFrameworks.mobify.testGetValue())

            assertNull(BrokenSiteReportTabInfo.languages.testGetValue())

            assertEquals(store.state.enteredUrl, BrokenSiteReport.url.testGetValue())
            assertEquals(
                store.state.reason?.name?.lowercase(),
                BrokenSiteReport.breakageCategory.testGetValue(),
            )
            assertEquals(
                store.state.problemDescription,
                BrokenSiteReport.description.testGetValue(),
            )

            assertEquals(
                buildJsonArray {
                    addJsonObject {
                        put("branch", "slug1")
                        put("kind", "nimbusExperiment")
                        put("slug", "slug1")
                    }
                },
                BrokenSiteReportBrowserInfo.experiments.testGetValue(),
            )

            assertNull(BrokenSiteReportTabInfo.useragentString.testGetValue())
        }

        store.dispatch(WebCompatReporterAction.SendReportClicked)
        testScheduler.advanceUntilIdle()
        job.join()
    }

    @Test
    fun `GIVEN Nimbus has no active experiments WHEN submitting a report THEN the experiments metric is empty`() = runTest {
        val nimbusExperimentsProvider: NimbusExperimentsProvider = FakeNimbusExperimentsProvider(activeExperiments = emptyList())

        val store = createStore(
            service = FakeWebCompatReporterRetrievalService(),
            scope = this,
            nimbusExperimentsProvider = nimbusExperimentsProvider,
        )

        val job = Pings.brokenSiteReport.testBeforeNextSubmit {
            val experiments = BrokenSiteReportBrowserInfo.experiments.testGetValue()

            assertNotNull(experiments)

            assertEquals(
                buildJsonArray { },
                experiments,
            )
        }

        store.dispatch(WebCompatReporterAction.SendReportClicked)
        testScheduler.advanceUntilIdle()

        job.join()
    }

    @Test
    fun `WHEN send more info is clicked THEN more WebCompat info is sent`() = runTest {
        var moreWebCompatInfoSent = false
        val webCompatReporterMoreInfoSender = object : WebCompatReporterMoreInfoSender {
            override suspend fun sendMoreWebCompatInfo(
                reason: WebCompatReporterState.BrokenSiteReason?,
                problemDescription: String?,
                enteredUrl: String?,
                tabUrl: String?,
                engineSession: EngineSession?,
            ) {
                moreWebCompatInfoSent = true
            }
        }

        val tab = createTab(
            url = "https://www.mozilla.org",
            id = "test-tab",
            engineSession = mock(),
        )
        val browserStore = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(tab),
                selectedTabId = tab.id,
            ),
        )

        val captureActionsMiddleware =
            CaptureActionsMiddleware<WebCompatReporterState, WebCompatReporterAction>()

        val store = WebCompatReporterStore(
            initialState = WebCompatReporterState(
                tabUrl = "https://www.mozilla.org",
                enteredUrl = "https://www.mozilla.org/en-US/firefox/new/",
                reason = WebCompatReporterState.BrokenSiteReason.Slow,
                problemDescription = "",
            ),
            middleware = listOf(
                captureActionsMiddleware,
                createMiddleware(
                    browserStore = browserStore,
                    service = FakeWebCompatReporterRetrievalService(),
                    scope = this,
                    webCompatReporterMoreInfoSender = webCompatReporterMoreInfoSender,
                ),
            ),
        )

        store.dispatch(WebCompatReporterAction.AddMoreInfoClicked)
        testScheduler.advanceUntilIdle()

        assertTrue(moreWebCompatInfoSent)
        captureActionsMiddleware.assertFirstAction(WebCompatReporterAction.SendMoreInfoSubmitted::class)
    }

    @Test
    fun `WHEN open preview is clicked AND enteredUrl matches tab url THEN preview contains full raw JSON plus form fields`() = runTest {
        val capture = CaptureActionsMiddleware<WebCompatReporterState, WebCompatReporterAction>()

        val store = WebCompatReporterStore(
            initialState = WebCompatReporterState(
                tabUrl = "https://www.mozilla.org",
                enteredUrl = "https://www.mozilla.org",
                reason = WebCompatReporterState.BrokenSiteReason.Slow,
                problemDescription = "",
            ),
            middleware = listOf(
                capture,
                createMiddleware(
                    browserStore = BrowserStore(
                        BrowserState(
                        tabs = listOf(createTab("https://www.mozilla.org", id = "t1")),
                            selectedTabId = "t1",
                        ),
                    ),
                    scope = this,
                    service = FakeWebCompatReporterRetrievalService(),
                    webCompatReporterMoreInfoSender = FakeWebCompatReporterMoreInfoSender(),
                ),
            ),
        )

        store.dispatch(WebCompatReporterAction.OpenPreviewClicked)
        testScheduler.advanceUntilIdle()

        val actual = store.state.previewJSON
        val expected = JSONObject(
            Json.encodeToString(
                (FakeWebCompatReporterRetrievalService()).retrieveInfo(),
            ),
        ).apply {
            put("enteredUrl", "https://www.mozilla.org")
            put("reason", WebCompatReporterState.BrokenSiteReason.Slow)
            put("problemDescription", "")
        }

        assertEquals(expected.toString(), actual)
    }

    private fun createStore(
        enteredUrl: String = "https://www.mozilla.org",
        service: WebCompatReporterRetrievalService = FakeWebCompatReporterRetrievalService(),
        webCompatReporterMoreInfoSender: WebCompatReporterMoreInfoSender = FakeWebCompatReporterMoreInfoSender(),
        nimbusExperimentsProvider: NimbusExperimentsProvider = FakeNimbusExperimentsProvider(),
        scope: CoroutineScope,
    ): WebCompatReporterStore {
        val engineSession: EngineSession = mock()
        val tab = createTab(
            url = "",
            id = "test-tab",
            engineSession = engineSession,
        )
        val browserStore = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(tab),
                selectedTabId = tab.id,
            ),
        )

        return WebCompatReporterStore(
            initialState = WebCompatReporterState(
                tabUrl = "",
                enteredUrl = enteredUrl,
                reason = WebCompatReporterState.BrokenSiteReason.Slow,
                problemDescription = "",
            ),
            middleware = listOf(
                createMiddleware(
                    browserStore = browserStore,
                    service = service,
                    webCompatReporterMoreInfoSender = webCompatReporterMoreInfoSender,
                    nimbusExperimentsProvider = nimbusExperimentsProvider,
                    scope = scope,
                ),
            ),
        )
    }

    private fun createMiddleware(
        browserStore: BrowserStore,
        service: WebCompatReporterRetrievalService,
        webCompatReporterMoreInfoSender: WebCompatReporterMoreInfoSender,
        scope: CoroutineScope,
        nimbusExperimentsProvider: NimbusExperimentsProvider = FakeNimbusExperimentsProvider(),
    ) = WebCompatReporterSubmissionMiddleware(
        appStore = appStore,
        browserStore = browserStore,
        webCompatReporterRetrievalService = service,
        webCompatReporterMoreInfoSender = webCompatReporterMoreInfoSender,
        scope = scope,
        nimbusExperimentsProvider = nimbusExperimentsProvider,
    )

    private class FakeWebCompatReporterRetrievalService : WebCompatReporterRetrievalService {

        override suspend fun retrieveInfo(): WebCompatInfoDto =
            WebCompatInfoDto(
                antitracking = WebCompatInfoDto.WebCompatAntiTrackingDto(
                    blockList = "basic",
                    btpHasPurgedSite = false,
                    etpCategory = "standard",
                    hasMixedActiveContentBlocked = false,
                    hasMixedDisplayContentBlocked = false,
                    hasTrackingContentBlocked = false,
                    isPrivateBrowsing = false,
                    blockedOrigins = listOf("https://exampleBlockedURLByETP.com"),
                ),
                browser = WebCompatInfoDto.WebCompatBrowserDto(
                    addons = listOf(
                        WebCompatInfoDto.WebCompatBrowserDto.AddonDto(
                            id = "id.temp",
                            name = "name1",
                            temporary = true,
                            version = "version1",
                        ),
                        WebCompatInfoDto.WebCompatBrowserDto.AddonDto(
                            id = "id.perm",
                            name = "name2",
                            temporary = false,
                            version = "version2",
                        ),
                    ),
                    app = WebCompatInfoDto.WebCompatBrowserDto.AppDto(
                        defaultUserAgent = "testDefaultUserAgent",
                    ),
                    graphics = WebCompatInfoDto.WebCompatBrowserDto.GraphicsDto(
                        devices = buildJsonArray {
                            addJsonObject {
                                put("id", JsonPrimitive("device1"))
                            }
                            addJsonObject {
                                put("id", JsonPrimitive("device2"))
                            }
                            addJsonObject {
                                put("id", JsonPrimitive("device3"))
                            }
                        },
                        drivers = buildJsonArray {
                            addJsonObject {
                                put("id", JsonPrimitive("driver1"))
                            }
                            addJsonObject {
                                put("id", JsonPrimitive("driver2"))
                            }
                            addJsonObject {
                                put("id", JsonPrimitive("driver3"))
                            }
                        },
                        features = buildJsonObject { put("id", JsonPrimitive("feature1")) },
                        hasTouchScreen = true,
                        monitors = buildJsonArray {
                            addJsonObject {
                                put("id", JsonPrimitive("monitor1"))
                            }
                            addJsonObject {
                                put("id", JsonPrimitive("monitor2"))
                            }
                            addJsonObject {
                                put("id", JsonPrimitive("monitor3"))
                            }
                        },
                    ),
                    locales = listOf("en-CA", "en-US"),
                    platform = WebCompatInfoDto.WebCompatBrowserDto.PlatformDto(
                        fissionEnabled = false,
                        memoryMB = 1,
                    ),
                    prefs = WebCompatInfoDto.WebCompatBrowserDto.PrefsDto(
                        browserOpaqueResponseBlocking = false,
                        extensionsInstallTriggerEnabled = false,
                        gfxWebRenderSoftware = false,
                        networkCookieBehavior = 1,
                        privacyGlobalPrivacyControlEnabled = false,
                        privacyResistFingerprinting = false,
                    ),
                ),
                url = "https://www.mozilla.org",
                devicePixelRatio = 1.5,
                frameworks = WebCompatInfoDto.WebCompatFrameworksDto(
                    fastclick = true,
                    marfeel = true,
                    mobify = true,
                ),
                languages = listOf("en-CA", "en-US"),
                userAgent = "testUserAgent",
            )
    }
}
