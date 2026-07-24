/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.search.toolbar

import android.view.View
import androidx.annotation.VisibleForTesting
import mozilla.components.concept.toolbar.Toolbar
import org.mozilla.fenix.ext.increaseTapArea

/**
 * A Decorator that accepts a [Toolbar.Action] and increases its tap area.
 *
 * This class wraps a [Toolbar.Action] and modifies its behavior by increasing the tap area of
 * the view it's bound to. This is useful for making small UI elements easier to tap.
 *
 * @param action The original [Toolbar.Action] to be decorated.
 * @param tapAreaIncreaser A function that takes a [View] and an [Int] (the amount to increase
 * the tap area by in dps) and applies the tap area increase to the view.
 * By default, this uses the `increaseTapArea` extension function.
 */
class IncreasedTapAreaActionDecorator(
    private val action: Toolbar.Action,
    private val tapAreaIncreaser: (View, Int) -> Unit = { view, tapIncrease ->
        view.increaseTapArea(
            tapIncrease,
        )
    },
) : Toolbar.Action by action {

    override fun bind(view: View) {
        action.bind(view)
        tapAreaIncreaser(view, TAP_INCREASE_DPS)
    }

    companion object {
        @VisibleForTesting
        const val TAP_INCREASE_DPS = 8
    }
}
