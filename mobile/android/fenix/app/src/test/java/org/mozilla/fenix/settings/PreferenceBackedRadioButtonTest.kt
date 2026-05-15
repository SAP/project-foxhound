/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings

import android.content.Context
import android.content.SharedPreferences
import android.content.res.TypedArray
import android.util.AttributeSet
import android.widget.CompoundButton.OnCheckedChangeListener
import io.mockk.Runs
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.spyk
import io.mockk.verify
import io.mockk.verifyOrder
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.mozilla.fenix.components.Components
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.utils.Settings
import org.robolectric.RobolectricTestRunner
import kotlin.random.Random
import androidx.appcompat.R as appcompatR

@RunWith(RobolectricTestRunner::class)
class PreferenceBackedRadioButtonTest {
    private lateinit var mockContext: Context
    private lateinit var mockTypedArray: TypedArray
    private lateinit var mockComponents: Components
    private lateinit var mockSettings: Settings
    private lateinit var mockPrefs: SharedPreferences
    private lateinit var mockEditor: SharedPreferences.Editor

    @Before
    fun setUp() {
        mockContext = spyk(testContext)
        mockComponents = mockk(relaxed = true)
        mockTypedArray = mockk(relaxed = true)
        mockSettings = mockk()
        mockPrefs = mockk()
        mockEditor = mockk(relaxed = true)

        every { mockContext.components } returns mockComponents
        every { mockComponents.settings } returns mockSettings
        every { mockSettings.preferences } returns mockPrefs
        every { mockPrefs.edit() } returns mockEditor

        every {
            mockContext.obtainStyledAttributes(
                any<AttributeSet>(),
                R.styleable.PreferenceBackedRadioButton,
                appcompatR.attr.radioButtonStyle,
                0,
            )
        } returns mockTypedArray

        every { mockTypedArray.recycle() } just Runs
    }

    @Test
    fun `GIVEN a preference key is provided WHEN initialized THEN cache the value`() {
        val testKey = "testKeyValue"
        // Configure mockTypedArray to return the preference key
        every { mockTypedArray.getString(R.styleable.PreferenceBackedRadioButton_preferenceKey) } returns testKey
        // Default behavior for other attributes if not specified for this test
        every { mockTypedArray.getBoolean(R.styleable.PreferenceBackedRadioButton_preferenceKeyDefaultValue, false) } returns false
        // Configure SharedPreferences for initial isChecked state
        every { mockPrefs.getBoolean(testKey, false) } returns Random.nextBoolean()

        // Pass the mocked context. The AttributeSet can be null because obtainStyledAttributes is fully mocked.
        val button = PreferenceBackedRadioButton(mockContext, null)

        assertEquals(testKey, button.backingPreferenceName)
        verify { mockTypedArray.recycle() } // Ensure TypedArray is recycled
    }

    @Test
    fun `GIVEN a default preference value is provided WHEN initialized THEN cache the value`() {
        val defaultPrefValue = true
        // Configure mockTypedArray for default value
        every { mockTypedArray.getString(R.styleable.PreferenceBackedRadioButton_preferenceKey) } returns null // No specific key
        every { mockTypedArray.getBoolean(R.styleable.PreferenceBackedRadioButton_preferenceKeyDefaultValue, false) } returns defaultPrefValue
        // Configure SharedPreferences (key will be null, default value from TypedArray is used)
        every { mockPrefs.getBoolean(null, defaultPrefValue) } returns Random.nextBoolean()

        val button = PreferenceBackedRadioButton(mockContext, null)

        assertTrue(button.backingPreferenceDefaultValue)
        verify { mockTypedArray.recycle() }
    }

    @Test
    fun `GIVEN a default preference value is not provided WHEN initialized THEN remember the default value as false`() {
        every { mockSettings.preferences.getBoolean(any(), any()) } returns Random.nextBoolean()

        val button = PreferenceBackedRadioButton(mockContext, null)

        assertFalse(button.backingPreferenceDefaultValue)
    }

    @Test
    fun `GIVEN the backing preference doesn't have a value set WHEN initialized THEN set if checked the default value`() {
        val testKey = "testKeyForDefaultCheck"
        val defaultCheckedValue = true

        every { mockTypedArray.getString(R.styleable.PreferenceBackedRadioButton_preferenceKey) } returns testKey
        every { mockTypedArray.getBoolean(R.styleable.PreferenceBackedRadioButton_preferenceKeyDefaultValue, false) } returns defaultCheckedValue
        // Simulate preference key not existing, so getBoolean returns its provided default value
        every { mockPrefs.getBoolean(testKey, defaultCheckedValue) } returns defaultCheckedValue

        val button = PreferenceBackedRadioButton(mockContext, null)

        assertEquals(defaultCheckedValue, button.isChecked) // Check against the value that should be set
        // }
        verify { mockTypedArray.recycle() }
    }

    @Test
    fun `GIVEN there is no backing preference or default value set vaWHEN initialized THEN set if checked as false`() {
        every { mockTypedArray.getString(R.styleable.PreferenceBackedRadioButton_preferenceKey) } returns null
        every { mockTypedArray.getBoolean(R.styleable.PreferenceBackedRadioButton_preferenceKeyDefaultValue, false) } returns false // Default is false
        // Prefs will be called with (null, false)
        every { mockPrefs.getBoolean(null, false) } returns false

        val button = PreferenceBackedRadioButton(mockContext, null)

        assertFalse(button.isChecked)
        verify { mockTypedArray.recycle() }
    }

    @Test
    fun `GIVEN the backing preference does have a value set WHEN initialized THEN set if checked the value from the preference`() {
        val testKey = "testKeyWithValue"
        val preferenceStoredValue = true
        val defaultFromAttr = false

        every { mockTypedArray.getString(R.styleable.PreferenceBackedRadioButton_preferenceKey) } returns testKey
        every { mockTypedArray.getBoolean(R.styleable.PreferenceBackedRadioButton_preferenceKeyDefaultValue, false) } returns defaultFromAttr
        // Simulate preference having a stored value
        every { mockPrefs.getBoolean(testKey, defaultFromAttr) } returns preferenceStoredValue

        val button = PreferenceBackedRadioButton(mockContext, null)

        assertEquals(preferenceStoredValue, button.isChecked)
        verify { mockTypedArray.recycle() }
    }

    @Test
    fun `WHEN a OnCheckedChangeListener is set THEN cache it internally`() {
        every { mockSettings.preferences.getBoolean(any(), any()) } returns Random.nextBoolean()
        val button = PreferenceBackedRadioButton(mockContext)
        val testListener: OnCheckedChangeListener = mockk()

        button.setOnCheckedChangeListener(testListener)

        assertSame(testListener, button.externalOnCheckedChangeListener)
    }

    @Test
    fun `GIVEN a OnCheckedChangeListener is set WHEN the checked status changes THEN update the backing preference and then inform the listener`() {
        val editor: SharedPreferences.Editor = mockk(relaxed = true)
        every { mockSettings.preferences.edit() } returns editor
        // set the button initially as not checked
        every { mockSettings.preferences.getBoolean(any(), any()) } returns false
        val button = PreferenceBackedRadioButton(mockContext)
        button.backingPreferenceName = "test"
        val testListener: OnCheckedChangeListener = mockk(relaxed = true)
        button.externalOnCheckedChangeListener = testListener

        button.isChecked = true

        verifyOrder {
            editor.putBoolean("test", true)
            testListener.onCheckedChanged(any(), any())
        }
    }

    @Test
    fun `WHEN the button gets enabled THEN set isChecked based on the value from the backing preference`() {
        every { mockSettings.preferences.getBoolean(any(), any()) } returns true
        val button = spyk(PreferenceBackedRadioButton(mockContext))
        every { button.isChecked = any() } returns Unit

        button.isEnabled = true

        verify(exactly = 1) {
            // first "isChecked" from init happens before we can count it
            button.isChecked = true
        }
    }
}
