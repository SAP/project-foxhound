/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.advanced

import android.content.Context
import mozilla.components.support.locale.LocaleManager
import mozilla.components.support.test.robolectric.testContext
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.BuildConfig
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.Locale

@RunWith(RobolectricTestRunner::class)
class LocaleManagerExtensionTest {

    private lateinit var context: Context

    @Before
    fun setup() {
        context = testContext
        LocaleManager.clear(context)
    }

    @After
    fun tearDown() {
        LocaleManager.clear(context)
    }

    @Test
    @Config(qualifiers = "en-rUS")
    fun `build supported locale list`() {
        val list = LocaleManager.getSupportedLocales()

        // Expect all supported locales + 'follow default option'
        val expectedSize = BuildConfig.SUPPORTED_LOCALE_ARRAY.size + 1

        assertEquals(expectedSize, list.size)
        assertTrue(list.isNotEmpty())
    }

    @Test
    @Config(qualifiers = "en-rUS")
    fun `default locale selected`() {
        assertTrue(LocaleManager.isDefaultLocaleSelected(context))
    }

    @Test
    @Config(qualifiers = "en-rUS")
    fun `custom locale selected`() {
        val selectedLocale = Locale.Builder().setLanguage("en").setRegion("UK").build()
        LocaleManager.setNewLocale(context, locale = selectedLocale)

        assertFalse(LocaleManager.isDefaultLocaleSelected(context))
    }

    @Test
    @Config(qualifiers = "en-rUS")
    fun `match current stored locale string with a Locale from our list`() {
        val otherLocale = Locale.forLanguageTag("fr")
        val selectedLocale = Locale.Builder().setLanguage("en").setRegion("UK").build()
        val localeList = listOf(otherLocale, selectedLocale)

        LocaleManager.setNewLocale(context, locale = selectedLocale)

        assertEquals(selectedLocale, LocaleManager.getSelectedLocale(context, localeList))
    }

    @Test
    @Config(qualifiers = "en-rUS")
    fun `match null stored locale with the default Locale from our list`() {
        val firstLocale = Locale.forLanguageTag("fr")
        val secondLocale = Locale.Builder().setLanguage("en").setRegion("UK").build()
        val localeList = listOf(firstLocale, secondLocale)

        assertEquals("en-US", LocaleManager.getSelectedLocale(context, localeList).toLanguageTag())
    }
}
