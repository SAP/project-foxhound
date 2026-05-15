/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.onboarding.store

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.GleanMetrics.Onboarding
import org.mozilla.fenix.onboarding.OnboardingReason

/**
 * [Middleware] for recording telemetry based on [PrivacyPreferencesAction]s.
 */
class PrivacyPreferencesTelemetryMiddleware(
    private val installSource: String,
) :
    Middleware<PrivacyPreferencesState, PrivacyPreferencesAction> {
    override fun invoke(
        store: Store<PrivacyPreferencesState, PrivacyPreferencesAction>,
        next: (PrivacyPreferencesAction) -> Unit,
        action: PrivacyPreferencesAction,
    ) {
        next(action)

        when (action) {
            is PrivacyPreferencesAction.CrashReportingPreferenceUpdatedTo ->
                Onboarding.privacyPreferencesModalCrashReportingEnabled.record(
                    Onboarding.PrivacyPreferencesModalCrashReportingEnabledExtra(
                        onboardingReason = OnboardingReason.NEW_USER.value,
                        value = action.enabled,
                        installSource = installSource,
                    ),
                )

            is PrivacyPreferencesAction.UsageDataPreferenceUpdatedTo ->
                Onboarding.privacyPreferencesModalUsageDataEnabled.record(
                    Onboarding.PrivacyPreferencesModalUsageDataEnabledExtra(
                        onboardingReason = OnboardingReason.NEW_USER.value,
                        value = action.enabled,
                        installSource = installSource,
                    ),
                )

            is PrivacyPreferencesAction.CrashReportingLearnMore ->
                Onboarding.privacyPreferencesModalCrashReportingLearnMore.record(
                    extra = Onboarding.PrivacyPreferencesModalCrashReportingLearnMoreExtra(
                        onboardingReason = OnboardingReason.NEW_USER.value,
                        installSource = installSource,
                    ),
                )

            is PrivacyPreferencesAction.UsageDataUserLearnMore ->
                Onboarding.privacyPreferencesModalUsageDataLearnMore.record(
                    extra = Onboarding.PrivacyPreferencesModalUsageDataLearnMoreExtra(
                        onboardingReason = OnboardingReason.NEW_USER.value,
                        installSource = installSource,
                    ),
                )

            // no-ops
            is PrivacyPreferencesAction.Init -> {}
        }
    }
}
