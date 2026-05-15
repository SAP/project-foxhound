/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix

import android.app.Application
import android.os.StrictMode
import androidx.preference.PreferenceManager
import leakcanary.AppWatcher
import leakcanary.LeakCanary
import mozilla.components.support.base.log.logger.Logger
import org.mozilla.fenix.components.Components
import org.mozilla.fenix.ext.getPreferenceKey

/**
 * Debug implementation for activating LeakCanary.
 */
object LeakCanarySetup : LeakCanarySetupInterface {
    private val logger = Logger("LeakCanarySetup")

    /**
     * Setup LeakCanary for use.
     *
     * @param application The application to enable LeakCanary on.
     * @param components Components needed to register LeakCanary on.
     */
    override fun setup(application: Application, components: Components) {
        logger.info("LeakCanary is setting up.")
        if (!AppWatcher.isInstalled) {
            AppWatcher.manualInstall(
                application = application,
                watchersToInstall = AppWatcher.appDefaultWatchers(application),
            )
        }

        val isEnabled = components.strictMode.allowViolation(StrictMode::allowThreadDiskReads) {
            PreferenceManager.getDefaultSharedPreferences(application)
                .getBoolean(
                    application.getPreferenceKey(R.string.pref_key_leakcanary),
                    BuildConfig.LEAKCANARY,
                )
        }

        updateState(isEnabled, components)
    }

    /**
     * Update the state of LeakCanary.
     *
     * @param isEnabled Whether or not to show the launcher icon for LeakCanary.
     * @param components Components needed to register LeakCanary on.
     */
    override fun updateState(isEnabled: Boolean, components: Components) {
        logger.info("LeakCanary is updating state.")
        LeakCanary.showLeakDisplayActivityLauncherIcon(isEnabled)
        components.strictMode.allowViolation(StrictMode::allowThreadDiskReads) {
            LeakCanary.config = LeakCanary.config.copy(dumpHeap = isEnabled)
        }
    }
}
