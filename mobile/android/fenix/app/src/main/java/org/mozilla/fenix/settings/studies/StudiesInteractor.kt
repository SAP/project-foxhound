/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.studies

import mozilla.components.service.nimbus.NimbusApi
import org.mozilla.experiments.nimbus.internal.EnrolledExperiment

interface StudiesInteractor {
    /**
     * Open the given [url] in the browser.
     */
    fun openWebsite(url: String)

    /**
     * Remove a study by the given [experiment].
     */
    fun removeStudy(experiment: EnrolledExperiment)
}

/**
 * Default implementation of [StudiesInteractor].
 *
 * @param openUrlInBrowser Callback to open a URL in the browser.
 * @param experiments The Nimbus API for managing experiments.
 */
class DefaultStudiesInteractor(
    private val openUrlInBrowser: (String) -> Unit,
    private val experiments: NimbusApi,
) : StudiesInteractor {
    override fun openWebsite(url: String) {
        openUrlInBrowser(url)
    }

    override fun removeStudy(experiment: EnrolledExperiment) {
        experiments.optOut(experiment.slug)
        experiments.applyPendingExperiments()
    }
}
