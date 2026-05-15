/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.perf

import android.os.Bundle
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity

/** Tag used to identify the stop dialog fragment and prevent duplicates */
private const val DIALOG_TAG = "StopProfilerDialogTag"

/**
 * An activity that displays a dialog([ProfilerStopDialogFragment]) for stopping the profiler.
 *This activity is launched the profiling notification displayed by [ProfilerService] is tapped.
 *
 * ## Usage:
 * This activity is typically launched via a [PendingIntent] from the profiling
 * notification and should not be started directly by application code.
 */
class StopProfilerActivity : AppCompatActivity() {

    private val profilerViewModel: ProfilerViewModel by viewModels {
        ProfilerViewModelFactory(application)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize ViewModel to bootstrap profiler state for the stop dialog.
        // This activity exists solely to host the dialog when launched from notifications,
        // since Android requires an Activity to show UI from notification clicks and adding the
        // viewModel to HomeActivity would potentially affect startup time.
        profilerViewModel

        if (supportFragmentManager.findFragmentByTag(DIALOG_TAG) == null) {
            ProfilerStopDialogFragment().show(supportFragmentManager, DIALOG_TAG)
        }
    }
}
