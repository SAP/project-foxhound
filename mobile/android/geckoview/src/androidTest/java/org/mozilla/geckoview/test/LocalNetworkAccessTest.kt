/* -*- Mode: Java; c-basic-offset: 4; tab-width: 4; indent-tabs-mode: nil; -*-
 * Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

package org.mozilla.geckoview.test

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/**
 * This pref references the request blocking feature of the Local Network / Device Access feature.
 */
private const val LNA_BLOCKING_PREF = "network.lna.blocking"

/**
 * This pref references the tracker blocking features of the Local Network / Device Access feature.
 */
private const val LNA_TRACKER_BLOCKING_PREF = "network.lna.block_trackers"

/**
 * This pref references the state of the overall Local Network / Device Access feature.
 */
private const val LNA_FEATURE_ENABLED_PREF = "network.lna.enabled"

@RunWith(AndroidJUnit4::class)
class LocalNetworkAccessTest : BaseSessionTest() {

    @Test
    fun setLnaBlocking_updatesPrefsToTrue() {
        val settings = sessionRule.runtime.settings

        settings.setLnaBlocking(true)

        val lnaBlockingPrefValue = sessionRule.getPrefs(LNA_BLOCKING_PREF)[0] as Boolean

        assertTrue(
            "Calling setLnaBlocking(true) should set the pref to true",
            lnaBlockingPrefValue,
        )
    }

    @Test
    fun setLnaBlocking_updatesPrefsToFalse() {
        val settings = sessionRule.runtime.settings

        settings.setLnaBlocking(false)

        val lnaBlockingPrefValue = sessionRule.getPrefs(LNA_BLOCKING_PREF)[0] as Boolean

        assertFalse(
            "Calling setLnaBlocking(false) should set the pref to false",
            lnaBlockingPrefValue,
        )
    }

    @Test
    fun setLnaBlocking_returnsTrueWhenLnaBlockingIsSetToTrue() {
        val settings = sessionRule.runtime.settings
        settings.setLnaBlocking(true)

        assertTrue(
            "setLnaBlocking() should return true",
            settings.lnaBlocking!!,
        )
    }

    @Test
    fun setLnaBlocking_returnsFalseWhenLnaBlockingIsSetToFalse() {
        val settings = sessionRule.runtime.settings
        settings.setLnaBlocking(false)

        assertFalse(
            "setLnaBlocking() should return false",
            settings.lnaBlocking!!,
        )
    }

    @Test
    fun getLnaFeatureEnabled_returnsTrueWhenLnaFeatureIsSetToTrue() {
        val settings = sessionRule.runtime.settings
        settings.setLnaEnabled(true)

        assertTrue(
            "getLnaFeatureEnabled() should return true",
            settings.lnaEnabled!!,
        )
    }

    @Test
    fun getLnaFeatureEnabled_returnsFalseWhenLnaFeatureIsSetToFalse() {
        val settings = sessionRule.runtime.settings
        settings.setLnaEnabled(false)

        assertFalse(
            "getLnaFeatureEnabled() should return false",
            settings.lnaEnabled!!,
        )
    }

    @Test
    fun setLnaFeatureEnabled_updatesPrefsToTrue() {
        val settings = sessionRule.runtime.settings
        settings.setLnaEnabled(true)

        val lnaFeatureEnabledPrefValue =
            sessionRule.getPrefs(LNA_FEATURE_ENABLED_PREF)[0] as Boolean
        assertTrue(
            "Calling setLnaFeatureEnabled(true) should set the pref to true",
            lnaFeatureEnabledPrefValue,
        )
    }

    @Test
    fun setLnaEnabled_updatesPrefsToFalse() {
        val settings = sessionRule.runtime.settings
        settings.setLnaEnabled(false)

        val lnaEnabledPrefValue =
            sessionRule.getPrefs(LNA_FEATURE_ENABLED_PREF)[0] as Boolean
        assertFalse(
            "Calling setLnaEnabled(false) should set the pref to false",
            lnaEnabledPrefValue,
        )
    }

    @Test
    fun getLnaBlockTrackers_returnsFalseWhenLnaTrackerBlockingIsSetToFalse() {
        val settings = sessionRule.runtime.settings
        settings.setLnaBlockTrackers(false)

        assertFalse(
            "getLnaBlockTrackers() should return false",
            settings.lnaBlockTrackers!!,
        )
    }

    @Test
    fun getLnaBlockTrackers_returnsTrueWhenLnaTrackerBlockingIsSetToTrue() {
        val settings = sessionRule.runtime.settings
        settings.setLnaBlockTrackers(true)

        assertTrue(
            "getLnaBlockTrackers() should return true",
            settings.lnaBlockTrackers!!,
        )
    }

    @Test
    fun setLnaBlockTrackers_updatesPrefsToTrue() {
        val settings = sessionRule.runtime.settings

        settings.setLnaBlockTrackers(true)

        val lnaTrackerBlockingPrefValue =
            sessionRule.getPrefs(LNA_TRACKER_BLOCKING_PREF)[0] as Boolean

        assertTrue(
            "Calling setLnaBlockTrackers(true) should set the pref to true",
            lnaTrackerBlockingPrefValue,
        )
    }

    @Test
    fun setLnaBlockTrackers_updatesPrefsToFalse() {
        val settings = sessionRule.runtime.settings

        settings.setLnaBlockTrackers(false)

        val lnaTrackerBlockingPrefValue =
            sessionRule.getPrefs(LNA_TRACKER_BLOCKING_PREF)[0] as Boolean

        assertFalse(
            "Calling setLnaBlockTrackers(false) should set the pref to false",
            lnaTrackerBlockingPrefValue,
        )
    }
}
