/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.state

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class StoreExceptionTest {
    // This test is in a separate class because it needs to run with Robolectric (different runner, slower) while all
    // other tests only need a Java VM (fast).
    @Test(expected = IllegalStateException::class)
    fun `Exception in reducer will be thrown from store`() {
        val throwingReducer: (TestState, TestAction) -> TestState = { _, _ ->
            throw IllegalStateException("Not reducing today")
        }

        val store = Store(TestState(counter = 23), throwingReducer)

        store.dispatch(TestAction.IncrementAction)

        Assert.fail()
    }
}
