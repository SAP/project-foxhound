/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus

import androidx.preference.PreferenceManager
import leakcanary.AppWatcher
import leakcanary.LeakCanary
import org.mozilla.focus.ext.application

/**
 * Debug-specific implementation of the [FocusApplication] class.
 *
 * This class provides additional functionality for debug builds, such as
 * initializing and managing the LeakCanary memory leak detection library
 * based on user preferences.
 */
class DebugFocusApplication : FocusApplication() {

    override fun setupLeakCanary() {
        if (!AppWatcher.isInstalled) {
            AppWatcher.manualInstall(
                application = application,
                watchersToInstall = AppWatcher.appDefaultWatchers(application),
            )
        }
        val isEnabled = PreferenceManager.getDefaultSharedPreferences(applicationContext)
            .getBoolean(getString(R.string.pref_key_leakcanary), true)
        updateLeakCanaryState(isEnabled)
    }

    override fun updateLeakCanaryState(isEnabled: Boolean) {
        LeakCanary.showLeakDisplayActivityLauncherIcon(isEnabled)
        LeakCanary.config = LeakCanary.config.copy(dumpHeap = isEnabled)
    }
}
