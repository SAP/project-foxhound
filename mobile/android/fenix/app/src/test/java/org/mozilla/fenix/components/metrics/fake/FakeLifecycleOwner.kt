/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.metrics.fake

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleObserver
import androidx.lifecycle.LifecycleOwner

/**
 * Allows tests to insert their own version of a LifecycleOwner
 * and make assertions against it
 */
class FakeLifecycleOwner : LifecycleOwner {
    var state: Lifecycle.State = Lifecycle.State.DESTROYED
    var observers: MutableList<LifecycleObserver> = mutableListOf()

    override val lifecycle: Lifecycle
        get() = object : Lifecycle() {
            override val currentState: State
                get() = state

            override fun addObserver(observer: LifecycleObserver) {
                observers.add(observer)
            }

            override fun removeObserver(observer: LifecycleObserver) {
                observers.remove(observer)
            }
        }
}
