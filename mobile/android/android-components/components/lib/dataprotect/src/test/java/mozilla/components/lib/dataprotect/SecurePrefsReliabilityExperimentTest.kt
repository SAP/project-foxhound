/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.dataprotect

import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.lib.dataprotect.SecurePrefsReliabilityExperiment.Companion.Actions
import mozilla.components.lib.dataprotect.SecurePrefsReliabilityExperiment.Companion.Values
import mozilla.components.support.base.Component
import mozilla.components.support.base.facts.Action
import mozilla.components.support.base.facts.Fact
import mozilla.components.support.base.facts.FactProcessor
import mozilla.components.support.base.facts.Facts
import mozilla.components.support.test.argumentCaptor
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito
import org.mockito.Mockito.times

@RunWith(AndroidJUnit4::class)
class SecurePrefsReliabilityExperimentTest {
    @Test
    fun `initialization failure`() {
        // AndroidKeyStore isn't available in the test environment.
        // This test runs against our target sdk version, so the experiment code will attempt to init
        // the AndroidKeyStore, that won't be available.
        val processor: FactProcessor = mock()

        Facts.registerProcessor(processor)

        SecurePrefsReliabilityExperiment(testContext)()

        val captor = argumentCaptor<Fact>()
        Mockito.verify(processor).process(captor.capture())

        assertEquals(1, captor.allValues.size)
        assertExperimentFact(
            captor.allValues[0],
            Actions.GET,
            Values.FAIL,
            mapOf("javaClass" to "java.security.KeyStoreException"),
        )
    }

    private fun assertExperimentFact(
        fact: Fact,
        item: String,
        value: Values,
        metadata: Map<String, Any>? = null,
    ) {
        assertEquals(Component.LIB_DATAPROTECT, fact.component)
        assertEquals(Action.IMPLEMENTATION_DETAIL, fact.action)
        assertEquals(item, fact.item)
        assertEquals("${value.v}", fact.value)
        assertEquals(metadata, fact.metadata)
    }
}
