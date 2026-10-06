/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.store

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.GleanMetrics.TermsOfUse
import org.mozilla.fenix.termsofuse.TOU_VERSION

internal class TermsOfUsePromptTelemetryMiddleware :
    Middleware<TermsOfUsePromptState, TermsOfUsePromptAction> {
    override fun invoke(
        store: Store<TermsOfUsePromptState, TermsOfUsePromptAction>,
        next: (TermsOfUsePromptAction) -> Unit,
        action: TermsOfUsePromptAction,
    ) {
        next(action)

        when (action) {
            is TermsOfUsePromptAction.OnAcceptClicked -> {
                TermsOfUse.accepted.record(
                    TermsOfUse.AcceptedExtra(
                        surface = action.surface.metricLabel,
                        touVersion = TOU_VERSION,
                    ),
                )
                TermsOfUse.version.set(TOU_VERSION.toLong())
                TermsOfUse.date.set()
            }

            is TermsOfUsePromptAction.OnRemindMeLaterClicked -> {
                TermsOfUse.remindMeLaterCount.add()

                TermsOfUse.remindMeLaterClick.record(
                    TermsOfUse.RemindMeLaterClickExtra(
                        surface = action.surface.metricLabel,
                        touVersion = TOU_VERSION,
                    ),
                )
            }

            is TermsOfUsePromptAction.OnPromptManuallyDismissed -> {
                TermsOfUse.dismissCount.add()

                TermsOfUse.dismiss.record(
                    TermsOfUse.DismissExtra(
                        surface = action.surface.metricLabel,
                        touVersion = TOU_VERSION,
                    ),
                )
            }

            is TermsOfUsePromptAction.OnImpression -> {
                TermsOfUse.impressionCount.add()

                TermsOfUse.impression.record(
                    TermsOfUse.ImpressionExtra(
                        surface = action.surface.metricLabel,
                        touVersion = TOU_VERSION,
                    ),
                )
            }

            is TermsOfUsePromptAction.OnLearnMoreClicked ->
                TermsOfUse.learnMoreClick.record(
                    TermsOfUse.LearnMoreClickExtra(
                        surface = action.surface.metricLabel,
                        touVersion = TOU_VERSION,
                    ),
                )

            is TermsOfUsePromptAction.OnPrivacyNoticeClicked ->
                TermsOfUse.privacyNoticeClick.record(
                    TermsOfUse.PrivacyNoticeClickExtra(
                        surface = action.surface.metricLabel,
                        touVersion = TOU_VERSION,
                    ),
                )

            is TermsOfUsePromptAction.OnTermsOfUseClicked ->
                TermsOfUse.termsOfUseClick.record(
                    TermsOfUse.TermsOfUseClickExtra(
                        surface = action.surface.metricLabel,
                        touVersion = TOU_VERSION,
                    ),
                )

            // no-ops
            is TermsOfUsePromptAction.OnPromptCreated,
            is TermsOfUsePromptAction.OnPromptDismissed,
                -> {
            }
        }
    }
}
