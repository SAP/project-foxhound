/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.toolbar

import mozilla.components.concept.engine.EngineSession
import mozilla.components.concept.toolbar.fake.FakeToolbar
import mozilla.components.feature.session.SessionUseCases
import org.junit.Assert.assertNotNull
import org.junit.Test

class ToolbarInteractorTest {

    @Test
    fun `provide custom use case for loading url`() {
        val loadUrlUseCase = object : SessionUseCases.LoadUrlUseCase {
            override operator fun invoke(
                url: String,
                flags: EngineSession.LoadUrlFlags,
                additionalHeaders: Map<String, String>?,
                originalInput: String?,
            ) {
                // do nothing
            }
        }

        val toolbar = FakeToolbar(url = "")
        val toolbarInteractor = ToolbarInteractor(toolbar, loadUrlUseCase)
        toolbarInteractor.start()

        assertNotNull(toolbar.onUrlCommitListener)
    }
}
