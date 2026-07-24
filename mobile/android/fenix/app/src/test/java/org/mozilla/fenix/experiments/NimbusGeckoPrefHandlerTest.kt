/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.experiments

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert
import org.junit.Test
import org.junit.runner.RunWith

const val TEST_PREF = "gecko.nimbus.test"

@RunWith(AndroidJUnit4::class)
class NimbusGeckoPrefHandlerTest {

    @Test
    fun `test nimbusGeckoPreferences has appropriate values`() {
        Assert.assertNotNull(NimbusGeckoPrefHandler.nimbusGeckoPreferences["gecko-nimbus-validation"])
        Assert.assertNotNull(
            NimbusGeckoPrefHandler.nimbusGeckoPreferences["gecko-nimbus-validation"]?.get(
                "test-preference",
            ),
        )
    }

    @Test
    fun `test preferenceList has appropriate values`() {
        Assert.assertTrue(NimbusGeckoPrefHandler.preferenceList.contains(TEST_PREF))
    }
}
