/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.experiments.prefhandling

import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.concept.engine.preferences.Branch
import mozilla.components.concept.engine.preferences.BrowserPrefType
import org.junit.Assert.assertEquals
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.experiments.nimbus.internal.GeckoPref
import org.mozilla.experiments.nimbus.internal.GeckoPrefState
import org.mozilla.experiments.nimbus.internal.OriginalGeckoPref
import org.mozilla.experiments.nimbus.internal.PrefBranch
import org.mozilla.experiments.nimbus.internal.PrefEnrollmentData
import kotlin.test.assertIs
import kotlin.test.assertNotNull

@RunWith(AndroidJUnit4::class)
class NimbusGeckoUtilsTest {

    @Test
    fun `fromJsonStringValue decodes JSON-encoded string values and allows raw values`() {
        assertEquals("#000000", "\"#000000\"".fromJsonStringValue())
        assertEquals("hello \"world\"", "\"hello \\\"world\\\"\"".fromJsonStringValue())
        assertEquals("some-value", "some-value".fromJsonStringValue())
        assertEquals("123", "123".fromJsonStringValue())
        assertEquals("true", "true".fromJsonStringValue())
    }

    @Test
    fun `createPrefSetter with OriginalGeckoPref returns setter for various types`() {
        val stringPref = OriginalGeckoPref(pref = "string.pref", branch = PrefBranch.USER, value = "some-value")
        val stringResult =
            createPrefSetter(originalGeckoPref = stringPref, setType = BrowserPrefType.STRING)
        assertNotNull(stringResult)
        assertEquals("string.pref", stringResult.pref)
        assertEquals("some-value", stringResult.value)
        assertEquals(Branch.USER, stringResult.branch)

        val intPref = OriginalGeckoPref(pref = "int.pref", branch = PrefBranch.USER, value = "123")
        val intResult = createPrefSetter(originalGeckoPref = intPref, setType = BrowserPrefType.INT)
        assertNotNull(intResult)
        assertEquals("int.pref", intResult.pref)
        assertEquals(123, intResult.value)
        assertEquals(Branch.USER, intResult.branch)

        val boolPref = OriginalGeckoPref(pref = "bool.pref", branch = PrefBranch.DEFAULT, value = "true")
        val boolResult =
            createPrefSetter(originalGeckoPref = boolPref, setType = BrowserPrefType.BOOL)
        assertNotNull(boolResult)
        assertEquals("bool.pref", boolResult.pref)
        assertEquals(true, boolResult.value)
        assertEquals(Branch.DEFAULT, boolResult.branch)
    }

    @Test
    fun `createPrefSetter with OriginalGeckoPref throws for unparsable int and bool prefs`() {
        val intPref = OriginalGeckoPref(pref = "int.pref", branch = PrefBranch.USER, value = "some-value")

        try {
            createPrefSetter(originalGeckoPref = intPref, setType = BrowserPrefType.INT)
            fail("Expected a Throwable to be thrown")
        } catch (e: Throwable) {
            assertIs<NumberFormatException>(e)
        }

        val boolPref = OriginalGeckoPref(pref = "bool.pref", branch = PrefBranch.USER, value = "some-value")
        try {
            createPrefSetter(originalGeckoPref = boolPref, setType = BrowserPrefType.BOOL)
            fail("Expected a Throwable to be thrown")
        } catch (e: Throwable) {
            assertIs<IllegalArgumentException>(e)
        }
    }

    @Test
    fun `createPrefSetter with OriginalGeckoPref throws for null value`() {
        val pref = OriginalGeckoPref(pref = "some.pref", branch = PrefBranch.USER, value = null)

        try {
            createPrefSetter(originalGeckoPref = pref, setType = BrowserPrefType.STRING)
            fail("Expected a Throwable to be thrown")
        } catch (e: Throwable) {
            assertIs<NullPointerException>(e)
        }
    }

    @Test
    fun `createPrefSetter with OriginalGeckoPref throws for null class`() {
        val pref = OriginalGeckoPref(pref = "some.pref", branch = PrefBranch.USER, value = "some-value")
        try {
            createPrefSetter(originalGeckoPref = pref, setType = null)
            fail("Expected a Throwable to be thrown")
        } catch (e: Throwable) {
            assertIs<IllegalStateException>(e)
        }
    }

    @Test
    fun `createPrefSetter with GeckoPrefState returns setter for various types`() {
        val stringPref = GeckoPrefState(GeckoPref(pref = "string.pref", branch = PrefBranch.USER), geckoValue = null, enrollmentValue = PrefEnrollmentData(experimentSlug = "123", prefValue = "some-value", featureId = "123", variable = "abc"), isUserSet = false)
        val stringResult =
            createPrefSetter(geckoPrefState = stringPref, setType = BrowserPrefType.STRING)
        assertNotNull(stringResult)
        assertEquals("string.pref", stringResult.pref)
        assertEquals("some-value", stringResult.value)
        assertEquals(Branch.USER, stringResult.branch)

        val intPref = GeckoPrefState(GeckoPref(pref = "int.pref", branch = PrefBranch.USER), geckoValue = null, enrollmentValue = PrefEnrollmentData(experimentSlug = "123", prefValue = "123", featureId = "123", variable = "abc"), isUserSet = false)
        val intResult = createPrefSetter(geckoPrefState = intPref, setType = BrowserPrefType.INT)
        assertNotNull(stringResult)
        assertEquals("int.pref", intResult!!.pref)
        assertEquals(123, intResult.value)
        assertEquals(Branch.USER, intResult.branch)

        val boolPref = GeckoPrefState(GeckoPref(pref = "bool.pref", branch = PrefBranch.DEFAULT), geckoValue = null, enrollmentValue = PrefEnrollmentData(experimentSlug = "123", prefValue = "true", featureId = "123", variable = "abc"), isUserSet = false)
        val boolResult = createPrefSetter(geckoPrefState = boolPref, setType = BrowserPrefType.BOOL)
        assertNotNull(boolResult)
        assertEquals("bool.pref", boolResult.pref)
        assertEquals(true, boolResult.value)
        assertEquals(Branch.DEFAULT, boolResult.branch)
    }

    @Test
    fun `createPrefSetter with GeckoPrefState throws for unparsable int and bool prefs`() {
        val intPref = GeckoPrefState(GeckoPref(pref = "int.pref", branch = PrefBranch.USER), geckoValue = null, enrollmentValue = PrefEnrollmentData(experimentSlug = "123", prefValue = "some-value", featureId = "123", variable = "abc"), isUserSet = false)
        try {
            createPrefSetter(geckoPrefState = intPref, setType = BrowserPrefType.INT)
            fail("Expected a Throwable to be thrown")
        } catch (e: Throwable) {
            assertIs<NumberFormatException>(e)
        }

        val boolPref = GeckoPrefState(GeckoPref(pref = "bool.pref", branch = PrefBranch.USER), geckoValue = null, enrollmentValue = PrefEnrollmentData(experimentSlug = "123", prefValue = "some-value", featureId = "123", variable = "abc"), isUserSet = false)
        try {
            createPrefSetter(geckoPrefState = boolPref, setType = BrowserPrefType.BOOL)
            fail("Expected a Throwable to be thrown")
        } catch (e: Throwable) {
            assertIs<IllegalArgumentException>(e)
        }
    }

    @Test
    fun `createPrefSetter with GeckoPrefState throws when enrollment value is null`() {
        val state = GeckoPrefState(GeckoPref(pref = "some.pref", branch = PrefBranch.USER), geckoValue = null, enrollmentValue = null, isUserSet = false)
        try {
            createPrefSetter(state, BrowserPrefType.STRING)
            fail("Expected a Throwable to be thrown")
        } catch (e: Throwable) {
            assertIs<NullPointerException>(e)
        }
    }

    @Test
    fun `createPrefSetter with GeckoPrefState throws for null class`() {
        val pref = OriginalGeckoPref(pref = "some.pref", branch = PrefBranch.USER, value = "some-value")
        try {
            createPrefSetter(pref, null)
            fail("Expected a Throwable to be thrown")
        } catch (e: Throwable) {
            assertIs<IllegalStateException>(e)
        }
    }

    @Test
    fun `createSettersFromOriginalGeckoPrefs returns setters for valid prefs`() {
        val types = mapOf(
            "string.pref" to BrowserPrefType.STRING,
            "int.pref" to BrowserPrefType.INT,
            "bool.pref" to BrowserPrefType.BOOL,
            "invalid.pref" to BrowserPrefType.INVALID,
        )

        val prefs = listOf(
            OriginalGeckoPref(pref = "string.pref", branch = PrefBranch.USER, value = "string-value"),
            OriginalGeckoPref(pref = "int.pref", branch = PrefBranch.USER, value = "123"),
            OriginalGeckoPref(pref = "bool.pref", branch = PrefBranch.USER, value = "true"),
            OriginalGeckoPref(pref = "invalid.pref", branch = PrefBranch.USER, value = "no"),
        )
        val result = createSettersFromOriginalGeckoPrefs(prefs, types)

        assertEquals(3, result.size)
        assertEquals("string.pref", result[0].pref)
        assertEquals("int.pref", result[1].pref)
        assertEquals("bool.pref", result[2].pref)

        assertEquals("string-value", result[0].value)
        assertEquals(123, result[1].value)
        assertEquals(true, result[2].value)
    }

    @Test
    fun `createSettersFromOriginalGeckoPrefs omits prefs that fail to parse`() {
        val types = mapOf(
            "int.pref" to BrowserPrefType.INT,
            "string.pref" to BrowserPrefType.STRING,
        )

        val prefs = listOf(
            OriginalGeckoPref(pref = "int.pref", branch = PrefBranch.USER, value = "string-value"),
            OriginalGeckoPref(pref = "string.pref", branch = PrefBranch.USER, value = "hello"),
        )
        val result = createSettersFromOriginalGeckoPrefs(prefs, types)

        assertEquals(1, result.size)
        assertEquals("string.pref", result[0].pref)
    }

    @Test
    fun `createSettersFromGeckoPrefStates returns setters for valid prefs`() {
        val types = mapOf(
            "string.pref" to BrowserPrefType.STRING,
            "int.pref" to BrowserPrefType.INT,
            "bool.pref" to BrowserPrefType.BOOL,
            "invalid.pref" to BrowserPrefType.INVALID,
        )

        val prefs = listOf(
            GeckoPrefState(
                GeckoPref(pref = "string.pref", branch = PrefBranch.USER),
                geckoValue = null,
                enrollmentValue = PrefEnrollmentData(experimentSlug = "123", prefValue = "string-pref", featureId = "123", variable = "abc"),
                isUserSet = false,
            ),
            GeckoPrefState(
                GeckoPref(pref = "int.pref", branch = PrefBranch.DEFAULT),
                geckoValue = null,
                enrollmentValue = PrefEnrollmentData(experimentSlug = "123", prefValue = "123", featureId = "123", variable = "abc"),
                isUserSet = false,
            ),
            GeckoPrefState(
                GeckoPref(pref = "invalid.pref", branch = PrefBranch.DEFAULT),
                geckoValue = null,
                enrollmentValue = PrefEnrollmentData(experimentSlug = "123", prefValue = "true", featureId = "123", variable = "abc"),
                isUserSet = false,
            ),
            GeckoPrefState(
                GeckoPref(pref = "bool.pref", branch = PrefBranch.DEFAULT),
                geckoValue = null,
                enrollmentValue = PrefEnrollmentData(experimentSlug = "123", prefValue = "true", featureId = "123", variable = "abc"),
                isUserSet = false,
            ),
        )
        val result = createSettersFromGeckoPrefStates(prefs, types)

        assertEquals(3, result.size)
        assertEquals("string.pref", result[0].pref)
        assertEquals("int.pref", result[1].pref)
        assertEquals("bool.pref", result[2].pref)

        assertEquals("string-pref", result[0].value)
        assertEquals(123, result[1].value)
        assertEquals(true, result[2].value)
    }

    @Test
    fun `createSettersFromGeckoPrefStates omits prefs that fail to parse`() {
        val types = mapOf(
            "string.pref" to BrowserPrefType.STRING,
            "bool.pref" to BrowserPrefType.BOOL,
        )

        val prefs = listOf(
            GeckoPrefState(
                GeckoPref(pref = "string.pref", branch = PrefBranch.USER),
                geckoValue = null,
                enrollmentValue = null,
                isUserSet = false,
            ),
            GeckoPrefState(
                GeckoPref(pref = "bool.pref", branch = PrefBranch.DEFAULT),
                geckoValue = null,
                enrollmentValue = PrefEnrollmentData(experimentSlug = "123", prefValue = "true", featureId = "123", variable = "abc"),
                isUserSet = false,
            ),
        )
        val result = createSettersFromGeckoPrefStates(prefs, types)

        assertEquals(1, result.size)
        assertEquals("bool.pref", result[0].pref)
    }
}
