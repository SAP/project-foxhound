/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.bindings

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.ReaderState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.compose.browser.toolbar.BrowserToolbarCFR
import mozilla.components.compose.browser.toolbar.store.BrowserDisplayToolbarAction.ToolbarCFRShown
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarAction
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarState
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarStore
import mozilla.components.compose.browser.toolbar.store.DisplayState
import mozilla.components.concept.engine.EngineSession
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import mozilla.components.support.test.fakes.engine.TestEngineSession
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.R
import org.mozilla.fenix.settings.summarize.FakeSummarizationFeatureConfiguration
import org.mozilla.fenix.summarization.eligibility.SummarizationEligibilityChecker
import org.mozilla.fenix.summarization.onboarding.SummarizationFeatureDiscoveryConfiguration

class SummarizeToolbarCFRBindingTest {

    private val testDispatcher = StandardTestDispatcher()

    @Test
    fun `GIVEN all conditions met WHEN tab is selected THEN cfr is dispatched to toolbar store`() =
        runTest(testDispatcher) {
            val actions = mutableListOf<BrowserToolbarAction>()
            val binding = createBindingWithEligibleTab(
                browserToolbarStore = BrowserToolbarStore(
                    middleware = listOf(actionListenerMiddleware(actions)),
                ),
            )
            binding.start()

            testDispatcher.scheduler.advanceUntilIdle()

            val expectedAddedCfr = BrowserToolbarCFR(
                tag = SummarizeToolbarCFRBinding.CFR_TAG_SHAKE_TO_SUMMARIZE,
                enabled = true,
                title = null,
                description = R.string.browser_toolbar_summarize_cfr_description,
            )
            assertEquals(
                expectedAddedCfr,
                actions.filterIsInstance<ToolbarCFRShown>()
                    .first()
                    .cfr,
            )
        }

    @Test
    fun `GIVEN all conditions met WHEN cfr is shown THEN cfr exposure event is cached`() =
        runTest(testDispatcher) {
            val featureDiscoverySettings = FakeSummarizationFeatureConfiguration(
                shouldToolbarShowCfr = true,
            )
            val binding = createBindingWithEligibleTab(
                featureDiscoverySettings = featureDiscoverySettings,
            )
            binding.start()

            testDispatcher.scheduler.advanceUntilIdle()

            assertEquals(1, featureDiscoverySettings.cfrExposureCount)
        }

    @Test
    fun `GIVEN selected tab is private WHEN tab is selected THEN cfr is not shown`() =
        runTest(testDispatcher) {
            val tab = createTab(
                url = "https://www.mozilla.org",
                id = "1",
                private = true,
                readerState = ReaderState(readerable = true),
                engineSession = TestEngineSession(),
            )

            val actions = mutableListOf<BrowserToolbarAction>()
            val binding = createBinding(
                browserStore = BrowserStore(BrowserState(tabs = listOf(tab), selectedTabId = "1")),
                browserToolbarStore = BrowserToolbarStore(
                    middleware = listOf(actionListenerMiddleware(actions)),
                ),
            )
            binding.start()

            testDispatcher.scheduler.advanceUntilIdle()

            assertTrue(
                "Expected that the ToolbarCFRAdded action is not dispatched. " +
                        "Recorded actions are: $actions",
                actions.filterIsInstance<ToolbarCFRShown>().isEmpty(),
            )
        }

    @Test
    fun `GIVEN shouldToolbarShowCfr is false WHEN tab is selected THEN cfr is not shown`() =
        runTest(testDispatcher) {
            val tab = createTab(
                url = "https://www.mozilla.org",
                id = "1",
                readerState = ReaderState(readerable = true),
                engineSession = TestEngineSession(),
            )
            val actions = mutableListOf<BrowserToolbarAction>()
            val binding = createBinding(
                featureDiscoverySettings = FakeSummarizationFeatureConfiguration(
                    shouldToolbarShowCfr = false,
                ),
                testEligibilityChecker = object : SummarizationEligibilityChecker {
                    override suspend fun check(session: EngineSession): Result<Boolean> =
                        Result.success(true)

                    override suspend fun checkLanguage(session: EngineSession): Result<Boolean> {
                        TODO("Not yet implemented")
                    }
                },
                browserStore = BrowserStore(BrowserState(tabs = listOf(tab), selectedTabId = "1")),
                browserToolbarStore = BrowserToolbarStore(
                    middleware = listOf(actionListenerMiddleware(actions)),
                ),
            )
            binding.start()

            testDispatcher.scheduler.advanceUntilIdle()

            assertTrue(
                "Expected that the ToolbarCFRAdded action is not dispatched. " +
                        "Recorded actions are: $actions",
                actions.filterIsInstance<ToolbarCFRShown>().isEmpty(),
            )
        }

    @Test
    fun `GIVEN tab is not readerable WHEN tab is selected THEN cfr is not shown`() =
        runTest(testDispatcher) {
            val tab = createTab(
                url = "https://www.mozilla.org",
                id = "1",
                readerState = ReaderState(readerable = false),
                engineSession = TestEngineSession(),
            )

            val actions = mutableListOf<BrowserToolbarAction>()
            val binding = createBinding(
                browserStore = BrowserStore(
                    BrowserState(tabs = listOf(tab), selectedTabId = "1"),
                ),
                browserToolbarStore = BrowserToolbarStore(
                    middleware = listOf(actionListenerMiddleware(actions)),
                ),
            )
            binding.start()

            testDispatcher.scheduler.advanceUntilIdle()

            assertTrue(
                "Expected that the ToolbarCFRAdded action is not dispatched. " +
                        "Recorded actions are: $actions",
                actions.filterIsInstance<ToolbarCFRShown>().isEmpty(),
            )
        }

    @Test
    fun `GIVEN tab is still loading WHEN tab is selected THEN cfr is not shown`() =
        runTest(testDispatcher) {
            val tab = createTab(
                url = "https://www.mozilla.org",
                id = "1",
                readerState = ReaderState(readerable = true),
                engineSession = TestEngineSession(),
            )

            val actions = mutableListOf<BrowserToolbarAction>()
            val binding = createBinding(
                browserStore = BrowserStore(
                    BrowserState(
                        tabs = listOf(
                            tab.copy(content = tab.content.copy(loading = true, progress = 50)),
                        ),
                        selectedTabId = "1",
                    ),
                ),
                browserToolbarStore = BrowserToolbarStore(
                    middleware = listOf(actionListenerMiddleware(actions)),
                ),
            )
            binding.start()

            testDispatcher.scheduler.advanceUntilIdle()

            assertTrue(
                "Expected that the ToolbarCFRAdded action is not dispatched. " +
                        "Recorded actions are: $actions",
                actions.filterIsInstance<ToolbarCFRShown>().isEmpty(),
            )
        }

    @Test
    fun `GIVEN eligibility check fails WHEN tab is selected THEN cfr is not shown`() =
        runTest(testDispatcher) {
            val tab = createTab(
                url = "https://www.mozilla.org",
                id = "1",
                readerState = ReaderState(readerable = true),
                engineSession = TestEngineSession(),
            )
            val browserStore = BrowserStore(
                BrowserState(tabs = listOf(tab), selectedTabId = "1"),
            )

            val actions = mutableListOf<BrowserToolbarAction>()
            val binding = createBinding(
                testEligibilityChecker = object : SummarizationEligibilityChecker {
                    override suspend fun check(session: EngineSession): Result<Boolean> =
                        Result.failure(Exception("Not eligible"))

                    override suspend fun checkLanguage(session: EngineSession): Result<Boolean> {
                        TODO("Not yet implemented")
                    }
                },
                browserStore = browserStore,
                browserToolbarStore = BrowserToolbarStore(
                    middleware = listOf(actionListenerMiddleware(actions)),
                ),
            )
            binding.start()

            testDispatcher.scheduler.advanceUntilIdle()

            assertTrue(
                "Expected that the ToolbarCFRAdded action is not dispatched. " +
                        "Recorded actions are: $actions",
                actions.filterIsInstance<ToolbarCFRShown>().isEmpty(),
            )
        }

    @Test
    fun `GIVEN another cfr is already active WHEN tab becomes eligible THEN cfr is not shown`() =
        runTest(testDispatcher) {
            val existingCfr = BrowserToolbarCFR(
                tag = "existing-tag",
                enabled = true,
                title = null,
                description = R.string.browser_toolbar_summarize_cfr_description,
            )

            val actions = mutableListOf<BrowserToolbarAction>()
            val binding = createBindingWithEligibleTab(
                browserToolbarStore = BrowserToolbarStore(
                    initialState = BrowserToolbarState(displayState = DisplayState(cfr = existingCfr)),
                    middleware = listOf(actionListenerMiddleware(actions)),
                ),
            )
            binding.start()

            testDispatcher.scheduler.advanceUntilIdle()

            assertTrue(
                "Expected that the ToolbarCFRAdded action is not dispatched. " +
                        "Recorded actions are: $actions",
                actions.filterIsInstance<ToolbarCFRShown>().isEmpty(),
            )
        }

    @Test
    fun `GIVEN no selected tab WHEN state is observed THEN cfr is not shown`() =
        runTest(testDispatcher) {
            val tab = createTab(
                url = "https://www.mozilla.org",
                id = "1",
                readerState = ReaderState(readerable = true),
                engineSession = TestEngineSession(),
            )

            val actions = mutableListOf<BrowserToolbarAction>()
            val binding = createBinding(
                browserStore = BrowserStore(
                    BrowserState(tabs = listOf(tab), selectedTabId = null),
                ),
                browserToolbarStore = BrowserToolbarStore(
                    middleware = listOf(actionListenerMiddleware(actions)),
                ),
            )
            binding.start()

            testDispatcher.scheduler.advanceUntilIdle()

            assertTrue(
                "Expected that the ToolbarCFRAdded action is not dispatched. " +
                        "Recorded actions are: $actions",
                actions.filterIsInstance<ToolbarCFRShown>().isEmpty(),
            )
        }

    private fun createBindingWithEligibleTab(
        eligibilityChecker: SummarizationEligibilityChecker = object : SummarizationEligibilityChecker {
            override suspend fun check(session: EngineSession): Result<Boolean> =
                Result.success(true)

            override suspend fun checkLanguage(session: EngineSession): Result<Boolean> {
                TODO("Not yet implemented")
            }
        },
        featureDiscoverySettings: FakeSummarizationFeatureConfiguration = FakeSummarizationFeatureConfiguration(
            shouldToolbarShowCfr = true,
        ),
        browserStore: BrowserStore = BrowserStore(
            BrowserState(
                tabs = listOf(
                    createTab(
                        url = "https://www.mozilla.org",
                        id = "1",
                        readerState = ReaderState(readerable = true),
                        engineSession = TestEngineSession(),
                    ),
                ),
                selectedTabId = "1",
            ),
        ),
        browserToolbarStore: BrowserToolbarStore = BrowserToolbarStore(),
    ): SummarizeToolbarCFRBinding {
        return SummarizeToolbarCFRBinding(
            featureDiscovery = featureDiscoverySettings,
            browserToolbarStore = browserToolbarStore,
            eligibilityChecker = eligibilityChecker,
            mainDispatcher = testDispatcher,
            browserStore = browserStore,
            ioDispatcher = testDispatcher,
        )
    }

    private fun createBinding(
        featureDiscoverySettings: SummarizationFeatureDiscoveryConfiguration = FakeSummarizationFeatureConfiguration(
            shouldToolbarShowCfr = true,
        ),
        browserStore: BrowserStore = BrowserStore(),
        browserToolbarStore: BrowserToolbarStore = BrowserToolbarStore(),
        testEligibilityChecker: SummarizationEligibilityChecker = object : SummarizationEligibilityChecker {
            override suspend fun check(session: EngineSession): Result<Boolean> =
                Result.success(true)

            override suspend fun checkLanguage(session: EngineSession): Result<Boolean> {
                TODO("Not yet implemented")
            }
        },
    ): SummarizeToolbarCFRBinding {
        return SummarizeToolbarCFRBinding(
            featureDiscovery = featureDiscoverySettings,
            browserToolbarStore = browserToolbarStore,
            eligibilityChecker = testEligibilityChecker,
            browserStore = browserStore,
            mainDispatcher = testDispatcher,
            ioDispatcher = testDispatcher,
        )
    }

    private fun actionListenerMiddleware(
        actions: MutableList<BrowserToolbarAction>,
    ): Middleware<BrowserToolbarState, BrowserToolbarAction> {
        return object : Middleware<BrowserToolbarState, BrowserToolbarAction> {
            override fun invoke(
                context: Store<BrowserToolbarState, BrowserToolbarAction>,
                next: (BrowserToolbarAction) -> Unit,
                action: BrowserToolbarAction,
            ) {
                actions.add(action)
            }
        }
    }
}
