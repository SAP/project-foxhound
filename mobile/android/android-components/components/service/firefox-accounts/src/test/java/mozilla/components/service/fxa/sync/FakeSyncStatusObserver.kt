/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxa.sync

import java.lang.Exception

class FakeSyncStatusObserver : SyncStatusObserver {
    sealed class Event {
        object OnStarted : Event()
        object OnIdle : Event()
        data class OnError(val error: Exception?) : Event()
    }

    val events = mutableListOf<Event>()

    override fun onStarted() {
        events.add(Event.OnStarted)
    }

    override fun onIdle() {
        events.add(Event.OnIdle)
    }

    override fun onError(error: Exception?) {
        events.add(Event.OnError(error))
    }
}
