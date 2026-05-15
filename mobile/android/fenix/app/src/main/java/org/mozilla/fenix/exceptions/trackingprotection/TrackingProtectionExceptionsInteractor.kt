/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.exceptions.trackingprotection

import mozilla.components.concept.engine.content.blocking.TrackingProtectionException
import mozilla.components.feature.session.TrackingProtectionUseCases
import org.mozilla.fenix.exceptions.ExceptionsInteractor
import org.mozilla.fenix.settings.SupportUtils

interface TrackingProtectionExceptionsInteractor : ExceptionsInteractor<TrackingProtectionException> {
    /**
     * Called whenever learn more about tracking protection is tapped
     */
    fun onLearnMore()
}

class DefaultTrackingProtectionExceptionsInteractor(
    private val exceptionsStore: ExceptionsFragmentStore,
    private val trackingProtectionUseCases: TrackingProtectionUseCases,
    private val openLearnMorePage: (String) -> Unit,
) : TrackingProtectionExceptionsInteractor {

    override fun onLearnMore() {
        val url = SupportUtils.getGenericSumoURLForTopic(
            SupportUtils.SumoTopic.TRACKING_PROTECTION,
        )
        openLearnMorePage(url)
    }

    override fun onDeleteAll() {
        trackingProtectionUseCases.removeAllExceptions {
            reloadExceptions()
        }
    }

    override fun onDeleteOne(item: TrackingProtectionException) {
        trackingProtectionUseCases.removeException(item)
        reloadExceptions()
    }

    fun reloadExceptions() {
        trackingProtectionUseCases.fetchExceptions { resultList ->
            exceptionsStore.dispatch(
                ExceptionsFragmentAction.Change(resultList),
            )
        }
    }
}
