/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.fenix

import android.app.Application
import org.mozilla.fenix.components.Components

/**
 * Interface for setting up and updating LeakCanary.
 */
interface LeakCanarySetupInterface {
    /**
     * Setup LeakCanary for use.
     *
     * @param application The application to enable LeakCanary on.
     * @param components Components needed to register LeakCanary on.
     */
      fun setup(application: Application, components: Components)

    /**
     * Update the state of LeakCanary.
     *
     * @param isEnabled Whether or not to show the launcher icon for LeakCanary.
     * @param components Components needed to register LeakCanary on.
     */
      fun updateState(isEnabled: Boolean, components: Components)
  }
