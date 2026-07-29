/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.remotesettings

import mozilla.components.support.test.mock
import org.junit.Assert.assertSame
import org.junit.Test

class GlobalRemoteSettingsDependencyProviderTest {
    @Test
    fun `GIVEN dependencies are set WHEN asking for them THEN returned the originally set dependencies`() {
        val service: RemoteSettingsService = mock()
        val callback: (List<String>) -> Unit = {}

        GlobalRemoteSettingsDependencyProvider.initialize(service, callback)

        assertSame(service, GlobalRemoteSettingsDependencyProvider.requireRemoteSettingsService())
        assertSame(callback, GlobalRemoteSettingsDependencyProvider.requireRemoteCollectionsUpdatedCallback())
    }
}
