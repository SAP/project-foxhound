/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.advanced

import android.content.Context
import android.view.View
import io.mockk.every
import io.mockk.mockk
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.util.Locale

class BaseLocaleViewHolderTest {

    private val selectedLocale = Locale.Builder().setLanguage("en").setRegion("UK").build()
    private val view: View = mockk()
    private val context: Context = mockk()
    private lateinit var localeSelectionChecker: LocaleSelectionChecker
    private lateinit var localeViewHolder: BaseLocaleViewHolder

    @Before
    fun setup() {
        every { view.context } returns context
        localeSelectionChecker = mockk()
        localeViewHolder =
            object : BaseLocaleViewHolder(view, selectedLocale, localeSelectionChecker) {
                override fun bind(locale: Locale) = Unit
            }
    }

    @Test
    fun `isCurrentLocaleSelected returns false for other locale when system default is selected`() {
        every { localeSelectionChecker.isDefaultLocaleSelected(context) } returns true // System default IS selected
        val otherLocale = Locale.Builder().setLanguage("fr").setRegion("FR").build()

        assertFalse(localeViewHolder.isCurrentLocaleSelected(otherLocale, isDefault = true))
        assertFalse(localeViewHolder.isCurrentLocaleSelected(otherLocale, isDefault = false))
    }

    @Test
    fun `isCurrentLocaleSelected returns false for other locale when system default is NOT selected`() {
        every { localeSelectionChecker.isDefaultLocaleSelected(context) } returns false // System default IS NOT selected
        val otherLocale = Locale.Builder().setLanguage("fr").setRegion("FR").build()

        assertFalse(localeViewHolder.isCurrentLocaleSelected(otherLocale, isDefault = true))
        assertFalse(localeViewHolder.isCurrentLocaleSelected(otherLocale, isDefault = false))
    }

    @Test
    fun `isCurrentLocaleSelected returns true for selected locale and isDefault=false when system default is NOT selected`() {
        every { localeSelectionChecker.isDefaultLocaleSelected(context) } returns false // System default IS NOT selected

        assertFalse(localeViewHolder.isCurrentLocaleSelected(selectedLocale, isDefault = true))
        assertTrue(localeViewHolder.isCurrentLocaleSelected(selectedLocale, isDefault = false))
    }

    @Test
    fun `isCurrentLocaleSelected returns true for selected locale and isDefault=true when system default IS selected`() {
        every { localeSelectionChecker.isDefaultLocaleSelected(context) } returns true // System default IS selected

        assertTrue(localeViewHolder.isCurrentLocaleSelected(selectedLocale, isDefault = true))
        assertFalse(localeViewHolder.isCurrentLocaleSelected(selectedLocale, isDefault = false))
    }

    @Test
    fun `verify other locale checker returns false`() {
        val otherLocale = Locale.GERMAN

        every { localeSelectionChecker.isDefaultLocaleSelected(context) } returns true
        assertFalse(localeViewHolder.isCurrentLocaleSelected(otherLocale, isDefault = true))
        assertFalse(localeViewHolder.isCurrentLocaleSelected(otherLocale, isDefault = false))

        every { localeSelectionChecker.isDefaultLocaleSelected(context) } returns false
        assertFalse(localeViewHolder.isCurrentLocaleSelected(otherLocale, isDefault = true))
        assertFalse(localeViewHolder.isCurrentLocaleSelected(otherLocale, isDefault = false))
    }

    @Test
    fun `verify selected locale checker behaves correctly based on system default`() {
        every { localeSelectionChecker.isDefaultLocaleSelected(context) } returns true

        assertTrue(localeViewHolder.isCurrentLocaleSelected(selectedLocale, isDefault = true))
        assertFalse(localeViewHolder.isCurrentLocaleSelected(selectedLocale, isDefault = false))

        every { localeSelectionChecker.isDefaultLocaleSelected(context) } returns false

        assertFalse(localeViewHolder.isCurrentLocaleSelected(selectedLocale, isDefault = true))
        assertTrue(localeViewHolder.isCurrentLocaleSelected(selectedLocale, isDefault = false))
    }

    @Test
    fun `verify selected locale checker returns true when isDefault=false and system default not selected`() {
        every { localeSelectionChecker.isDefaultLocaleSelected(context) } returns false // Current app locale is NOT system default

        assertFalse(localeViewHolder.isCurrentLocaleSelected(selectedLocale, isDefault = true))
        assertTrue(localeViewHolder.isCurrentLocaleSelected(selectedLocale, isDefault = false))
    }

    @Test
    fun `verify default locale checker returns true when isDefault=true and system default is selected`() {
        every { localeSelectionChecker.isDefaultLocaleSelected(context) } returns true // Current app locale IS system default

        assertTrue(localeViewHolder.isCurrentLocaleSelected(selectedLocale, isDefault = true))
        assertFalse(localeViewHolder.isCurrentLocaleSelected(selectedLocale, isDefault = false))
    }
}
