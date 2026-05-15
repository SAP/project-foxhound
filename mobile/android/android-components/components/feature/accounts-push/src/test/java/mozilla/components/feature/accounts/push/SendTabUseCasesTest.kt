/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.accounts.push

import kotlinx.coroutines.test.runTest
import mozilla.components.concept.sync.ConstellationState
import mozilla.components.concept.sync.Device
import mozilla.components.concept.sync.DeviceCapability
import mozilla.components.concept.sync.DeviceConstellation
import mozilla.components.concept.sync.DeviceType
import mozilla.components.concept.sync.OAuthAccount
import mozilla.components.concept.sync.TabData
import mozilla.components.concept.sync.TabPrivacy
import mozilla.components.service.fxa.manager.FxaAccountManager
import mozilla.components.support.test.any
import mozilla.components.support.test.eq
import mozilla.components.support.test.mock
import org.junit.Assert
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito.never
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import java.util.UUID

class SendTabUseCasesTest {

    private val manager: FxaAccountManager = mock()
    private val account: OAuthAccount = mock()
    private val constellation: DeviceConstellation = mock()
    private val state: ConstellationState = mock()

    @Before
    fun setup() {
        `when`(manager.authenticatedAccount()).thenReturn(account)
        `when`(account.deviceConstellation()).thenReturn(constellation)
        `when`(constellation.state()).thenReturn(state)
    }

    @Test
    fun `SendTabUseCase - tab is sent to capable device`() = runTest {
        val useCases = SendTabUseCases(manager, coroutineContext)
        val device: Device = generateDevice()

        `when`(state.otherDevices).thenReturn(listOf(device))
        `when`(constellation.sendCommandToDevice(any(), any()))
            .thenReturn(true)

        useCases.sendToDeviceAsync(device.id, TabData("Title", "http://example.com", TabPrivacy.Normal))
        testScheduler.advanceUntilIdle()

        verify(constellation).sendCommandToDevice(any(), any())
    }

    @Test
    fun `SendTabUseCase - tabs are sent to capable device`() = runTest {
        val useCases = SendTabUseCases(manager, coroutineContext)
        val device: Device = generateDevice()
        val tab = TabData("Title", "http://example.com", TabPrivacy.Normal)

        `when`(state.otherDevices).thenReturn(listOf(device))
        `when`(constellation.sendCommandToDevice(any(), any()))
            .thenReturn(true)

        useCases.sendToDeviceAsync(device.id, listOf(tab, tab))
        testScheduler.advanceUntilIdle()

        verify(constellation, times(2)).sendCommandToDevice(any(), any())
    }

    @Test
    fun `SendTabUseCase - tabs are NOT sent to incapable devices`() = runTest {
        val useCases = SendTabUseCases(manager, coroutineContext)
        val device: Device = mock()
        val tab = TabData("Title", "http://example.com", TabPrivacy.Normal)

        useCases.sendToDeviceAsync("123", listOf(tab, tab))
        testScheduler.advanceUntilIdle()

        verify(constellation, never()).sendCommandToDevice(any(), any())

        `when`(device.id).thenReturn("123")
        `when`(state.otherDevices).thenReturn(listOf(device))
        `when`(constellation.sendCommandToDevice(any(), any()))
            .thenReturn(false)

        useCases.sendToDeviceAsync("123", listOf(tab, tab))
        testScheduler.advanceUntilIdle()

        verify(constellation, never()).sendCommandToDevice(any(), any())
    }

    @Test
    fun `SendTabUseCase - ONLY tabs with valid schema are sent to capable device`() = runTest {
        val useCases = SendTabUseCases(manager, coroutineContext)
        val device: Device = generateDevice()
        val tab = TabData("Title", "http://example.com", TabPrivacy.Normal)
        val tab1 = TabData("PDFFile", "file://path/to/some/pdf", TabPrivacy.Normal)
        val tab2 = TabData("AboutConfig", "about:config", TabPrivacy.Normal)

        `when`(state.otherDevices).thenReturn(listOf(device))
        `when`(constellation.sendCommandToDevice(any(), any()))
            .thenReturn(true)

        useCases.sendToDeviceAsync(device.id, listOf(tab, tab1, tab2))
        testScheduler.advanceUntilIdle()

        verify(constellation, times(1)).sendCommandToDevice(any(), any())
    }

    @Test
    fun `SendTabUseCase - device id does not match when sending single tab`() = runTest {
        val useCases = SendTabUseCases(manager, coroutineContext)
        val device: Device = generateDevice("123")
        val tab = TabData("Title", "http://example.com", TabPrivacy.Normal)

        useCases.sendToDeviceAsync("123", tab)
        testScheduler.advanceUntilIdle()

        verify(constellation, never()).sendCommandToDevice(any(), any())

        `when`(state.otherDevices).thenReturn(listOf(device))
        `when`(constellation.sendCommandToDevice(any(), any()))
            .thenReturn(false)

        useCases.sendToDeviceAsync("456", tab)
        testScheduler.advanceUntilIdle()

        verify(constellation, never()).sendCommandToDevice(any(), any())

        useCases.sendToDeviceAsync("123", tab)
        testScheduler.advanceUntilIdle()

        verify(constellation).sendCommandToDevice(any(), any())
    }

    @Test
    fun `SendTabUseCase - device id does not match when sending tabs`() = runTest {
        val useCases = SendTabUseCases(manager, coroutineContext)
        val device: Device = generateDevice("123")
        val tab = TabData("Title", "http://example.com", TabPrivacy.Normal)

        useCases.sendToDeviceAsync("123", listOf(tab))
        testScheduler.advanceUntilIdle()

        verify(constellation, never()).sendCommandToDevice(any(), any())

        `when`(state.otherDevices).thenReturn(listOf(device))
        `when`(constellation.sendCommandToDevice(any(), any()))
            .thenReturn(false)

        useCases.sendToDeviceAsync("456", listOf(tab))
        testScheduler.advanceUntilIdle()

        verify(constellation, never()).sendCommandToDevice(any(), any())

        useCases.sendToDeviceAsync("123", listOf(tab))
        testScheduler.advanceUntilIdle()

        verify(constellation).sendCommandToDevice(any(), any())
    }

    @Test
    fun `SendTabToAllUseCase - tab is sent to capable devices`() = runTest {
        val useCases = SendTabUseCases(manager, coroutineContext)
        val device: Device = generateDevice()
        val device2: Device = generateDevice()

        `when`(state.otherDevices).thenReturn(listOf(device, device2))
        `when`(constellation.sendCommandToDevice(any(), any()))
            .thenReturn(false)

        val tab = TabData("Mozilla", "https://mozilla.org", TabPrivacy.Normal)

        useCases.sendToAllAsync(tab)
        testScheduler.advanceUntilIdle()

        verify(constellation, times(2)).sendCommandToDevice(any(), any())
    }

    @Test
    fun `SendTabToAllUseCase - tabs is sent to capable devices`() = runTest {
        val useCases = SendTabUseCases(manager, coroutineContext)
        val device: Device = generateDevice()
        val device2: Device = generateDevice()

        `when`(state.otherDevices).thenReturn(listOf(device, device2))
        `when`(constellation.sendCommandToDevice(any(), any()))
            .thenReturn(false)

        val tab = TabData("Mozilla", "https://mozilla.org", TabPrivacy.Normal)
        val tab2 = TabData("Firefox", "https://firefox.com", TabPrivacy.Normal)

        useCases.sendToAllAsync(listOf(tab, tab2))
        testScheduler.advanceUntilIdle()

        verify(constellation, times(4)).sendCommandToDevice(any(), any())
    }

    @Test
    fun `SendTabToAllUseCase - tab is NOT sent to incapable devices`() = runTest {
        val useCases = SendTabUseCases(manager)
        val tab = TabData("Mozilla", "https://mozilla.org", TabPrivacy.Normal)
        val device: Device = mock()
        val device2: Device = mock()

        useCases.sendToAllAsync(tab)
        testScheduler.advanceUntilIdle()

        verify(constellation, never()).sendCommandToDevice(any(), any())

        `when`(device.id).thenReturn("123")
        `when`(device2.id).thenReturn("456")
        `when`(state.otherDevices).thenReturn(listOf(device, device2))

        useCases.sendToAllAsync(tab)
        testScheduler.advanceUntilIdle()

        verify(constellation, never()).sendCommandToDevice(any(), any())
    }

    @Test
    fun `SendTabToAllUseCase - tabs are NOT sent to capable devices`() = runTest {
        val useCases = SendTabUseCases(manager)
        val tab = TabData("Mozilla", "https://mozilla.org", TabPrivacy.Normal)
        val tab2 = TabData("Firefox", "https://firefox.com", TabPrivacy.Normal)
        val device: Device = mock()
        val device2: Device = mock()

        useCases.sendToAllAsync(tab)
        testScheduler.advanceUntilIdle()

        verify(constellation, never()).sendCommandToDevice(any(), any())

        `when`(device.id).thenReturn("123")
        `when`(device2.id).thenReturn("456")
        `when`(state.otherDevices).thenReturn(listOf(device, device2))

        useCases.sendToAllAsync(listOf(tab, tab2))
        testScheduler.advanceUntilIdle()

        verify(constellation, never()).sendCommandToDevice(eq("123"), any())
        verify(constellation, never()).sendCommandToDevice(eq("456"), any())
    }

    @Test
    fun `SendTabToAllUseCase - ONLY tabs with valid schema are sent to capable devices`() = runTest {
        val useCases = SendTabUseCases(manager, coroutineContext)
        val device: Device = generateDevice()
        val device2: Device = generateDevice()

        `when`(state.otherDevices).thenReturn(listOf(device, device2))
        `when`(constellation.sendCommandToDevice(any(), any()))
            .thenReturn(false)

        val tab = TabData("Mozilla", "https://mozilla.org", TabPrivacy.Normal)
        val tab2 = TabData("Firefox", "https://firefox.com", TabPrivacy.Normal)
        // Invalid url to send
        val tab3 = TabData("PDFFile", "file://path/to/pdffile", TabPrivacy.Normal)
        // Invalid url to send
        val tab4 = TabData("AboutPage", "about:config", TabPrivacy.Normal)

        useCases.sendToAllAsync(listOf(tab, tab2, tab3, tab4))
        testScheduler.advanceUntilIdle()

        verify(constellation, times(4)).sendCommandToDevice(any(), any())
    }

    @Test
    fun `SendTabUseCase - result is false if any send tab action fails`() = runTest {
        val useCases = SendTabUseCases(manager, coroutineContext)
        val device: Device = mock()
        val tab = TabData("Title", "http://example.com", TabPrivacy.Normal)

        useCases.sendToDeviceAsync("123", listOf(tab, tab))
        testScheduler.advanceUntilIdle()

        verify(constellation, never()).sendCommandToDevice(any(), any())

        `when`(device.id).thenReturn("123")
        `when`(state.otherDevices).thenReturn(listOf(device))
        `when`(constellation.sendCommandToDevice(any(), any()))
            .thenReturn(true)
            .thenReturn(true)

        val result = useCases.sendToDeviceAsync("123", listOf(tab, tab))
        testScheduler.advanceUntilIdle()

        verify(constellation, never()).sendCommandToDevice(any(), any())
        Assert.assertFalse(result.await())
    }

    @Test
    fun `filter devices returns capable devices`() = runTest {
        var executed = false
        `when`(state.otherDevices).thenReturn(listOf(generateDevice(), generateDevice()))
        filterSendTabDevices(manager) { _, _ ->
            executed = true
        }

        Assert.assertTrue(executed)
    }

    @Test
    fun `filter devices does NOT provide for incapable devices`() = runTest {
        val device: Device = mock()
        val device2: Device = mock()

        `when`(device.id).thenReturn("123")
        `when`(device2.id).thenReturn("456")
        `when`(state.otherDevices).thenReturn(listOf(device, device2))

        filterSendTabDevices(manager) { _, filteredDevices ->
            Assert.assertTrue(filteredDevices.isEmpty())
        }

        val accountManager: FxaAccountManager = mock()
        val account: OAuthAccount = mock()
        val constellation: DeviceConstellation = mock()
        val state: ConstellationState = mock()
        `when`(accountManager.authenticatedAccount()).thenReturn(account)
        `when`(account.deviceConstellation()).thenReturn(constellation)
        `when`(constellation.state()).thenReturn(state)

        filterSendTabDevices(mock()) { _, _ ->
            Assert.fail()
        }
    }

    private fun generateDevice(id: String = UUID.randomUUID().toString()): Device {
        return Device(
            id = id,
            displayName = id,
            deviceType = DeviceType.MOBILE,
            isCurrentDevice = false,
            lastAccessTime = null,
            capabilities = listOf(DeviceCapability.SEND_TAB),
            subscriptionExpired = false,
            subscription = null,
        )
    }
}
