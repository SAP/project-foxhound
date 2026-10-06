/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.metrics

import org.mozilla.fenix.GleanMetrics.AdjustAttribution
import org.mozilla.fenix.GleanMetrics.AdjustAttribution.ConversionEventExtra

/**
 * Records Adjust conversion events to Glean and submits the adjust-attribution ping.
 *
 * Recording and ping submission are separate operations so callers can record an event
 * and submit the ping independently.
 */
interface ConversionEventRecorder {

    /**
     * Records conversion event.
     */
    fun recordConversionEvent(eventNumber: Int)
}

/**
 * [ConversionEventRecorder] implementation that delegates to Glean-generated metrics
 * and submits the adjust-attribution ping.
 */
class GleanConversionEventRecorder : ConversionEventRecorder {

    override fun recordConversionEvent(eventNumber: Int) {
        AdjustAttribution.conversionEvent.record(
            extra = ConversionEventExtra(
                eventNumber = eventNumber,
            ),
        )
    }
}
