/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.cfr

import androidx.annotation.VisibleForTesting
import androidx.core.net.toUri
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.CookieBannerAction
import mozilla.components.browser.state.action.TrackingProtectionAction
import mozilla.components.browser.state.selector.findTabOrCustomTabOrSelectedTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.concept.engine.EngineSession
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import mozilla.telemetry.glean.private.NoExtras
import org.mozilla.experiments.nimbus.internal.FeatureHolder
import org.mozilla.focus.GleanMetrics.CookieBanner
import org.mozilla.focus.cookiebanner.CookieBannerOption
import org.mozilla.focus.ext.truncatedHost
import org.mozilla.focus.nimbus.FocusNimbus
import org.mozilla.focus.nimbus.Onboarding
import org.mozilla.focus.state.AppAction
import org.mozilla.focus.state.AppStore
import org.mozilla.focus.utils.Settings

/**
 * Middleware used to intercept browser store actions in order to decide when should we display a specific CFR
 */
class CfrMiddleware(
    private val appStore: AppStore,
    private val settings: Settings,
    private val onboardingProvider: () -> FeatureHolder<Onboarding> = {
        FocusNimbus.features.onboarding
    },
) : Middleware<BrowserState, BrowserAction> {
    private var tpExposureAlreadyRecorded = false

    override fun invoke(
        store: Store<BrowserState, BrowserAction>,
        next: (BrowserAction) -> Unit,
        action: BrowserAction,
    ) {
        next(action)

        if (onboardingProvider().value().isCfrEnabled) {
            showCookieBannerCfr(action)
            showTrackingProtectionCfr(action, store.state)
        }
    }

    private fun showCookieBannerCfr(
        action: BrowserAction,
    ) {
        if (action is CookieBannerAction.UpdateStatusAction &&
            shouldShowCookieBannerCfr(action) &&
            otherCfrHasBeenShown()
        ) {
            CookieBanner.cookieBannerCfrShown.record(NoExtras())
            appStore.dispatch(
                AppAction.ShowCookieBannerCfrChange(true),
            )
        }
    }

    private fun showTrackingProtectionCfr(
        action: BrowserAction,
        state: BrowserState,
    ) {
        if (shouldShowCfrForTrackingProtection(action = action, browserState = state)) {
            if (tpExposureAlreadyRecorded) {
                // do not record exposure twice
            } else {
                FocusNimbus.features.onboarding.recordExposure()
                tpExposureAlreadyRecorded = true
            }

            appStore.dispatch(
                AppAction.ShowTrackingProtectionCfrChange(
                    mapOf((action as TrackingProtectionAction.TrackerBlockedAction).tabId to true),
                ),
            )
        }
    }

    @VisibleForTesting
    internal fun isMozillaUrl(browserState: BrowserState): Boolean {
        return browserState.findTabOrCustomTabOrSelectedTab(
            browserState.selectedTabId,
        )?.content?.url?.toUri()?.truncatedHost()?.substringBefore(".") == ("mozilla")
    }

    private fun isActionSecure(action: BrowserAction, browserState: BrowserState) =
        action is TrackingProtectionAction.TrackerBlockedAction &&
                action.tabId == browserState.selectedTabId &&
                isSessionSecure(browserState)

    private fun isSessionSecure(browserState: BrowserState) =
        browserState.findTabOrCustomTabOrSelectedTab(
            browserState.selectedTabId,
        )?.content?.securityInfo?.isSecure == true

    private fun shouldShowCfrForTrackingProtection(
        action: BrowserAction,
        browserState: BrowserState,
    ) = (
            isActionSecure(action = action, browserState = browserState) &&
                    !isMozillaUrl(browserState = browserState) &&
                    settings.shouldShowCfrForTrackingProtection &&
                    !appStore.state.showEraseTabsCfr
            )

    private fun otherCfrHasBeenShown(): Boolean {
        return (
            !settings.shouldShowCfrForTrackingProtection &&
                !appStore.state.showEraseTabsCfr
            )
    }

    private fun shouldShowCookieBannerCfr(action: CookieBannerAction.UpdateStatusAction): Boolean {
        return (
            !settings.isFirstRun &&
                settings.shouldShowCookieBannerCfr &&
                settings.isCookieBannerEnable &&
                settings.getCurrentCookieBannerOptionFromSharePref() ==
                CookieBannerOption.CookieBannerRejectAll() &&
                action.status == EngineSession.CookieBannerHandlingStatus.HANDLED
            )
    }
}
