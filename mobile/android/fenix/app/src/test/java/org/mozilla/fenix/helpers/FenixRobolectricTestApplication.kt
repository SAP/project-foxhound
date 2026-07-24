/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.helpers

import io.mockk.mockk
import org.mozilla.fenix.FenixApplication
import org.mozilla.fenix.R
import org.mozilla.fenix.components.Components

/**
 * An override of our application for use in Robolectric-based unit tests. This bypasses standard
 * process initialization of native code (Glean, Nimbus, Gecko, etc) as well mocking `components`
 * which is the primary service repository for our Kotlin code used by Fenix. Unit tests should
 * avoid relying global subsystems being available to them.
 *
 * Note: Robolectric runs on a host machine JVM, so if you want native code your packages must
 *       include binaries for host platform. For example the [glean-native-forUnitTests] package
 *       is used for some unit tests, but we don't provide this in the default Application.
 */
class FenixRobolectricTestApplication : FenixApplication() {

    override fun onCreate() {
        super.onCreate()
        setApplicationTheme()
    }

    override val components = mockk<Components>(relaxed = true)
    override fun initializeFenixProcess() = Unit

    private fun setApplicationTheme() {
        // According to the Robolectric devs, the application context will not have the <application>'s
        // theme but will use the platform's default team so we set our theme here. We change it here
        // rather than the production application because, upon testing, the production code appears
        // appears to be working correctly. Context here:
        // https://github.com/mozilla-mobile/fenix/pull/15646#issuecomment-707345798
        // https://github.com/mozilla-mobile/fenix/pull/15646#issuecomment-709411141
        setTheme(R.style.NormalTheme)
    }
}
