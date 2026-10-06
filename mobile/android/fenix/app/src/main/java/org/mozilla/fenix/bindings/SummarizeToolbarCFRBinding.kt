/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.bindings

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.filterNot
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.map
import mozilla.components.browser.state.selector.selectedTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.compose.browser.toolbar.BrowserToolbarCFR
import mozilla.components.compose.browser.toolbar.store.BrowserDisplayToolbarAction
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarStore
import mozilla.components.lib.state.helpers.AbstractBinding
import org.mozilla.fenix.R
import org.mozilla.fenix.summarization.eligibility.SummarizationEligibilityChecker
import org.mozilla.fenix.summarization.onboarding.SummarizationFeatureDiscoveryConfiguration
import org.mozilla.fenix.summarization.onboarding.SummarizeDiscoveryEvent
import org.mozilla.fenix.tabstray.ext.isNormalTab

/**
 * A [BrowserStore] binding that observes the selected tab and shows a "Shake to Summarize"
 * Contextual Feature Recommendation (CFR) in the toolbar when the page content is eligible
 * for summarization for the first time.
 *
 * This Binding should be used in [org.mozilla.fenix.browser.BrowserFragment] to ensure that we
 * don't show it in a custom tab.
 *
 * The CFR is shown only when all of the following conditions are met:
 * - The selected tab is a normal (non-private) tab.
 * - The feature discovery settings indicate the CFR should be shown.
 * - The page is readerable and has finished loading.
 * - The page content passes the summarization eligibility check (e.g. word count).
 * - No other CFR is currently active in the toolbar.
 *
 * When the CFR is displayed, a [SummarizeDiscoveryEvent.CfrExposure] event is recorded.
 *
 * @param featureDiscovery Configuration controlling feature discovery state and events.
 * @param browserToolbarStore The toolbar store used to dispatch CFR actions.
 * @param eligibilityChecker Checks whether the current page content is eligible for summarization.
 * @param browserStore The [BrowserStore] to observe for tab state changes.
 * @param mainDispatcher The dispatcher used for main-thread work.
 * @param ioDispatcher The dispatcher used for IO-bound work such as reading shared preferences.
 */
class SummarizeToolbarCFRBinding(
    private val featureDiscovery: SummarizationFeatureDiscoveryConfiguration,
    private val browserToolbarStore: BrowserToolbarStore,
    private val eligibilityChecker: SummarizationEligibilityChecker,
    browserStore: BrowserStore,
    mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : AbstractBinding<BrowserState>(browserStore, mainDispatcher) {

    override suspend fun onState(flow: Flow<BrowserState>) {
        flow.filter { it.selectedTab?.isNormalTab() == true }
            .map { requireNotNull(it.selectedTab) }
            .filter { featureDiscovery.shouldToolbarShowCfr }
            // summarize settings is an IO call to shared prefs
            .flowOn(ioDispatcher)
            .filterSummarizable()
            .collect { summarizable ->
                // if the content is summarizable, and
                // there is no existing CFR in the toolbar, then we add ours
                val existingEnabledCfr =
                    browserToolbarStore.state.displayState.cfr?.enabled ?: false
                if (summarizable && !existingEnabledCfr) {
                    browserToolbarStore.dispatch(
                        BrowserDisplayToolbarAction.ToolbarCFRShown(
                            cfr = BrowserToolbarCFR(
                                tag = CFR_TAG_SHAKE_TO_SUMMARIZE,
                                enabled = true,
                                title = null,
                                description = R.string.browser_toolbar_summarize_cfr_description,
                            ),
                        ),
                    )
                    featureDiscovery.cacheDiscoveryEvent(
                        event = SummarizeDiscoveryEvent.CfrExposure,
                    )
                }
            }
    }

    /**
     * Filters the flow and returns a boolean indicating whether or not the content is summarizable
     */
    private fun Flow<TabSessionState>.filterSummarizable(): Flow<Boolean> {
        return this
            .filter { it.readerState.readerable }
            .filterNot { it.content.loading && it.content.progress != CONTENT_MAX_PROGRESS }
            .distinctUntilChanged()
            .map { tabSessionState ->
                tabSessionState.isEligibleForSummarization()
            }
            .flowOn(mainDispatcher)
    }

    private suspend fun TabSessionState?.isEligibleForSummarization(): Boolean {
        val session = this?.engineState?.engineSession ?: return false

        return eligibilityChecker.check(session)
            .getOrNull() ?: false
    }

    /**
     * Dismiss the S2S CFR if it exists
     */
    fun maybeDismissCfr() {
        val shakeToSummarizeCfrTag = browserToolbarStore.state.displayState.cfr?.tag
        if (shakeToSummarizeCfrTag == CFR_TAG_SHAKE_TO_SUMMARIZE) {
            browserToolbarStore.dispatch(
                action = BrowserDisplayToolbarAction.ToolbarCFRDismissed(shakeToSummarizeCfrTag),
            )
        }
    }

    internal companion object {
        private const val CONTENT_MAX_PROGRESS = 100
        const val CFR_TAG_SHAKE_TO_SUMMARIZE = "shake-to-summarize"
    }
}
