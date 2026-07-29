/*
 * Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

package org.mozilla.geckoview.test

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.MediumTest
import junit.framework.TestCase.assertEquals
import junit.framework.TestCase.assertFalse
import junit.framework.TestCase.assertNotNull
import junit.framework.TestCase.assertTrue
import junit.framework.TestCase.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.geckoview.AIFeaturesController.AIFeaturesException
import org.mozilla.geckoview.AIFeaturesController.AIFeaturesException.ERROR_UNKNOWN_FEATURE
import org.mozilla.geckoview.AIFeaturesController.RuntimeAIFeatures

@RunWith(AndroidJUnit4::class)
@MediumTest
class AIFeaturesTest : BaseSessionTest() {

    @Test
    fun listFeaturesTest() {
        val features = sessionRule.waitForResult(RuntimeAIFeatures.listFeatures())
        assertNotNull("Features should not be null", features)
        val translations = features.getValue("translations")
        assertEquals("Translations feature id should match", "translations", translations.id)
        assertTrue("Translations feature is enabled", translations.isEnabled)
        assertTrue("Translations feature is allowed", translations.isAllowed)
        assertFalse("Translations feature is not blocked", translations.isBlocked)
    }

    @Test
    fun setFeatureEnablementTest() {
        val initialFeatures = sessionRule.waitForResult(RuntimeAIFeatures.listFeatures())
        val initialIsEnabled = initialFeatures.getValue("translations").isEnabled

        sessionRule.waitForResult(RuntimeAIFeatures.setFeatureEnablement("translations", true))
        val featuresEnabled = sessionRule.waitForResult(RuntimeAIFeatures.listFeatures())
        assertTrue("Translations feature should now be enabled", featuresEnabled.getValue("translations").isEnabled)

        sessionRule.waitForResult(RuntimeAIFeatures.setFeatureEnablement("translations", false))
        val featuresDisabled = sessionRule.waitForResult(RuntimeAIFeatures.listFeatures())
        assertFalse("Translations feature should now be disabled", featuresDisabled.getValue("translations").isEnabled)

        try {
            sessionRule.waitForResult(RuntimeAIFeatures.setFeatureEnablement("unknown-feature", true))
            fail("Should not complete request for an unknown feature.")
        } catch (e: RuntimeException) {
            val aife = e.cause as AIFeaturesException
            assertEquals(
                "Should reject with ERROR_UNKNOWN_FEATURE.",
                ERROR_UNKNOWN_FEATURE,
                aife.code,
            )
        }

        sessionRule.waitForResult(RuntimeAIFeatures.setFeatureEnablement("translations", initialIsEnabled))
    }

    @Test
    fun makeFeatureAvailableTest() {
        val initialFeatures = sessionRule.waitForResult(RuntimeAIFeatures.listFeatures())
        val initialIsEnabled = initialFeatures.getValue("translations").isEnabled

        // setFeatureEnablement to true
        sessionRule.waitForResult(RuntimeAIFeatures.setFeatureEnablement("translations", true))
        val enabledFeatures = sessionRule.waitForResult(RuntimeAIFeatures.listFeatures()).getValue("translations")
        assertTrue("Translations feature should be enabled.", enabledFeatures.isEnabled)
        assertTrue("Translations feature should be allowed.", enabledFeatures.isAllowed)
        assertFalse("Translations feature should not be blocked.", enabledFeatures.isBlocked)

        // setFeatureEnablement to false
        sessionRule.waitForResult(RuntimeAIFeatures.setFeatureEnablement("translations", false))
        val blockedFeatures = sessionRule.waitForResult(RuntimeAIFeatures.listFeatures()).getValue("translations")
        assertFalse("Translations feature should not be enabled.", blockedFeatures.isEnabled)
        assertTrue("Translations feature should be allowed.", blockedFeatures.isAllowed)
        assertTrue("Translations feature should be blocked.", blockedFeatures.isBlocked)

        // Make available will reset back to default
        sessionRule.waitForResult(RuntimeAIFeatures.makeFeatureAvailable("translations"))
        val availableFeatures = sessionRule.waitForResult(RuntimeAIFeatures.listFeatures()).getValue("translations")
        assertTrue("Translations feature should be enabled.", availableFeatures.isEnabled)
        assertTrue("Translations feature should be allowed.", availableFeatures.isAllowed)
        assertFalse("Translations feature should not be blocked.", availableFeatures.isBlocked)

        try {
            sessionRule.waitForResult(RuntimeAIFeatures.makeFeatureAvailable("unknown-feature"))
            fail("Should not complete request for an unknown feature.")
        } catch (e: RuntimeException) {
            val ae = e.cause as AIFeaturesException
            assertEquals(
                "Should reject with ERROR_UNKNOWN_FEATURE.",
                ERROR_UNKNOWN_FEATURE,
                ae.code,
            )
        }

        sessionRule.waitForResult(RuntimeAIFeatures.setFeatureEnablement("translations", initialIsEnabled))
    }
}
