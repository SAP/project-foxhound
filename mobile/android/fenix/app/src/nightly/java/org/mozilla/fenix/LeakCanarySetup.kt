/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix

import android.app.Application
import org.mozilla.fenix.components.Components

/**
 * Nightly (no-op) implementation for LeakCanary.
 *
 * See /debug/.../LeakCanarySetup.kt for debug implementation.
 */
object LeakCanarySetup : LeakCanarySetupInterface {

    /**
     * LeakCanary is disabled by default in nightly.
     */
    override fun setup(application: Application, components: Components) {
        // no-op
    }

    /**
     * LeakCanary is disabled by default in nightly.
     */
    override fun updateState(isEnabled: Boolean, components: Components) {
        // no-op.
    }
}
