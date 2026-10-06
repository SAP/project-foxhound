/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.perf

/**
 * Represents a single historical process exit event for display purposes.
 *
 * @property date The date of the exit, formatted as "yyyy-MM-dd HH:mm:ss".
 * @property reason The reason for the exit, e.g. "crash_native", "low_memory".
 * @property processType The type of process, e.g. "content", "parent".
 * @property importance The process importance level at time of exit, e.g. "cached", "foreground".
 * @property pssInMb Proportional Set Size memory usage in megabytes.
 * @property rssInMb Resident Set Size memory usage in megabytes.
 */
data class ProcessExitRecord(
    val date: String,
    val reason: String,
    val processType: String,
    val importance: String,
    val pssInMb: Int,
    val rssInMb: Int,
)
