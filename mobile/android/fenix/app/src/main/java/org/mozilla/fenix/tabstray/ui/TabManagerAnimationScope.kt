/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:OptIn(ExperimentalSharedTransitionApi::class)

package org.mozilla.fenix.tabstray.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedContentScope
import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionLayout
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.runtime.CompositionLocal
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Modifier
import org.mozilla.fenix.tabstray.ui.tabstray.TabsTray

/**
 * Wrapper scope for handling the opening animation in the Tab manager.
 *
 * This wraps [SharedTransitionScope] and [AnimatedVisibilityScope] so only one scope property needs to be
 * passed-down the Compose tree.
 */
internal interface TabManagerAnimationScope : SharedTransitionScope, AnimatedVisibilityScope

/**
 * [CompositionLocal] property for accessing the [TabManagerAnimationScope] anywhere within the
 * [TabsTray] Compose tree.
 */
internal val LocalTabManagerAnimationScope = compositionLocalOf<TabManagerAnimationScope?> { null }

/**
 * Default [TabManagerAnimationScope] which wraps all scopes used to perform animations within the Tab Manager.
 *
 * @param sharedTransitionScope [SharedTransitionScope] to share in the [TabsTray] Compose tree.
 * This gives access to [Modifier.sharedElement] provided by the wrapping [SharedTransitionLayout].
 * @param animatedContentScope [AnimatedContentScope] to share in the [TabsTray] Compose tree.
 * This provides the wrapping [AnimatedContent]'s scope, which is a dependency of [Modifier.sharedElement].
 */
internal class TabManagerAnimationScopeImpl(
    sharedTransitionScope: SharedTransitionScope,
    animatedContentScope: AnimatedContentScope,
) : TabManagerAnimationScope,
    SharedTransitionScope by sharedTransitionScope,
    AnimatedVisibilityScope by animatedContentScope
