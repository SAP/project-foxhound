/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.util

import android.graphics.Rect
import android.view.View
import androidx.test.espresso.ViewAssertion
import junit.framework.AssertionFailedError
import org.hamcrest.Description
import org.hamcrest.Matcher
import org.hamcrest.TypeSafeMatcher

private const val TOLERANCE = 10

/**
 * Espresso matcher for checking if a view is at a specific position - top or bottom of the screen.
 *
 * @param position The position to check for.
 * @param tolerance Tolerance for avoiding pixel rounding issues or minor layout differences.
 */
class PositionOnScreenMatcher(
    private val position: Position,
    private val tolerance: Int = TOLERANCE,
) : TypeSafeMatcher<View>() {

    enum class Position {
        TOP, BOTTOM,
    }

    private var failureReason: String = ""

    override fun describeTo(description: Description) {
        description.appendText("position ${position.name.lowercase()}")
        if (failureReason.isNotEmpty()) {
            description.appendText("\n[Reason: $failureReason]")
        }
    }

    override fun matchesSafely(view: View): Boolean {
        val screenHeight = view.context.resources.configuration.screenHeightDp
        val screenLocation = IntArray(2)
        view.getLocationOnScreen(screenLocation)
        val viewTopY = screenLocation[1]
        val viewBottomY = viewTopY + view.height

        val rootView = view.rootView
        val visibleDisplayFrame = Rect()
        rootView.getWindowVisibleDisplayFrame(visibleDisplayFrame)

        return when (position) {
            Position.TOP -> {
                val isAtTop = viewTopY <= screenHeight - tolerance

                if (!isAtTop) {
                    failureReason =
                        "${view.resources.getResourceName(view.id)} top ($viewTopY) " +
                                "is not aligned with visible screen top (${visibleDisplayFrame.top}). " +
                                "View bottom: $viewBottomY, View height: ${view.height}. " +
                                "Usable screen height (approx): $screenHeight"
                }

                isAtTop
            }
            Position.BOTTOM -> {
                val isAtBottom = viewBottomY >= visibleDisplayFrame.bottom - tolerance &&
                        viewBottomY <= visibleDisplayFrame.bottom + tolerance

                if (!isAtBottom) {
                    failureReason =
                        "${view.resources.getResourceName(view.id)} bottom ($viewBottomY) " +
                                "is not aligned with visible screen bottom (${visibleDisplayFrame.bottom}). " +
                                "View top: $viewTopY, View height: ${view.height}. " +
                                "Usable screen height (approx): $screenHeight"
                }
                isAtBottom
            }
        }
    }
}

/**
 * [ViewAssertion] for the position of a view on the screen.
 *
 * @param position The position to check for.
 * @param tolerance Tolerance for avoiding pixel rounding issues or minor layout differences. Defaults to 10.
 *
 * @throws AssertionFailedError if there current View is not at the wanted position.
 */
fun isAtPosition(position: PositionOnScreenMatcher.Position, tolerance: Int = TOLERANCE): Matcher<View> {
    return PositionOnScreenMatcher(position, tolerance)
}
