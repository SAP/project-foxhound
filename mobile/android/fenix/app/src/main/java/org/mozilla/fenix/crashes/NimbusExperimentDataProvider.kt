/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.crashes

import mozilla.components.lib.crash.RuntimeTagProvider
import mozilla.components.lib.crash.runtimetagproviders.ExperimentData
import mozilla.components.lib.crash.runtimetagproviders.ExperimentDataProvider
import mozilla.components.service.nimbus.NimbusApi

/**
 * [RuntimeTagProvider] that provides the active [NimbusApi] experiments
 * as runtime tags.
 *
 * @param nimbusApi the [NimbusApi] to use to get the active experiments
 */
class NimbusExperimentDataProvider(
    private val nimbusApi: Lazy<NimbusApi>,
) : ExperimentDataProvider {

    override fun getExperimentData(): ExperimentData {
        val data = nimbusApi.value.getActiveExperiments().associate {
            it.slug to it.branchSlug
        }

        return ExperimentData(data)
    }
}
