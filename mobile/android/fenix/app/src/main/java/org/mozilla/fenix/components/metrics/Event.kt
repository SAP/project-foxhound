/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.metrics

sealed class Event {

    // Interaction events with extras

    sealed class Search

    internal open val extras: Map<*, String>?
        get() = null

    /**
     * Events related to growth campaigns.
     */
    sealed class GrowthData(val tokenName: String) : Event() {
        /**
         * Event recording whether Firefox has been set as the default browser.
         */
        object SetAsDefault : GrowthData("xgpcgt")

        /**
         * Event recording that an ad was clicked in a search engine results page.
         */
        object SerpAdClicked : GrowthData("e2x17e")

        /**
         * Event recording the first time Firefox is used 3 days in a row in the first week of install.
         */
        object FirstWeekSeriesActivity : GrowthData("20ay7u")

        /**
         * Event recording that usage time has reached a threshold.
         */
        object UsageThreshold : GrowthData("m66prt")

        /**
         * Event recording the first time Firefox has been resumed in a 24 hour period.
         */
        object FirstAppOpenForDay : GrowthData("41hl22")

        /**
         * Event recording the first time a URI is loaded in Firefox in a 24 hour period.
         */
        object FirstUriLoadForDay : GrowthData("ja86ek")

        /**
         * Event recording when User is "activated" in first week of usage.
         * Activated = if the user is active 3 days in their first week and
         * if they search once in the latter half of that week (days 4-7).
         */
        data class UserActivated(val fromSearch: Boolean) : GrowthData("imgpmr")
    }

    /**
     * Events related to first week, post install data.
     */
    sealed class FirstWeekPostInstall(val tokenName: String) : Event() {
        /**
         * Event recording when user is at least 1 day active on the last 3 days of the first week.
         */
        object LastThreeDaysActivity : FirstWeekPostInstall("89cbkw")

        /**
         * Event recording when **both** of the following are true:
         *
         * - At least 2 days active on the last 3 days of the first week
         * - At least 2 days active on the first 4 days of the first week.
         */
        object RecurrentActivity : FirstWeekPostInstall("yzyixm")

        /**
         * Event recording when **both** of the following are true:
         *
         * - Active on every single day in the first week
         * - Default browser on the first 4 days of the first week.
         */
        object EverydayActivityAndSetToDefault : FirstWeekPostInstall("v0g2bc")
    }
}
