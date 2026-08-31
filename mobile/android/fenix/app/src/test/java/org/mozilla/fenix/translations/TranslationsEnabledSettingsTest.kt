/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.translations

import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import mozilla.components.support.test.fakes.android.FakePreferencesDataStore
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TranslationsEnabledSettingsTest {

    @Test
    fun `isEnabled defaults to true`() = runTest {
        val settings = DataStoreBackedTranslationsEnabledSettings(FakePreferencesDataStore())

        assertTrue(settings.isEnabled.first())
    }

    @Test
    fun `setEnabled to false persists disabled state`() = runTest {
        val settings = DataStoreBackedTranslationsEnabledSettings(FakePreferencesDataStore())

        settings.setEnabled(false)

        assertFalse(settings.isEnabled.first())
    }

    @Test
    fun `setEnabled to true persists enabled state`() = runTest {
        val settings = DataStoreBackedTranslationsEnabledSettings(FakePreferencesDataStore())

        settings.setEnabled(false)
        settings.setEnabled(true)

        assertTrue(settings.isEnabled.first())
    }
}
