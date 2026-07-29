/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils.ext

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class StringTest {

    @Test
    fun `GIVEN a string credit card number WHEN calling toCreditCardNumber THEN any character that is not a digit will removed`() {
        val number = "385  -  2 0 0 - 0 0 0 2 3 2 3   7"
        val expectedResult = "38520000023237"

        assertEquals(expectedResult, number.toCreditCardNumber())
    }

    @Test
    fun `decodeIfNeeded should decode valid percent-encoded strings`() {
        // Standard encoding
        assertEquals("test file.txt", "test%20file.txt".decodeIfNeeded())
    }

    @Test
    fun `decodeIfNeeded should return original string if no percent signs are present`() {
        val plainText = "simple_filename.txt"
        assertEquals(plainText, plainText.decodeIfNeeded())
    }

    @Test
    fun `decodeIfNeeded should handle complex valid UTF-8 encoding`() {
        // "coffee" in UTF-8 percent encoding
        assertEquals("coffee☕.txt", "coffee%E2%98%95.txt".decodeIfNeeded())
    }

    @Test
    fun `decodeIfNeeded should match desktop behavior for percent signs`() {
        val input = "test%.txt"
        val expected = "test_.txt"
        assertEquals(expected, input.decodeIfNeeded())

        // Input with valid encoding should still end with underscore if % remains
        // Example: "100%" encoded as "100%25" -> "100%" -> "100_"
        assertEquals("100_", "100%25".decodeIfNeeded())
    }
}
