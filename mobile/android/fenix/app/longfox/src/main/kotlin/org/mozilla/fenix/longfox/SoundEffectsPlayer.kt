/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.longfox

import android.content.Context
import android.media.MediaPlayer
import androidx.annotation.RawRes

/**
 * Plays sound effects for the game. Each sound plays asynchronously and is cleaned up on completion.
 * @param context used to create [android.media.MediaPlayer] instances
 * @param soundOn when false, all [playSound] calls are no-ops
 */
class SoundEffectsPlayer(private val context: Context, private val soundOn: Boolean) {

    private val activePlayers = mutableSetOf<MediaPlayer>()

    fun playSound(@RawRes soundResId: Int) {
        if (!soundOn) return
        MediaPlayer.create(context, soundResId)?.apply {
            activePlayers.add(this)
            start()
            setOnCompletionListener {
                it.release()
                activePlayers.remove(it)
            }
        }
    }

    fun release() {
        activePlayers.forEach { it.stop(); it.release() }
        activePlayers.clear()
    }
}
