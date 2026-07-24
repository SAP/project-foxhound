/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.ui.animation

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.ContentTransform
import androidx.compose.animation.core.FiniteAnimationSpec
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleOut
import androidx.compose.ui.unit.IntOffset
import androidx.navigation3.scene.Scene
import androidx.navigationevent.NavigationEvent

/**
 * Value representing the animation curve's spring stiffness.
 */
private const val ANIMATION_STIFFNESS = 150f

/**
 * An animation spec with spring animation curve.
 */
private val SpringAnimationSpec: FiniteAnimationSpec<IntOffset> = spring(stiffness = ANIMATION_STIFFNESS)

private val EnteringTransitionDirection = AnimatedContentTransitionScope.SlideDirection.Start

private val LeavingTransitionDirection = AnimatedContentTransitionScope.SlideDirection.End

/**
 * Animation spec for transitioning from the Tab Manager's root screen to other tab screens,
 * such as Tab Search.
 *
 * This performs a right-to-left transition when navigating to a new screen.
 */
internal fun <T : Any> defaultTransitionSpec(): AnimatedContentTransitionScope<Scene<T>>.() -> ContentTransform = {
    ContentTransform(
        targetContentEnter = slideIntoContainer(
            towards = EnteringTransitionDirection,
            animationSpec = SpringAnimationSpec,
        ),
        initialContentExit = slideOutOfContainer(
            towards = EnteringTransitionDirection,
            animationSpec = SpringAnimationSpec,
        ),
    )
}

/**
 * Animation spec for transitioning from a screen, such as Tab Search, back to the Tab Manager's
 * root screen via the back button.
 *
 * This performs a left-to-right transition when leaving a screen.
 */
internal fun <T : Any> popTransitionSpec(): AnimatedContentTransitionScope<Scene<T>>.() -> ContentTransform = {
    ContentTransform(
        targetContentEnter = slideIntoContainer(
            towards = LeavingTransitionDirection,
            animationSpec = SpringAnimationSpec,
        ),
        initialContentExit = slideOutOfContainer(
            towards = LeavingTransitionDirection,
            animationSpec = SpringAnimationSpec,
        ),
    )
}

/**
 * Animation spec for transitioning from a screen, such as Tab Search, back to the Tab Manager's
 * root screen via the navigate back gesture.
 *
 * This scales out the the current screen, so the previous screen becomes visible as the user
 * performs the navigation gesture.
 */
internal fun <T : Any> defaultPredictivePopTransitionSpec(): AnimatedContentTransitionScope<Scene<T>>.(
    @NavigationEvent.SwipeEdge Int,
) -> ContentTransform =
    {
        ContentTransform(
            targetContentEnter = fadeIn(initialAlpha = 1f),
            initialContentExit = scaleOut(targetScale = 0.7f),
        )
    }
