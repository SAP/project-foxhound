/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.experiments.prefhandling

import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import io.mockk.verifyOrder
import junit.framework.TestCase.assertEquals
import junit.framework.TestCase.assertNotNull
import junit.framework.TestCase.assertNull
import junit.framework.TestCase.assertTrue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import mozilla.components.ExperimentalAndroidComponentsApi
import mozilla.components.concept.engine.Engine
import mozilla.components.concept.engine.preferences.BrowserPrefType
import mozilla.components.concept.engine.preferences.BrowserPreference
import mozilla.components.service.nimbus.NimbusApi
import org.junit.Assert
import org.junit.Test
import org.mozilla.experiments.nimbus.internal.GeckoPref
import org.mozilla.experiments.nimbus.internal.GeckoPrefState
import org.mozilla.experiments.nimbus.internal.OriginalGeckoPref
import org.mozilla.experiments.nimbus.internal.PrefBranch
import org.mozilla.experiments.nimbus.internal.PrefEnrollmentData
import org.mozilla.experiments.nimbus.internal.PrefUnenrollReason

const val TEST_PREF = "gecko.nimbus.test"
const val SECOND_TEST_PREF = "gecko.nimbus.test.two"

@OptIn(ExperimentalAndroidComponentsApi::class)
class NimbusGeckoPrefHandlerTest {

    private val mockNimbusApi = mockk<NimbusApi>(relaxed = true)
    private val mockEngine = mockk<Engine>(relaxed = true)

    private fun makeHandler(
        engine: Engine = mockEngine,
        nimbusApi: NimbusApi = mockNimbusApi,
        geckoScope: CoroutineScope = TestScope(),
    ) = NimbusGeckoPrefHandler(lazy { engine }, lazy { nimbusApi }, geckoScope)

    @Test
    fun `test nimbusGeckoPreferences has appropriate values`() {
        val handler = makeHandler()
        assertNotNull(handler.nimbusGeckoPreferences["gecko-nimbus-validation"])
        assertNotNull(
            handler.nimbusGeckoPreferences["gecko-nimbus-validation"]?.get(
                "test-preference",
            ),
        )
        assertNotNull(
            handler.nimbusGeckoPreferences["gecko-nimbus-validation"]?.get(
                "test-preference-2",
            ),
        )
    }

    @Test
    fun `preferenceList has appropriate values`() {
        val handler = makeHandler()
        assertTrue(handler.preferenceList.containsAll(listOf(TEST_PREF, SECOND_TEST_PREF)))
    }

    @Test
    fun `WHEN getPreferenceStateFromGecko is successful THEN getBrowserPrefs is called AND it returns true`() = runTest {
        val mockPrefResult =
            listOf(
                BrowserPreference(
                pref = TEST_PREF,
                defaultValue = "testValue",
                hasUserChangedValue = false,
                prefType = BrowserPrefType.STRING,
            ),
            )
        mockEngine.apply {
            every { getBrowserPrefs(any(), any(), any()) } answers {
                val onSuccess = secondArg<(List<BrowserPreference<*>>) -> Unit>()
                onSuccess(mockPrefResult)
            }
        }
        val handler = makeHandler(geckoScope = this)
        assertEquals(null, handler.getPreferenceState(TEST_PREF)?.geckoValue)

        val result = handler.getPreferenceStateFromGecko()
        testScheduler.advanceUntilIdle()
        verify { mockEngine.getBrowserPrefs(any(), any(), any()) }
        assertTrue(result.await())

        assertEquals(mockPrefResult[0].defaultValue, handler.getPreferenceState(TEST_PREF)?.geckoValue)
        assertEquals(mockPrefResult[0].prefType, handler.preferenceTypes[TEST_PREF])
    }

    @Test
    fun `WHEN getPreferenceStateFromGecko is fails THEN getBrowserPrefs is called AND it returns false`() = runTest {
        every { mockEngine.getBrowserPrefs(any(), any(), any()) } answers {
            val onError = thirdArg<(Throwable) -> Unit>()
            onError(Throwable("error"))
        }

        val handler = makeHandler(engine = mockEngine, geckoScope = this)
        val result = handler.getPreferenceStateFromGecko()

        Assert.assertFalse(result.await())
        verify { mockEngine.getBrowserPrefs(any(), any(), any()) }
        assertEquals(null, handler.getPreferenceState(TEST_PREF)?.geckoValue)
    }

    @Test
    fun `WHEN setGeckoPrefsState is successful THEN setBrowserPrefs is called`() = runTest {
        val handler = makeHandler(engine = mockEngine, geckoScope = this)
        handler.start()
        handler.preferenceTypes[TEST_PREF] = BrowserPrefType.STRING

        val prefState = GeckoPrefState(
            geckoPref = GeckoPref(pref = TEST_PREF, branch = PrefBranch.USER),
            geckoValue = null,
            enrollmentValue = PrefEnrollmentData(
                experimentSlug = "test-experiment",
                prefValue = "test-value",
                featureId = "gecko-nimbus-validation",
                variable = "test-preference",
            ),
            isUserSet = false,
        )
        every { mockEngine.getBrowserPrefs(any(), any(), any()) } answers {
            val onSuccess = secondArg<(List<BrowserPreference<*>>) -> Unit>()
            onSuccess(listOf(BrowserPreference<String>(pref = TEST_PREF, defaultValue = "original-value", hasUserChangedValue = false, prefType = BrowserPrefType.STRING)))
        }
        every { mockEngine.setBrowserPrefs(any(), any(), any()) } answers {
            val onSuccess = secondArg<(Map<String, Boolean>) -> Unit>()
            onSuccess(mapOf(TEST_PREF to true))
        }

        handler.setGeckoPrefsState(listOf(prefState))
        testScheduler.advanceUntilIdle()

        verify { mockEngine.setBrowserPrefs(any(), any(), any()) }
    }

    @Test
    fun `WHEN setGeckoPrefsState fails THEN the item is unenrolled`() = runTest {
        val handler = makeHandler(engine = mockEngine, geckoScope = this)
        handler.start()
        handler.preferenceTypes[TEST_PREF] = BrowserPrefType.STRING

        val prefState = GeckoPrefState(
            geckoPref = GeckoPref(pref = TEST_PREF, branch = PrefBranch.USER),
            geckoValue = null,
            enrollmentValue = PrefEnrollmentData(
                experimentSlug = "test-experiment",
                prefValue = "test-value",
                featureId = "gecko-nimbus-validation",
                variable = "test-preference",
            ),
            isUserSet = false,
        )
        every { mockEngine.getBrowserPrefs(any(), any(), any()) } answers {
            val onSuccess = secondArg<(List<BrowserPreference<*>>) -> Unit>()
            onSuccess(listOf(BrowserPreference<String>(pref = TEST_PREF, defaultValue = "original-value", hasUserChangedValue = false, prefType = BrowserPrefType.STRING)))
        }
        every { mockEngine.setBrowserPrefs(any(), any(), any()) } answers {
            val onSuccess = secondArg<(Map<String, Boolean>) -> Unit>()
            // Failed to set
            onSuccess(mapOf(TEST_PREF to false))
        }

        val capturedPrefState = slot<GeckoPrefState>()
        val capturedReason = slot<PrefUnenrollReason>()
        every { mockNimbusApi.unenrollForGeckoPref(capture(capturedPrefState), capture(capturedReason)) } returns Unit

        handler.setGeckoPrefsState(listOf(prefState))
        testScheduler.advanceUntilIdle()

        verify { mockEngine.unregisterPrefsForObservation(match { it.containsAll(listOf(TEST_PREF, SECOND_TEST_PREF)) }, any(), any()) }
        verify { mockNimbusApi.unenrollForGeckoPref(any(), any()) }

        assertEquals(TEST_PREF, capturedPrefState.captured.prefString())
        assertEquals(PrefUnenrollReason.FAILED_TO_SET, capturedReason.captured)
    }

    @Test
    fun `WHEN setGeckoPrefsState cannot make a setter THEN the item is unenrolled`() = runTest {
        val handler = makeHandler(engine = mockEngine, geckoScope = this)
        handler.start()
        handler.preferenceTypes[TEST_PREF] = BrowserPrefType.STRING
        // Cannot make a setter when there is no enrollmentValue
        val prefState = GeckoPrefState(
            geckoPref = GeckoPref(pref = TEST_PREF, branch = PrefBranch.USER),
            geckoValue = null,
            enrollmentValue = null,
            isUserSet = false,
        )

        every { mockEngine.getBrowserPrefs(any(), any(), any()) } answers {
            val onSuccess = secondArg<(List<BrowserPreference<*>>) -> Unit>()
            onSuccess(listOf(BrowserPreference<String>(pref = TEST_PREF, defaultValue = "original-value", hasUserChangedValue = false, prefType = BrowserPrefType.STRING)))
        }
        every { mockEngine.setBrowserPrefs(any(), any(), any()) } answers {
            val onSuccess = secondArg<(Map<String, Boolean>) -> Unit>()
            // No other valid items to set
            onSuccess(emptyMap())
        }

        val capturedPrefState = slot<GeckoPrefState>()
        val capturedReason = slot<PrefUnenrollReason>()
        every { mockNimbusApi.unenrollForGeckoPref(capture(capturedPrefState), capture(capturedReason)) } returns Unit

        handler.setGeckoPrefsState(listOf(prefState))
        testScheduler.advanceUntilIdle()

        verify { mockEngine.unregisterPrefsForObservation(match { it.containsAll(listOf(TEST_PREF, SECOND_TEST_PREF)) }, any(), any()) }
        verify { mockNimbusApi.unenrollForGeckoPref(any(), any()) }

        assertEquals(TEST_PREF, capturedPrefState.captured.prefString())
        assertEquals(PrefUnenrollReason.FAILED_TO_SET, capturedReason.captured)
    }

    @Test
    fun `WHEN setGeckoPrefsOriginalValues is successful on a known value THEN prefs are unregistered from observation before setBrowserPrefs is called`() = runTest {
        val handler = makeHandler(engine = mockEngine, geckoScope = this)
        handler.preferenceTypes[TEST_PREF] = BrowserPrefType.STRING
        val originalPref = OriginalGeckoPref(
            pref = TEST_PREF,
            branch = PrefBranch.USER,
            value = "original-value",
        )
        every { mockEngine.setBrowserPrefs(any(), any(), any()) } answers {
            val onSuccess = secondArg<(Map<String, Boolean>) -> Unit>()
            onSuccess(mapOf(TEST_PREF to true))
        }

        handler.setGeckoPrefsOriginalValues(listOf(originalPref))
        testScheduler.advanceUntilIdle()

        verifyOrder {
            mockEngine.unregisterPrefsForObservation(match { it.contains(TEST_PREF) }, any(), any())
            mockEngine.setBrowserPrefs(any(), any(), any())
        }
    }

    @Test
    fun `WHEN setGeckoPrefsOriginalValues is successful on an unknown value THEN clearBrowserUserPref is called`() = runTest {
        val handler = makeHandler(engine = mockEngine, geckoScope = this)
        val originalPref = OriginalGeckoPref(
            pref = TEST_PREF,
            branch = PrefBranch.USER,
            value = null,
        )
        handler.preferenceTypes[TEST_PREF] = BrowserPrefType.STRING

        every { mockEngine.setBrowserPrefs(any(), any(), any()) } answers {
            val onSuccess = secondArg<(Map<String, Boolean>) -> Unit>()
            onSuccess(emptyMap())
        }
        every { mockEngine.clearBrowserUserPref(any(), any(), any()) } answers {
            val onSuccess = secondArg<() -> Unit>()
            onSuccess()
        }

        handler.setGeckoPrefsOriginalValues(listOf(originalPref))
        testScheduler.advanceUntilIdle()

        verify { mockEngine.clearBrowserUserPref(eq(TEST_PREF), any(), any()) }
    }

    @Test
    fun `WHEN getSetterPairsFromOriginalGeckoPrefs is called THEN the correct list is formed`() = runTest {
        val handler = makeHandler(engine = mockEngine, geckoScope = this)
        handler.preferenceTypes[TEST_PREF] = BrowserPrefType.STRING
        val otherPref = "gecko.nimbus.other"
        val prefWithValue = OriginalGeckoPref(pref = TEST_PREF, branch = PrefBranch.USER, value = "original")
        val prefWithoutValue = OriginalGeckoPref(pref = otherPref, branch = PrefBranch.USER, value = null)
        handler.preferenceTypes[TEST_PREF] = BrowserPrefType.STRING
        handler.preferenceTypes[otherPref] = BrowserPrefType.STRING

        every { mockEngine.setBrowserPrefs(any(), any(), any()) } answers {
            val onSuccess = secondArg<(Map<String, Boolean>) -> Unit>()
            onSuccess(mapOf(TEST_PREF to true))
        }
        every { mockEngine.clearBrowserUserPref(any(), any(), any()) } answers {
            val onSuccess = secondArg<() -> Unit>()
            onSuccess()
        }

        handler.setGeckoPrefsOriginalValues(listOf(prefWithValue, prefWithoutValue))
        testScheduler.advanceUntilIdle()

        verify { mockEngine.setBrowserPrefs(any(), any(), any()) }
        verify { mockEngine.clearBrowserUserPref(eq(otherPref), any(), any()) }
    }

    @Test
    fun `WHEN onPreferenceChange is called THEN unenrollForGeckoPref is called`() {
        val handler = makeHandler()
        handler.start()

        handler.onPreferenceChange(
            BrowserPreference<String>(pref = TEST_PREF, hasUserChangedValue = false, prefType = BrowserPrefType.STRING),
        )

        verify { mockEngine.unregisterPrefsForObservation(match { it.containsAll(listOf(TEST_PREF, SECOND_TEST_PREF)) }, any(), any()) }
        verify { mockNimbusApi.unenrollForGeckoPref(any(), eq(PrefUnenrollReason.CHANGED)) }
    }

    @Test
    fun `WHEN setGeckoPrefsState is called with prefs not in preferenceTypes THEN getBrowserPrefs is called and preferenceTypes is populated`() = runTest {
        val handler = makeHandler(engine = mockEngine, geckoScope = this)

        every { mockEngine.getBrowserPrefs(any(), any(), any()) } answers {
            val onSuccess = secondArg<(List<BrowserPreference<*>>) -> Unit>()
            onSuccess(listOf(BrowserPreference<String>(pref = TEST_PREF, hasUserChangedValue = false, prefType = BrowserPrefType.STRING)))
        }
        every { mockEngine.setBrowserPrefs(any(), any(), any()) } answers {
            val onSuccess = secondArg<(Map<String, Boolean>) -> Unit>()
            onSuccess(emptyMap())
        }

        val prefState = GeckoPrefState(
            geckoPref = GeckoPref(pref = TEST_PREF, branch = PrefBranch.USER),
            geckoValue = null,
            enrollmentValue = PrefEnrollmentData(
                experimentSlug = "test-experiment",
                prefValue = "test-value",
                featureId = "gecko-nimbus-validation",
                variable = "test-preference",
            ),
            isUserSet = false,
        )

        handler.setGeckoPrefsState(listOf(prefState))
        testScheduler.advanceUntilIdle()

        verify { mockEngine.getBrowserPrefs(any(), any(), any()) }
        assertEquals(BrowserPrefType.STRING, handler.preferenceTypes[TEST_PREF])
    }

    @Test
    fun `WHEN handleErrors is called with errors from the same multi-pref experiment THEN unenrollForGeckoPref is only called once`() {
        val handler = makeHandler()
        handler.enrollmentErrors.add(
            Pair(
                GeckoPrefState(geckoPref = GeckoPref(pref = TEST_PREF, branch = PrefBranch.DEFAULT), geckoValue = null, enrollmentValue = null, isUserSet = false),
                null,
            ),
        )
        handler.enrollmentErrors.add(
            Pair(
                GeckoPrefState(geckoPref = GeckoPref(pref = SECOND_TEST_PREF, branch = PrefBranch.DEFAULT), geckoValue = null, enrollmentValue = null, isUserSet = false),
                null,
            ),
        )

        handler.handleErrors()

        verify(exactly = 1) { mockNimbusApi.unenrollForGeckoPref(any(), eq(PrefUnenrollReason.FAILED_TO_SET)) }
    }

    @Test
    fun `WHEN getPreferenceStateFromGecko is called twice concurrently with different preferenceList THEN getBrowserPrefs is called twice`() = runTest {
        // getBrowserPrefs never calls onSuccess, leaving the first fetch in-flight
        val capturedPrefs = mutableListOf<List<String>>()
        every { mockEngine.getBrowserPrefs(any(), any(), any()) } answers { capturedPrefs.add(firstArg()) }

        val handler = makeHandler(geckoScope = this)
        handler.getPreferenceStateFromGecko()

        // First request is now in-flight
        testScheduler.advanceUntilIdle()

        // Change the pref list to simulate a different set of prefs being requested
        handler.preferenceList = listOf("browser.some.other.pref")
        handler.getPreferenceStateFromGecko()

        testScheduler.advanceUntilIdle()

        // Checking that the engine received two distinct requests
        verify(exactly = 2) { mockEngine.getBrowserPrefs(any(), any(), any()) }
        assertTrue(capturedPrefs[0].containsAll(listOf(TEST_PREF, SECOND_TEST_PREF)))
        assertEquals(listOf("browser.some.other.pref"), capturedPrefs[1])
    }

    @Test
    fun `WHEN getPreferenceStateFromGecko is called twice concurrently THEN getBrowserPrefs is only called once and both results are true`() = runTest {
        var pendingOnSuccess: ((List<BrowserPreference<*>>) -> Unit)? = null
        every { mockEngine.getBrowserPrefs(any(), any(), any()) } answers {
            pendingOnSuccess = secondArg()
        }

        val handler = makeHandler(geckoScope = this)
        val result1 = handler.getPreferenceStateFromGecko()
        val result2 = handler.getPreferenceStateFromGecko()

        testScheduler.advanceUntilIdle()

        assertNotNull(handler.fetchingGeckoPrefState)

        // Both should have shared the same fetch request
        verify(exactly = 1) { mockEngine.getBrowserPrefs(any(), any(), any()) }
        assertEquals(handler.preferenceList, handler.fetchingGeckoPrefState!!.first)

        // Deliver the Gecko response
        pendingOnSuccess!!(
            listOf(
                BrowserPreference(
                    pref = TEST_PREF,
                    defaultValue = "value",
                    hasUserChangedValue = false,
                    prefType = BrowserPrefType.STRING,
                ),
            ),
        )
        testScheduler.advanceUntilIdle()

        assertNull(handler.fetchingGeckoPrefState)
        assertTrue(result1.await())
        assertTrue(result2.await())
    }

    @Test
    fun `WHEN allExperimentPrefs is called with an unknown pref THEN only that pref is returned`() {
        val unknownPref = "some.unknown.pref"
        val handler = makeHandler()
        val prefState = GeckoPrefState(
            geckoPref = GeckoPref(pref = unknownPref, branch = PrefBranch.DEFAULT),
            geckoValue = null,
            enrollmentValue = null,
            isUserSet = false,
        )

        assertEquals(listOf(unknownPref), handler.allExperimentPrefs(prefState))
    }

    @Test
    fun `WHEN allExperimentPrefs is called with a pref in a multi-pref feature THEN all prefs in the feature are returned`() {
        val handler = makeHandler()
        val prefState = GeckoPrefState(
            geckoPref = GeckoPref(pref = TEST_PREF, branch = PrefBranch.DEFAULT),
            geckoValue = null,
            enrollmentValue = null,
            isUserSet = false,
        )

        val result = handler.allExperimentPrefs(prefState)

        assertEquals(2, result.size)
        assertTrue(result.containsAll(listOf(TEST_PREF, SECOND_TEST_PREF)))
    }

    // Test for Bug 2033755: When an experiment unenrolls and a rollout
    // immediately enrolls the same pref, the rollout must not inherit the stale experiment
    // Gecko value as its original Gecko state. The rollout should use the original post-restore Gecko value instead.
    @Test
    fun `WHEN experiment unenrolls and rollout immediately enrolls the same pref THEN the rollout registers the pre-experiment value as its original not the experiment value`() = runTest {
        val handler = makeHandler(engine = mockEngine, geckoScope = this)
        handler.start()
        handler.preferenceTypes[TEST_PREF] = BrowserPrefType.STRING

        // Simulate a pref that was set by an enrolled experiment
        handler.getPreferenceState(TEST_PREF)?.let { state ->
            state.geckoValue = "experiment-value"
            state.isUserSet = true
            state.enrollmentValue = PrefEnrollmentData(
                experimentSlug = "experiment-slug",
                prefValue = "experiment-value",
                featureId = "gecko-nimbus-validation",
                variable = "test-preference",
            )
        }

        // Mock setting a pref
        every { mockEngine.setBrowserPrefs(any(), any(), any()) } answers {
            val onSuccess = secondArg<(Map<String, Boolean>) -> Unit>()
            onSuccess(mapOf(TEST_PREF to true))
        }

        // Mock getting the default value
        every { mockEngine.getBrowserPrefs(any(), any(), any()) } answers {
            val onSuccess = secondArg<(List<BrowserPreference<*>>) -> Unit>()
            onSuccess(
                listOf(
                    BrowserPreference<String>(
                        pref = TEST_PREF,
                        defaultValue = "default-value",
                        hasUserChangedValue = false,
                        prefType = BrowserPrefType.STRING,
                    ),
                ),
            )
        }

        // Capture registrations back to Nimbus of original values
        val capturedStates = slot<List<GeckoPrefState>>()
        every { mockNimbusApi.registerPreviousGeckoPrefStates(capture(capturedStates)) } answers { }

        // Experiment unenrolls
        handler.setGeckoPrefsOriginalValues(
            listOf(OriginalGeckoPref(pref = TEST_PREF, branch = PrefBranch.USER, value = "default-value")),
        )
        // Rollout enrolls immediately
        handler.setGeckoPrefsState(
            listOf(
                GeckoPrefState(
                    geckoPref = GeckoPref(pref = TEST_PREF, branch = PrefBranch.USER),
                    // Stale value
                    geckoValue = "experiment-value",
                    enrollmentValue = PrefEnrollmentData(
                        experimentSlug = "rollout-slug",
                        prefValue = "rollout-value",
                        featureId = "gecko-nimbus-validation",
                        variable = "test-preference",
                    ),
                    isUserSet = true,
                ),
            ),
        )
        testScheduler.advanceUntilIdle()

        // The stale Gecko value should have been cleared, which will force a fresh Gecko fetch.
        verify { mockEngine.getBrowserPrefs(any(), any(), any()) }

        // The original registered for the rollout must not be the stale experiment value.
        verify { mockNimbusApi.registerPreviousGeckoPrefStates(any()) }
        val registeredState = capturedStates.captured.firstOrNull { it.prefString() == TEST_PREF }
        assertNotNull(registeredState)
        Assert.assertNotEquals("experiment-value", registeredState?.geckoValue)
    }

    // Test for Bug 2033772: When a rollout unenrolls and an experiment is active and
    // re-evaluates the same pref, then the experiment should not try to fetch the Gecko value a second time
    // because it will get its own value.
    @Test
    fun `WHEN a still-active experiment is re-evaluated THEN the original gecko value is not overwritten`() = runTest {
        val handler = makeHandler(engine = mockEngine, geckoScope = this)
        handler.start()
        handler.preferenceTypes[TEST_PREF] = BrowserPrefType.STRING

        // Simulate a pref that was set by an enrolled experiment
        handler.getPreferenceState(TEST_PREF)?.let { state ->
            state.geckoValue = "experiment-value"
            state.isUserSet = false
            state.enrollmentValue = PrefEnrollmentData(
                experimentSlug = "experiment-slug",
                prefValue = "experiment-value",
                featureId = "gecko-nimbus-validation",
                variable = "test-preference",
            )
        }

        every { mockEngine.setBrowserPrefs(any(), any(), any()) } answers {
            val onSuccess = secondArg<(Map<String, Boolean>) -> Unit>()
            onSuccess(mapOf(TEST_PREF to true))
        }

        // Nimbus re-evaluates the same experiment after the rollout is removed
        handler.setGeckoPrefsState(
            listOf(
                GeckoPrefState(
                    geckoPref = GeckoPref(pref = TEST_PREF, branch = PrefBranch.USER),
                    geckoValue = "experiment-value",
                    enrollmentValue = PrefEnrollmentData(
                        experimentSlug = "experiment-slug",
                        prefValue = "experiment-value",
                        featureId = "gecko-nimbus-validation",
                        variable = "test-preference",
                    ),
                    isUserSet = false,
                ),
            ),
        )
        testScheduler.advanceUntilIdle()

        // Information is already present
        verify(exactly = 0) { mockEngine.getBrowserPrefs(any(), any(), any()) }
        // Must not call registerPreviousGeckoPrefStates — the correct original Gecko
        // value is already stored in Nimbus and re-registering would overwrite it with the stale experiment value.
        verify(exactly = 0) { mockNimbusApi.registerPreviousGeckoPrefStates(any()) }
    }
}
