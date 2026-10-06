/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.crashes

import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.lib.crash.runtimetagproviders.ExperimentData
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.experiments.nimbus.internal.EnrolledExperiment
import org.mozilla.fenix.nimbus.TestNimbusApi

@RunWith(AndroidJUnit4::class)
class NimbusExperimentDataProviderTest {

    private val fakeNimbusApi = FakeNimbusApi()
    private val runtimeTagProvider = NimbusExperimentDataProvider(lazy { fakeNimbusApi })

    @Test
    fun `GIVEN active experiments, then the experiments are converted to runtime tags map`() {
        // given the active experiments
        fakeNimbusApi.givenActiveExperiments = listOf(
            createActiveExperiment(slug = "experiment-01", branchSlug = "control"),
            createActiveExperiment(slug = "experiment-02", branchSlug = "treatment"),
            createActiveExperiment(slug = "experiment-03", branchSlug = "variant-1"),
        )

        val data = runtimeTagProvider.getExperimentData()
        val expected = ExperimentData(
            mapOf(
                "experiment-01" to "control",
                "experiment-02" to "treatment",
                "experiment-03" to "variant-1",
            ),
        )

        assertEquals(
            "Runtime tags should contain all active experiments",
            expected,
            data,
        )
    }

    private fun createActiveExperiment(
        slug: String,
        branchSlug: String,
    ): EnrolledExperiment {
        return EnrolledExperiment(
            featureIds = emptyList(),
            slug = slug,
            userFacingName = "Experiment name for $slug",
            userFacingDescription = "Experiment desc for $slug",
            branchSlug = branchSlug,
        )
    }

    private class FakeNimbusApi(
        var givenActiveExperiments: List<EnrolledExperiment> = emptyList(),
    ) : TestNimbusApi(testContext) {

        override fun getActiveExperiments(): List<EnrolledExperiment> {
            return givenActiveExperiments
        }
    }
}
