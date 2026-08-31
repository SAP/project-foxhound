/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.metrics

/**
 * See https://docs.google.com/spreadsheets/d/1wh1trriy7p8hf27-MPJprZ6jR0mSeKKUQfVfEbpxR9s
 * for event descriptions.
 */
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
         * Adjust conversion event 1
         */
        object ConversionEvent1 : GrowthData("xgpcgt")

        /**
         * Adjust conversion event 2
         */
        object ConversionEvent2 : GrowthData("41hl22")

        /**
         * Adjust conversion event 3
         */
        object ConversionEvent3 : GrowthData("ja86ek")

        /**
         * Adjust conversion event 4
         */
        object ConversionEvent4 : GrowthData("20ay7u")

        /**
         * Adjust conversion event 5
         */
        object ConversionEvent5 : GrowthData("e2x17e")

        /**
         * Adjust conversion event 6
         */
        object ConversionEvent6 : GrowthData("m66prt")

        /**
         * Adjust conversion event 7
         */
        data class ConversionEvent7(val fromSearch: Boolean) : GrowthData("imgpmr")
    }

    /**
     * Events related to first week, post install data.
     */
    sealed class FirstWeekPostInstall(val tokenName: String) : Event() {
        /**
         *
         * Adjust conversion event 8
         */
        object ConversionEvent8 : FirstWeekPostInstall("yzyixm")

        /**
         * Adjust conversion event 9
         */
        object ConversionEvent9 : FirstWeekPostInstall("v0g2bc")

        /**
         * Adjust conversion event 10
         */
        object ConversionEvent10 : FirstWeekPostInstall("89cbkw")
    }
}
