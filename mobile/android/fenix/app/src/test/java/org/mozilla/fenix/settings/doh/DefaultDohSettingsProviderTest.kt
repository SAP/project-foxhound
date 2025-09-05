/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.doh

import mozilla.components.concept.engine.DefaultSettings
import mozilla.components.concept.engine.Engine
import mozilla.components.support.test.fakes.engine.FakeEngine
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class DefaultDohSettingsProviderTest {
    // Non-default values for testing
    private val settings =
        DefaultSettings(
            dohSettingsMode = Engine.DohSettingsMode.INCREASED,
            dohProviderUrl = DefaultDohSettingsProvider.nextDnsUri,
            dohDefaultProviderUrl = DefaultDohSettingsProvider.nextDnsUri,
            dohExceptionsList = listOf("example.com", "example2.com", "example3.com"),
        )
    private val fakeEngine = FakeEngine(expectedSettings = settings)
    private lateinit var settingsProvider: DefaultDohSettingsProvider

    @Before
    fun setUp() {
        settingsProvider = DefaultDohSettingsProvider(engine = fakeEngine)
    }

    @Test
    fun `WHEN getDefaultProviders is called, the engine default provider is marked as default`() {
        // When getDefaultProviders is called
        val providers = settingsProvider.getDefaultProviders()

        // Verify that the default is what is available in the settings
        val defaultProvider = providers.filterIsInstance<Provider.BuiltIn>().find { it.default }
        assertEquals(settings.dohDefaultProviderUrl, defaultProvider?.url)
    }

    @Test
    fun `WHEN getSelectedProtectionLevel is called, the correct selected protection level is returned`() {
        // When getSelectedProtectionLevel is called
        val selectedProtectionLevel = settingsProvider.getSelectedProtectionLevel()

        // Verify that the selected protection level is what is available in the settings
        assertEquals(ProtectionLevel.Increased, selectedProtectionLevel)
    }

    @Test
    fun `WHEN getSelectedProvider is called, the correct selected provider is returned`() {
        // When getSelectedProvider is called
        val selectedProvider = settingsProvider.getSelectedProvider()

        // Verify that the selected provider is what is available in the settings
        assertEquals(settings.dohDefaultProviderUrl, selectedProvider?.url)
    }

    @Test
    fun `WHEN getExceptions is called, the correct exceptionsList is returned`() {
        // When getExceptions is called
        val selectedExceptionsList = settingsProvider.getExceptions()

        // Verify that the selected exceptionsList is what is available in the settings
        assertEquals(settings.dohExceptionsList, selectedExceptionsList)
    }

    @Test
    fun `WHEN protection level is set to Off, the engine DoH settings mode is updated`() {
        // When we call setProtectionLevel to Off
        settingsProvider.setProtectionLevel(protectionLevel = ProtectionLevel.Off, provider = null)

        // Then verify that the DoH settings mode is Off
        assertTrue(
            "Expected DoH settings mode to be Off",
            fakeEngine.settings.dohSettingsMode == Engine.DohSettingsMode.OFF,
        )
    }

    @Test
    fun `WHEN protection level is set to Default, the engine DoH settings mode is updated`() {
        // When we call setProtectionLevel to Default
        settingsProvider.setProtectionLevel(
            protectionLevel = ProtectionLevel.Default,
            provider = null,
        )

        // Then verify that the DoH settings mode is Default
        assertTrue(
            "Expected DoH settings mode to be Default",
            fakeEngine.settings.dohSettingsMode == Engine.DohSettingsMode.DEFAULT,
        )
    }

    @Test
    fun `WHEN protection level is set to Increased, the engine DoH settings mode is set to increased with the supplied provider`() {
        // When we call setProtectionLevel to Increased
        val dohProvider = Provider.Custom(url = "https://foo.bar")
        settingsProvider.setProtectionLevel(
            protectionLevel = ProtectionLevel.Increased,
            provider = dohProvider,
        )

        // Then verify that the DoH settings mode is off
        assertTrue(
            "Expected DoH settings mode to be Increased",
            fakeEngine.settings.dohSettingsMode == Engine.DohSettingsMode.INCREASED,
        )
        assertEquals(
            "Expected DoH settings provider url to be ${dohProvider.url}",
            dohProvider.url,
            fakeEngine.settings.dohProviderUrl,
        )
    }

    @Test
    fun `WHEN protection level is set to Max, the engine DoH settings mode is set to increased with the supplied provider`() {
        // When we call setProtectionLevel to Max
        val dohProvider = Provider.Custom(url = "https://foo.bar")
        settingsProvider.setProtectionLevel(
            protectionLevel = ProtectionLevel.Max,
            provider = dohProvider,
        )

        // Then verify that the DoH settings mode is off
        assertTrue(
            "Expected DoH settings mode to be Max",
            fakeEngine.settings.dohSettingsMode == Engine.DohSettingsMode.MAX,
        )
        assertEquals(
            "Expected DoH settings provider url to be ${dohProvider.url}",
            dohProvider.url,
            fakeEngine.settings.dohProviderUrl,
        )
    }

    @Test
    fun `WHEN protection level is set to Increased without a provider, an exception is thrown`() {
        assertThrows(IllegalArgumentException::class.java) {
            // When we call setProtectionLevel to Increased without a provider
            // We expect an illegal argument exception
            settingsProvider.setProtectionLevel(
                protectionLevel = ProtectionLevel.Increased,
                provider = null,
            )
        }
    }

    @Test
    fun `WHEN protection level is set to Max without a provider, an exception is thrown`() {
        assertThrows(IllegalArgumentException::class.java) {
            // When we call setProtectionLevel to Max without a provider
            // We expect an illegal argument exception
            settingsProvider.setProtectionLevel(
                protectionLevel = ProtectionLevel.Max,
                provider = null,
            )
        }
    }

    @Test
    fun `WHEN setCustomProvider is called with a url, the engine DoH provider url is also updated`() {
        // When setCustomProvider is called with a url
        val customUrl = "https://foo.bar"
        settingsProvider.setCustomProvider(
            url = customUrl,
        )

        // Then verify that the engine DoH provider url is also updated
        assertTrue(
            "Expected exceptions should match",
            customUrl == fakeEngine.settings.dohProviderUrl,
        )
    }

    @Test
    fun `WHEN exceptions are set, the engine DoH settings exceptions are also updated`() {
        // When excepts are set
        val dohExceptions = listOf("foo.bar", "foo2.bar", "foo3.bar", "foo4.bar", "foo5.bar")
        settingsProvider.setExceptions(
            exceptions = dohExceptions,
        )

        // Then verify that the engine DoH settings exceptions are also updated
        assertTrue(
            "Expected exceptions should match",
            dohExceptions == settingsProvider.getExceptions(),
        )
    }
}
